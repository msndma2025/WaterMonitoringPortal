import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { useMapStore } from '../../store/mapStore';
import {
  getHistory,
  seriesTotalMAF,
  seriesToMonthlyMAF,
  HYDRO_STATION_GROUPS,
  HYDRO_DATA_START,
} from '../../services/hydroApi';
import './InflowsCompModal.css';
import './LiveInflowsModal.css';

// Neon palette
const SERIES = [
  { key: 'inflow',  name: 'Inflow',  color: '#00f0ff' },
  { key: 'outflow', name: 'Outflow', color: '#ff2bd6' },
];
const SERIES_BY_KEY = Object.fromEntries(SERIES.map((s) => [s.key, s]));

// RIMS cumulative aggregate — a special "station" that sums the five Rim Stations.
// ("Ganda Singh Wala" is "G.S. Wala" in the API.)
const RIMS_KEY = '__RIMS__';
// `minNeed` = minimum required monthly inflow (MAF) per station — adjust as needed.
const RIMS = [
  { name: 'Kalabagh',  label: 'Kalabagh',          color: '#00f0ff', minNeed: 0.3 },
  { name: 'Mangla',    label: 'Mangla',            color: '#34ff9e', minNeed: 0.3 },
  { name: 'Marala',    label: 'Marala',            color: '#ffd21a', minNeed: 0.3 },
  { name: 'Jassar',    label: 'Jassar',            color: '#b46bff', minNeed: 0.3 },
  { name: 'G.S. Wala', label: 'Ganda Singh Wala',  color: '#ff2bd6', minNeed: 0.3 },
];
const RIMS_SERIES = [
  { key: 'total', name: 'RIMS monthly total', color: '#34ff9e' },
];

// Sum the five stations' monthly-MAF inflow into rows with { x, total, cumulative }.
function buildRimsRows(monthlyPerStation) {
  const monthsSet = new Set();
  monthlyPerStation.forEach((mArr) => mArr.forEach((m) => monthsSet.add(m.month)));
  const months = [...monthsSet].sort();
  const maps = monthlyPerStation.map((mArr) => new Map(mArr.map((m) => [m.month, m.maf])));
  let acc = 0;
  return months.map((month) => {
    let total = 0;
    maps.forEach((map) => { total += map.get(month) || 0; });
    acc += total;
    return { x: month, total, cumulative: acc };
  });
}

// Last N years (historical) options.
const YEAR_RANGES = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  return { id: `${n}y`, label: `Last ${n} year${n > 1 ? 's' : ''}`, build: () => ({ days: Math.round(365.25 * n) }) };
});

// Time ranges. `build` returns params for getHistory(); `custom` is handled separately.
const RANGES = [
  { id: '7d',   label: 'Last 7 days',   build: () => ({ days: 7 }) },
  { id: '30d',  label: 'Last 30 days',  build: () => ({ days: 30 }) },
  { id: '90d',  label: 'Last 90 days',  build: () => ({ days: 90 }) },
  ...YEAR_RANGES,
  { id: 'm26',  label: 'Monsoon 2026',  build: () => ({ startDate: '2026-06-01', endDate: '2026-09-30' }) },
  { id: 'all',  label: 'Full history',  build: () => ({}) },
  { id: 'custom', label: 'Custom range…', custom: true },
];

const CHART_TYPES = [
  { id: 'area',   label: 'Area chart' },
  { id: 'column', label: 'Column chart' },
  { id: 'line',   label: 'Line chart' },
];

const TODAY = new Date().toISOString().slice(0, 10);

// "YYYY-MM" -> "Sep 2026"
const fmtMonth = (x) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(x));
  if (!m) return String(x);
  return new Date(+m[1], +m[2] - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const fmtMAF = (v) => (v == null || isNaN(v) ? '—' : v.toFixed(2));

// Aggregate inflow/outflow into monthly-MAF chart rows keyed by "YYYY-MM".
function mergeMonthly(inflow = [], outflow = []) {
  const byMonth = new Map();
  const put = (arr, key) => {
    seriesToMonthlyMAF(arr).forEach(({ month, maf }) => {
      const row = byMonth.get(month) || { x: month };
      row[key] = maf;
      byMonth.set(month, row);
    });
  };
  put(inflow, 'inflow');
  put(outflow, 'outflow');
  return [...byMonth.values()].sort((a, b) => a.x.localeCompare(b.x));
}

const ChartTooltip = ({ active, payload, label, keys, seriesByKey = SERIES_BY_KEY }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="li-tooltip">
      <div className="li-tooltip-title">{fmtMonth(label)}</div>
      {keys.map((k) => {
        const s = seriesByKey[k];
        const entry = payload.find((p) => p.dataKey === k);
        if (!entry || entry.value == null) return null;
        return (
          <div key={k} className="li-tooltip-row">
            <span className="li-tooltip-dot" style={{ background: s.color }} />
            <span className="li-tooltip-name">{s.name}</span>
            <span className="li-tooltip-val" style={{ color: s.color, textShadow: `0 0 10px ${s.color}` }}>
              {fmtMAF(entry.value)} <em>MAF</em>
            </span>
          </div>
        );
      })}
    </div>
  );
};

// White-pill data label drawn on top of each point / bar (works for area, line & bar).
const makeValueLabel = (color) => (props) => {
  const { x, y, width, value } = props;
  if (value == null || isNaN(value)) return null;
  const isBar = typeof width === 'number';
  const cx = isBar ? x + width / 2 : x;
  const label = Number(value).toFixed(2);
  const fs = 12.5;
  const padX = 6;
  const h = fs + 8;
  const w = label.length * fs * 0.6 + padX * 2;
  const cy = (typeof y === 'number' ? y : 0) - 15;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2} fill="#ffffff" stroke={color} strokeWidth={1.6} />
      <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="central" fill="#0a1220" fontSize={fs} fontWeight={800}>
        {label}
      </text>
    </g>
  );
};

const Chart = ({ data, height, type, keys, series = SERIES, yLabel = 'MAF / MONTH', refLine = null }) => {
  const seriesByKey = Object.fromEntries(series.map((s) => [s.key, s]));
  const refLineEl = refLine ? (
    <ReferenceLine
      y={refLine.y}
      stroke={refLine.color || '#ffffff'}
      strokeWidth={2.5}
      ifOverflow="extendDomain"
      label={{
        value: `${refLine.label} · ${refLine.y} MAF`,
        position: 'insideTopRight',
        fill: refLine.color || '#ffffff',
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: 0.5,
      }}
    />
  ) : null;
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 6" stroke="rgba(120,180,255,0.10)" vertical={false} />
      <XAxis
        dataKey="x"
        tickFormatter={fmtMonth}
        tick={{ fill: '#dbe8ff', fontSize: 15, fontWeight: 800 }}
        tickLine={false}
        tickMargin={12}
        axisLine={{ stroke: 'rgba(120,180,255,0.45)', strokeWidth: 1.5 }}
        minTickGap={40}
        angle={-35}
        textAnchor="end"
        height={84}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fill: '#dbe8ff', fontSize: 15, fontWeight: 800 }}
        tickLine={false}
        tickMargin={8}
        axisLine={{ stroke: 'rgba(120,180,255,0.45)', strokeWidth: 1.5 }}
        width={92}
        tickFormatter={(v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1))}
        label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#9db6e0', fontSize: 14, fontWeight: 900, letterSpacing: 1.5, dx: 6, dy: 42 }}
      />
      <Tooltip content={<ChartTooltip keys={keys} seriesByKey={seriesByKey} />} cursor={{ fill: 'rgba(120,180,255,0.06)' }} />
      {refLineEl}
    </>
  );

  const gradients = (
    <defs>
      {series.map((s) => (
        <linearGradient key={s.key} id={`li-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
          <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
        </linearGradient>
      ))}
    </defs>
  );

  const margin = { top: 36, right: 34, left: 18, bottom: 14 };

  if (type === 'column') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={margin} barGap={2} barCategoryGap="18%">
          {axes}
          {keys.map((k, i) => {
            const s = seriesByKey[k];
            return (
              <Bar
                key={k}
                dataKey={k}
                name={s.name}
                fill={s.color}
                radius={[5, 5, 0, 0]}
                maxBarSize={46}
                className={`li-bar-${k}`}
                animationBegin={i * 160}
                animationDuration={1100}
                animationEasing="ease-out"
              >
                <LabelList dataKey={k} content={makeValueLabel(s.color)} />
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={margin}>
          {axes}
          {keys.map((k, i) => {
            const s = seriesByKey[k];
            return (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={s.name}
                stroke={s.color}
                strokeWidth={4.5}
                dot={false}
                activeDot={{ r: 7, strokeWidth: 0, style: { filter: `drop-shadow(0 0 10px ${s.color})` } }}
                className={`li-curve-${k}`}
                connectNulls
                animationBegin={i * 200}
                animationDuration={1400}
                animationEasing="ease-out"
              >
                <LabelList dataKey={k} content={makeValueLabel(s.color)} />
              </Line>
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        {gradients}
        {axes}
        {keys.map((k, i) => {
          const s = seriesByKey[k];
          return (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              name={s.name}
              stroke={s.color}
              strokeWidth={4.5}
              fill={`url(#li-grad-${k})`}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, style: { filter: `drop-shadow(0 0 8px ${s.color})` } }}
              className={`li-curve-${k}`}
              connectNulls
              animationBegin={i * 200}
              animationDuration={1300}
              animationEasing="ease-out"
            >
              <LabelList dataKey={k} content={makeValueLabel(s.color)} />
            </Area>
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
};

/* Stagger container for the "cool" entrance animations */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const popIn = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

const LiveInflowsModal = () => {
  const { showLiveInflowsModal, setShowLiveInflowsModal } = useMapStore();
  const [station, setStation] = useState('Kotri');
  const [rangeId, setRangeId] = useState('1y');
  const [customStart, setCustomStart] = useState('2026-06-01');
  const [customEnd, setCustomEnd] = useState(TODAY);
  const [filter, setFilter] = useState('both');
  const [chartType, setChartType] = useState('area');
  const [rimsSelected, setRimsSelected] = useState(() => new Set(RIMS.map((r) => r.name))); // all by default
  const [resp, setResp] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [error, setError] = useState('');
  const [isMaximized, setIsMaximized] = useState(true); // open full-width by default
  const dragControls = useDragControls();

  const isCustom = rangeId === 'custom';
  const isRims = station === RIMS_KEY;
  const series = isRims ? RIMS_SERIES : SERIES;
  const seriesByKey = useMemo(() => Object.fromEntries(series.map((s) => [s.key, s])), [isRims]); // eslint-disable-line react-hooks/exhaustive-deps
  const filterOptions = useMemo(() => ([
    { id: 'both', label: 'Both' },
    ...series.map((s) => ({ id: s.key, label: s.name })),
  ]), [isRims]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the series filter whenever we switch between river / RIMS mode (keys differ).
  useEffect(() => { setFilter('both'); }, [isRims]);

  // Resolve the getHistory params for the current selection (null = incomplete custom range).
  const buildParams = useCallback(() => {
    if (isCustom) {
      if (!customStart || !customEnd) return null;
      return { startDate: customStart, endDate: customEnd };
    }
    const r = RANGES.find((x) => x.id === rangeId) || RANGES[0];
    return r.build();
  }, [isCustom, rangeId, customStart, customEnd]);

  const load = useCallback(() => {
    const params = buildParams();
    if (!params) { setStatus('idle'); return; }
    setStatus('loading');
    setError('');

    // RIMS aggregate: fetch all five Rim Stations once; the selected subset is
    // summed client-side so toggling stations doesn't re-hit the API.
    if (station === RIMS_KEY) {
      Promise.all(RIMS.map((r) => getHistory({ name: r.name, ...params })))
        .then((list) => {
          const bad = list.find((d) => d && d.success === false);
          if (bad) throw new Error(bad.error || 'Request failed');
          const rimsMonthly = {};
          RIMS.forEach((r, idx) => { rimsMonthly[r.name] = seriesToMonthlyMAF(list[idx]?.inflow || []); });
          setResp({ rimsMonthly, start_date: list[0]?.start_date, end_date: list[0]?.end_date });
          setStatus('ok');
        })
        .catch((e) => {
          setError(e.message || 'Failed to load RIMS data');
          setStatus('error');
        });
      return;
    }

    getHistory({ name: station, ...params })
      .then((data) => {
        if (data && data.success === false) throw new Error(data.error || 'Request failed');
        setResp(data);
        setStatus('ok');
      })
      .catch((e) => {
        setError(e.message || 'Failed to load data');
        setStatus('error');
      });
  }, [station, buildParams]);

  useEffect(() => {
    if (!showLiveInflowsModal) return;
    load();
  }, [showLiveInflowsModal, load]);

  // Always (re)open full-width.
  useEffect(() => {
    if (showLiveInflowsModal) setIsMaximized(true);
  }, [showLiveInflowsModal]);

  useEffect(() => {
    if (!isMaximized) return;
    const handler = (e) => { if (e.key === 'Escape') setIsMaximized(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMaximized]);

  const chartData = useMemo(() => {
    if (isRims) {
      const arrs = RIMS.filter((r) => rimsSelected.has(r.name)).map((r) => resp?.rimsMonthly?.[r.name] || []);
      return buildRimsRows(arrs);
    }
    return mergeMonthly(resp?.inflow, resp?.outflow);
  }, [isRims, resp, rimsSelected]);
  const hasData = status === 'ok' && chartData.length > 0;

  // Combined minimum need (MAF) of the currently selected RIMS stations.
  const rimsMinNeed = useMemo(
    () => RIMS.filter((r) => rimsSelected.has(r.name)).reduce((s, r) => s + (r.minNeed || 0), 0),
    [rimsSelected],
  );

  const visibleKeys = useMemo(
    () => (filter === 'both' ? series.map((s) => s.key) : [filter]),
    [filter, isRims], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const totals = useMemo(() => {
    if (isRims) {
      const rows = chartData;
      const total = rows.length ? rows[rows.length - 1].cumulative : 0;
      let peak = null;
      rows.forEach((r) => { if (!peak || r.total > peak.total) peak = r; });
      return {
        isRims: true,
        total,
        peakMonth: peak ? fmtMonth(peak.x) : '—',
        peakVal: peak ? peak.total : 0,
        months: rows.length,
      };
    }
    return {
      isRims: false,
      inflowMAF: seriesTotalMAF(resp?.inflow),
      outflowMAF: seriesTotalMAF(resp?.outflow),
      months: chartData.length,
    };
  }, [isRims, resp, chartData]);

  const close = () => { setShowLiveInflowsModal(false); setIsMaximized(false); };

  const controls = (
    <motion.div className="li-controls" variants={popIn}>
      <label className="li-field">
        <span className="li-field-label">Station</span>
        <select className="li-select" value={station} onChange={(e) => setStation(e.target.value)} disabled={isRims}>
          {isRims && <option value={RIMS_KEY}>RIMS (5 stations)</option>}
          {HYDRO_STATION_GROUPS.map((g) => (
            <optgroup key={g.river} label={`${g.river} River`}>
              {g.stations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <label className="li-field">
        <span className="li-field-label">Aggregate</span>
        <button
          type="button"
          className={`li-rims-btn${isRims ? ' active' : ''}`}
          onClick={() => setStation(isRims ? 'Kotri' : RIMS_KEY)}
          title="Kalabagh + Mangla + Marala + Jassar + Ganda Singh Wala"
        >
          <i className="fas fa-layer-group" /> RIMS Stations
        </button>
      </label>

      <label className="li-field">
        <span className="li-field-label">Range</span>
        <select className="li-select" value={rangeId} onChange={(e) => setRangeId(e.target.value)}>
          {RANGES.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </label>

      {isCustom && (
        <>
          <label className="li-field">
            <span className="li-field-label">From</span>
            <input
              type="date"
              className="li-select li-date"
              value={customStart}
              min={HYDRO_DATA_START}
              max={customEnd || TODAY}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </label>
          <label className="li-field">
            <span className="li-field-label">To</span>
            <input
              type="date"
              className="li-select li-date"
              value={customEnd}
              min={customStart || HYDRO_DATA_START}
              max={TODAY}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </label>
        </>
      )}

      <label className="li-field">
        <span className="li-field-label">Chart type</span>
        <select className="li-select li-select-type" value={chartType} onChange={(e) => setChartType(e.target.value)}>
          {CHART_TYPES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>

      <button className="li-refresh" onClick={load} disabled={status === 'loading'} title="Refresh">
        <i className={`fas fa-rotate-right${status === 'loading' ? ' li-spin' : ''}`} />
      </button>
    </motion.div>
  );

  const switches = (
    <motion.div className="li-switches" variants={popIn}>
      <div className="li-seg" role="group" aria-label="Series filter">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            className={`li-seg-btn${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.id !== 'both' && seriesByKey[f.id] && (
              <span className="li-seg-dot" style={{ background: seriesByKey[f.id].color, boxShadow: `0 0 8px ${seriesByKey[f.id].color}` }} />
            )}
            {f.label}
          </button>
        ))}
      </div>
    </motion.div>
  );

  const toggleRims = (name) => setRimsSelected((prev) => {
    const next = new Set(prev);
    if (next.has(name)) { if (next.size > 1) next.delete(name); } // keep at least one
    else next.add(name);
    return next;
  });

  const rimsChips = (
    <motion.div className="li-switches" variants={popIn}>
      <div className="li-rims-chips" role="group" aria-label="RIMS stations">
        <span className="li-rims-chips-label">Stations:</span>
        {RIMS.map((r) => {
          const on = rimsSelected.has(r.name);
          return (
            <button
              key={r.name}
              type="button"
              className={`li-rims-chip-btn${on ? ' on' : ''}`}
              style={on ? { borderColor: r.color, color: r.color, boxShadow: `0 0 10px ${r.color}44` } : undefined}
              onClick={() => toggleRims(r.name)}
              title={on ? `Remove ${r.label}` : `Add ${r.label}`}
            >
              <span className="li-rims-cdot" style={{ background: on ? r.color : 'transparent', borderColor: r.color }} />
              {r.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  const summary = hasData && (
    <motion.div className="li-summary" variants={popIn}>
      {totals.isRims ? (
        <>
          <div className="li-stat">
            <span className="li-stat-label">Total RIMS inflow</span>
            <span className="li-stat-val" style={{ color: RIMS_SERIES[0].color, textShadow: `0 0 12px ${RIMS_SERIES[0].color}` }}>
              {totals.total.toFixed(2)} MAF
            </span>
          </div>
          <div className="li-stat">
            <span className="li-stat-label">Peak month</span>
            <span className="li-stat-val" style={{ color: '#00f0ff', textShadow: '0 0 12px #00f0ff' }}>
              {totals.peakVal.toFixed(2)}<span className="li-stat-sub"> · {totals.peakMonth}</span>
            </span>
          </div>
        </>
      ) : (
        <>
          {(filter === 'both' || filter === 'inflow') && (
            <div className="li-stat">
              <span className="li-stat-label">Total inflow</span>
              <span className="li-stat-val" style={{ color: SERIES[0].color, textShadow: `0 0 12px ${SERIES[0].color}` }}>
                {totals.inflowMAF.toFixed(2)} MAF
              </span>
            </div>
          )}
          {(filter === 'both' || filter === 'outflow') && (
            <div className="li-stat">
              <span className="li-stat-label">Total outflow</span>
              <span className="li-stat-val" style={{ color: SERIES[1].color, textShadow: `0 0 12px ${SERIES[1].color}` }}>
                {totals.outflowMAF.toFixed(2)} MAF
              </span>
            </div>
          )}
        </>
      )}
      <div className="li-stat">
        <span className="li-stat-label">Months</span>
        <span className="li-stat-val">{totals.months}</span>
      </div>
    </motion.div>
  );

  const body = ({ fill = false, height = 380 } = {}) => {
    const chartHeight = fill ? '100%' : height;
    return (
    <motion.div className="li-body" variants={stagger} initial="hidden" animate="show">
      <motion.div className="li-subtitle" variants={popIn}>
        {isRims
          ? `RIMS monthly inflow — ${RIMS.filter((r) => rimsSelected.has(r.name)).map((r) => r.label).join(' + ')}`
          : `Live river gauge — ${station}`}
        {hasData && resp?.start_date && resp?.end_date ? ` · ${resp.start_date} → ${resp.end_date}` : ''}
      </motion.div>
      {controls}
      {isRims ? rimsChips : switches}
      {summary}
      <motion.div className="li-chart-wrap" style={fill ? undefined : { height }} variants={popIn}>
        {status === 'loading' && (
          <div className="li-state"><i className="fas fa-spinner li-spin" /> Loading gauge data…</div>
        )}
        {status === 'idle' && isCustom && (
          <div className="li-state"><i className="fas fa-calendar-days" /> Pick a start and end date.</div>
        )}
        {status === 'error' && (
          <div className="li-state li-state-error">
            <i className="fas fa-triangle-exclamation" /> {error}
            <button className="li-retry" onClick={load}>Retry</button>
          </div>
        )}
        {status === 'ok' && chartData.length === 0 && (
          <div className="li-state"><i className="fas fa-wave-square" /> No data for this selection.</div>
        )}
        <AnimatePresence mode="wait">
          {hasData && (
            <motion.div
              key={`${chartType}-${filter}-${isRims}`}
              className="li-chart-inner"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Chart
                data={chartData}
                height={chartHeight}
                type={chartType}
                keys={visibleKeys}
                series={series}
                yLabel="MAF / MONTH"
                refLine={
                  isRims
                    ? (rimsMinNeed > 0 ? { y: +rimsMinNeed.toFixed(2), label: 'Minimum need' } : null)
                    : (station === 'Kotri' ? { y: 0.3, label: 'Minimum need' } : null)
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
    );
  };

  const header = (maximized) => (
    <div
      className="ic-header li-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="ic-title li-title">Live River Inflows &amp; Outflows</span>
      <div className="ic-header-btns">
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ic-icon-btn" onClick={close}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showLiveInflowsModal && !isMaximized && (
            <motion.div
              className="ic-modal li-modal"
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {header(false)}
              {body({ height: 380 })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showLiveInflowsModal && isMaximized && (
            <motion.div
              className="ic-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="ic-fullscreen-inner li-fullscreen-inner"
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {header(true)}
                {body({ fill: true })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default LiveInflowsModal;
