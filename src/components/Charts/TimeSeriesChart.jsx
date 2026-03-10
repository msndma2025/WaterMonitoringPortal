import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label as RLabel,
} from 'recharts';
import './TimeSeriesChart.css';

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */
const fmtValue = (v, compact) => {
  if (v == null) return '—';
  if (Math.abs(v) >= 10000) return `${(v / 1000).toFixed(1)}k`;
  if (Math.abs(v) >= 1000 && compact) return `${(v / 1000).toFixed(1)}k`;
  return v % 1 === 0 ? v.toLocaleString() : v.toFixed(1);
};

/* ═══════════════════════════════════════════════════════
   Custom Tooltip — glass card, always shows real values
   ═══════════════════════════════════════════════════════ */
const CustomTooltip = ({ active, payload, label, seriesMeta }) => {
  if (!active || !payload?.length || !seriesMeta) return null;

  /* The full data-point object (contains both real and _norm values) */
  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  const seen = new Set();
  const rows = [];

  payload.forEach((entry) => {
    const key = String(entry.dataKey);

    /* Extract base series id from any suffix */
    let baseId;
    if (key.endsWith('_ph')) baseId = key.slice(0, -3);
    else baseId = key;

    if (seen.has(baseId)) return;
    const meta = seriesMeta[baseId];
    if (!meta) return;
    seen.add(baseId);

    /* Look up the REAL value from the data point (not the _norm one) */
    const realVal = dataPoint[baseId];
    const hasReal = typeof realVal === 'number' && !isNaN(realVal);
    const isPlaceholder = key.endsWith('_ph') && !hasReal;

    rows.push({
      color: meta.color,
      name: meta.name,
      value: hasReal ? realVal : null,
      isNA: isPlaceholder,
    });
  });

  if (rows.length === 0) return null;

  return (
    <div className="ts-tooltip">
      <div className="ts-tooltip-year">{label}</div>
      <div className="ts-tooltip-divider" />
      {rows.map((r, i) => (
        <div key={i} className="ts-tooltip-row">
          <span className="ts-tooltip-dot" style={{ background: r.color }} />
          <span className="ts-tooltip-name">{r.name}</span>
          <span
            className={`ts-tooltip-val ${r.isNA ? 'na' : ''}`}
            style={{ color: r.isNA ? '#475569' : r.color }}
          >
            {r.isNA ? 'N/A' : fmtValue(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Active Dot — glow pulse
   ═══════════════════════════════════════════════════════ */
const GlowDot = ({ cx, cy, stroke }) => {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill={stroke} opacity={0.15}>
        <animate attributeName="r" values="9;13;9" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={5} fill="#0f1117" stroke={stroke} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={2} fill={stroke} />
    </g>
  );
};

/* ═══════════════════════════════════════════════════════
   DataPointDot — shows real value labels in maximized mode
   ═══════════════════════════════════════════════════════ */
const DataPointDot = ({ cx, cy, payload, dataKey, stroke, seriesStats, totalPoints }) => {
  if (cx == null || cy == null || !payload) return null;
  /* Extract base series id */
  const baseId = dataKey;
  const realVal = payload[baseId];
  if (realVal == null || isNaN(realVal)) return null;

  /* Only show every Nth label to prevent overlap */
  const yearIdx = payload._idx;
  const step = totalPoints > 40 ? 5 : totalPoints > 20 ? 3 : 2;
  if (yearIdx != null && yearIdx % step !== 0) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={stroke} />
      <text
        x={cx}
        y={cy - 16}
        textAnchor="middle"
        fill={stroke}
        fontSize={17}
        fontWeight={700}
        style={{ textShadow: '0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.85)' }}
      >
        {fmtValue(realVal, true)}
      </text>
    </g>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */
const TimeSeriesChart = ({
  data,
  title = 'Water Resources Time Series Analysis',
  subtitle = '1970 – 2050 Multi-Scenario Analysis',
  onTabChange,
  activeTab,
}) => {
  /* Initialize hiddenSeries from defaultHidden flags on series */
  const defaultHiddenSet = useMemo(() => {
    if (!data?.series) return new Set();
    return new Set(data.series.filter((s) => s.defaultHidden).map((s) => s.id));
  }, [data]);

  const [hiddenSeries, setHiddenSeries] = useState(defaultHiddenSet);
  const [isAllMode, setIsAllMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Close maximized on Escape */
  useEffect(() => {
    if (!isMaximized) return;
    const handler = (e) => { if (e.key === 'Escape') setIsMaximized(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMaximized]);

  /* Reset when data/tab changes — restore default hidden */
  useEffect(() => {
    setHiddenSeries(defaultHiddenSet);
    setIsAllMode(true);
  }, [activeTab, defaultHiddenSet]);

  /* ── Compute per-series min/max (kept for reference) ── */
  const seriesStats = useMemo(() => {
    if (!data?.series) return {};
    const stats = {};
    data.series.forEach((s) => {
      let min = Infinity, max = -Infinity;
      s.data.forEach((v) => {
        if (v != null && !isNaN(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      });
      const range = max - min || 1;
      stats[s.id] = { min, max, range };
    });
    return stats;
  }, [data]);

  /* ── Leading-null detection for partial series ── */
  const placeholderMap = useMemo(() => {
    if (!data?.series) return {};
    const map = {};
    data.series.forEach((s) => {
      const firstIdx = s.data.findIndex((v) => v != null && !isNaN(v));
      if (firstIdx > 0) {
        map[s.id] = { firstIdx, firstVal: s.data[firstIdx] };
      }
    });
    return map;
  }, [data, seriesStats]);

  /* ── Build chart data with real values ── */
  const chartData = useMemo(() => {
    if (!data?.years || !data?.series) return [];
    return data.years.map((year, i) => {
      const pt = { year, _idx: i };
      data.series.forEach((s) => {
        const v = s.data[i];
        if (v != null && !isNaN(v)) {
          pt[s.id] = v;
        }
        const ph = placeholderMap[s.id];
        if (ph && i <= ph.firstIdx) {
          pt[`${s.id}_ph`] = ph.firstVal;
        }
      });
      return pt;
    });
  }, [data, placeholderMap]);

  /* ── Series metadata lookup for tooltip ── */
  const seriesMeta = useMemo(() => {
    if (!data?.series) return {};
    const m = {};
    data.series.forEach((s) => {
      m[s.id] = { name: s.name, color: s.color };
    });
    return m;
  }, [data]);

  const visibleSeries = useMemo(
    () => (data?.series || []).filter((s) => !hiddenSeries.has(s.id)),
    [data, hiddenSeries],
  );

  const visiblePlaceholders = useMemo(
    () => visibleSeries.filter((s) => placeholderMap[s.id]),
    [visibleSeries, placeholderMap],
  );

  /* ── Legend toggle ── */
  const toggleSeries = useCallback((id) => {
    if (isAllMode) {
      const hide = new Set((data?.series || []).map((s) => s.id));
      hide.delete(id);
      setHiddenSeries(hide);
      setIsAllMode(false);
    } else {
      setHiddenSeries((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  }, [isAllMode, data]);

  const resetSeries = useCallback(() => {
    setHiddenSeries(defaultHiddenSet);
    setIsAllMode(true);
  }, [defaultHiddenSet]);

  if (!data) return null;

  /* ── Custom tooltip with seriesMeta closure ── */
  const renderTooltip = (props) => <CustomTooltip {...props} seriesMeta={seriesMeta} />;
  const totalPoints = chartData.length;

  /* ═══ Shared chart renderer (used inline + in fullscreen portal) ═══ */
  const renderChartBody = (maximized) => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={maximized ? { top: 24, right: 30, bottom: 10, left: 0 } : { top: 8, right: 16, bottom: 4, left: -10 }}>
        <defs>
          {data.series.map((s) => (
            <linearGradient key={s.id} id={`grad-${s.id}${maximized ? '-max' : ''}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={maximized ? 0.15 : 0.2} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid
          strokeDasharray="3 6"
          stroke="rgba(255,255,255,0.035)"
          vertical={false}
        />

        {[25, 50, 75].map((v) => (
          <ReferenceLine
            key={v}
            y={v}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2 4"
          />
        ))}

        <XAxis
          dataKey="year"
          tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: maximized ? 15 : 14, fontWeight: 600 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
          interval={maximized ? 0 : 'preserveStartEnd'}
          minTickGap={maximized ? 40 : 55}
          angle={maximized ? -45 : 0}
          textAnchor={maximized ? 'end' : 'middle'}
          height={maximized ? 55 : undefined}
        />

        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: maximized ? 14 : 13, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v) => fmtValue(v, true)}
        />

        <Tooltip
          content={renderTooltip}
          cursor={{ stroke: 'rgba(139,92,246,0.2)', strokeDasharray: '4 4' }}
        />

        {/* Placeholder dashed for partial series */}
        {visiblePlaceholders.map((s) => (
          <Line
            key={`ph-${s.id}`}
            type="monotone"
            dataKey={`${s.id}_ph`}
            name={`${s.name} (projected)`}
            stroke={s.color}
            strokeWidth={1.2}
            strokeDasharray="5 5"
            strokeOpacity={0.3}
            dot={false}
            activeDot={false}
            animationDuration={1000}
            connectNulls={false}
            isAnimationActive={true}
            legendType="none"
          />
        ))}

        {/* Gradient fills */}
        {visibleSeries.map((s, i) => (
          <Area
            key={`a-${s.id}`}
            type="monotone"
            dataKey={s.id}
            fill={`url(#grad-${s.id}${maximized ? '-max' : ''})`}
            stroke="none"
            animationDuration={1400}
            animationBegin={i * 120}
            animationEasing="ease-out"
            connectNulls={false}
            isAnimationActive={true}
          />
        ))}

        {/* Visible lines */}
        {visibleSeries.map((s, i) => (
          <Line
            key={`l-${s.id}`}
            type="monotone"
            dataKey={s.id}
            name={s.name}
            stroke={s.color}
            strokeWidth={maximized ? 2.5 : 2.2}
            dot={maximized
              ? (props) => <DataPointDot {...props} seriesStats={seriesStats} totalPoints={totalPoints} />
              : false
            }
            activeDot={maximized ? false : <GlowDot />}
            animationDuration={1400}
            animationBegin={i * 120}
            animationEasing="ease-out"
            connectNulls={false}
            isAnimationActive={true}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* ═══ Fullscreen overlay (portal) ═══ */
  const fullscreenOverlay = isMaximized
    ? createPortal(
        <motion.div
          className="ts-fullscreen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="ts-fullscreen-inner">
            {/* Fullscreen header */}
            <div className="ts-fullscreen-header">
              <div className="ts-tabs">
                {[
                  { key: 'rcp', icon: 'fa-chart-line', label: 'RCP Scenarios' },
                  { key: 'projection', icon: 'fa-water', label: 'Water Projection' },
                ].map((t) => (
                  <button
                    key={t.key}
                    className={`ts-tab ${activeTab === t.key ? 'active' : ''}`}
                    onClick={() => onTabChange?.(t.key)}
                  >
                    <i className={`fas ${t.icon}`} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="ts-title-area">
                <h3 className="ts-title">{title}</h3>
                <span className="ts-subtitle">{subtitle} · Showing real values per data point</span>
              </div>

              <div className="ts-actions">
                <motion.button
                  className="ts-maximize-btn active"
                  onClick={() => setIsMaximized(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Exit fullscreen"
                >
                  <i className="fas fa-compress" />
                </motion.button>
                <AnimatePresence>
                  {!isAllMode && (
                    <motion.button
                      className="ts-reset"
                      onClick={resetSeries}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      <i className="fas fa-redo-alt" />
                      Show All
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Fullscreen legend */}
            <div className="ts-legend">
              {data.series.map((s, i) => {
                const active = !hiddenSeries.has(s.id);
                return (
                  <motion.button
                    key={s.id}
                    className={`ts-pill ${active ? 'on' : ''}`}
                    onClick={() => toggleSeries(s.id)}
                    style={{ '--c': s.color }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="ts-pill-line" style={{ background: active ? s.color : '#475569' }} />
                    <span className="ts-pill-label">{s.name}</span>
                    {active && seriesStats[s.id] && (
                      <span className="ts-pill-range" style={{ color: s.color }}>
                        {fmtValue(seriesStats[s.id].min, true)} – {fmtValue(seriesStats[s.id].max, true)}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Fullscreen chart */}
            <div className="ts-fullscreen-chart">
              {renderChartBody(true)}
            </div>
          </div>
        </motion.div>,
        document.body,
      )
    : null;

  return (
    <motion.div
      className="ts-chart-container"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ══════════ Header ══════════ */}
      <div className="ts-header">
        <div className="ts-tabs">
          {[
            { key: 'rcp', icon: 'fa-chart-line', label: 'RCP Scenarios' },
            { key: 'projection', icon: 'fa-water', label: 'Water Projection' },
          ].map((t) => (
            <button
              key={t.key}
              className={`ts-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => onTabChange?.(t.key)}
            >
              <i className={`fas ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="ts-title-area">
          <h3 className="ts-title">{title}</h3>
          <span className="ts-subtitle">{subtitle}</span>
        </div>

        <div className="ts-actions">
          <motion.button
            className="ts-maximize-btn"
            onClick={() => setIsMaximized(!isMaximized)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={isMaximized ? 'Exit fullscreen' : 'Maximize chart'}
          >
            <i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'}`} />
          </motion.button>
          <AnimatePresence>
            {!isAllMode && (
              <motion.button
                className="ts-reset"
                onClick={resetSeries}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <i className="fas fa-redo-alt" />
                Show All
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════ Legend Pills ══════════ */}
      <div className="ts-legend">
        {data.series.map((s, i) => {
          const active = !hiddenSeries.has(s.id);
          return (
            <motion.button
              key={s.id}
              className={`ts-pill ${active ? 'on' : ''}`}
              onClick={() => toggleSeries(s.id)}
              style={{ '--c': s.color }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="ts-pill-line" style={{ background: active ? s.color : '#475569' }} />
              <span className="ts-pill-label">{s.name}</span>
              {active && seriesStats[s.id] && (
                <span className="ts-pill-range" style={{ color: s.color }}>
                  {fmtValue(seriesStats[s.id].min, true)} – {fmtValue(seriesStats[s.id].max, true)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>



      {/* ══════════ Chart Area ══════════ */}
      <motion.div
        className="ts-chart-area"
        initial={{ opacity: 0 }}
        animate={{ opacity: mounted ? 1 : 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {renderChartBody(false)}
      </motion.div>

      {fullscreenOverlay}
    </motion.div>
  );
};

export default TimeSeriesChart;
