import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';
import { useMapStore } from '../../store/mapStore';
import './InflowsCompModal.css';
import './DamLevelsModal.css';

const SERIES = [
  { key: 'tarbela',  name: 'Tarbela',  color: '#38bdf8' },
  { key: 'mangla',   name: 'Mangla',   color: '#34d399' },
  { key: 'combined', name: 'Combined', color: '#fbbf24' },
];

// Rows are keyed "Apr-15" (MonAbbr-YY) → calendar year (2000 + YY).
const yearOf = (row) => 2000 + parseInt(String(row.month).split('-')[1], 10);

// Parse the CSV directly — it has a multi-line quoted header, so we only
// keep rows shaped like "Apr-15,<num>,<num>,<num>".
function parseDamLevels(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^[A-Za-z]{3}-\d{2},/.test(l))
    .map((l) => {
      const [month, tarbela, mangla, combined] = l.split(',');
      return {
        month,
        tarbela: parseFloat(tarbela),
        mangla: parseFloat(mangla),
        combined: parseFloat(combined),
      };
    });
}

const ChartTooltip = ({ active, payload, label, visible }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dl-tooltip">
      <div className="dl-tooltip-title">{label}</div>
      {SERIES.filter((s) => visible[s.key]).map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key);
        if (!entry) return null;
        return (
          <div key={s.key} className="dl-tooltip-row">
            <span className="dl-tooltip-dot" style={{ background: s.color }} />
            <span className="dl-tooltip-name">{s.name}</span>
            <span className="dl-tooltip-val" style={{ color: s.color }}>
              {Number(entry.value).toFixed(2)} MAF
            </span>
          </div>
        );
      })}
    </div>
  );
};

const YearSelect = ({ year, years, onChange }) => (
  <label className="dl-range">
    <span className="dl-range-label">Year</span>
    <select className="dl-range-select" value={year ?? ''} onChange={(e) => onChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
      {years.map((y) => (
        <option key={y} value={y}>{`Jan – Dec ${y}`}</option>
      ))}
      <option value="all">All years (Apr 2015 – Mar 2025)</option>
    </select>
  </label>
);

const SeriesToggles = ({ visible, onToggle }) => (
  <div className="dl-toggles">
    {SERIES.map((s) => {
      const active = visible[s.key];
      return (
        <button
          key={s.key}
          type="button"
          className={`dl-chip${active ? '' : ' dl-chip-off'}`}
          onClick={() => onToggle(s.key)}
          style={active ? { borderColor: s.color, color: s.color } : undefined}
          title={active ? `Hide ${s.name}` : `Show ${s.name}`}
        >
          <span className="dl-chip-dot" style={{ background: active ? s.color : 'transparent', borderColor: s.color }} />
          {s.name}
        </button>
      );
    })}
  </div>
);

// White-pill data label drawn on top of each point.
const makeValueLabel = (color) => (props) => {
  const { x, y, value } = props;
  if (value == null || isNaN(value)) return null;
  const label = Number(value).toFixed(2);
  const fs = 12.5;
  const padX = 6;
  const h = fs + 8;
  const w = label.length * fs * 0.6 + padX * 2;
  const cx = x;
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

const Chart = ({ data, height, visible }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 36, right: 34, left: 18, bottom: 14 }}>
      <defs>
        {SERIES.map((s) => (
          <linearGradient key={s.key} id={`dl-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
      <XAxis
        dataKey="month"
        tick={{ fill: '#dbe8ff', fontSize: 15, fontWeight: 800 }}
        tickLine={false}
        tickMargin={12}
        axisLine={{ stroke: 'rgba(120,180,255,0.45)', strokeWidth: 1.5 }}
        interval="preserveStartEnd"
        minTickGap={40}
        angle={-35}
        textAnchor="end"
        height={84}
      />
      <YAxis
        tick={{ fill: '#dbe8ff', fontSize: 15, fontWeight: 800 }}
        tickLine={false}
        tickMargin={8}
        axisLine={{ stroke: 'rgba(120,180,255,0.45)', strokeWidth: 1.5 }}
        width={92}
        label={{ value: 'MAF', angle: -90, position: 'insideLeft', fill: '#9db6e0', fontSize: 14, fontWeight: 900, letterSpacing: 1.5, dx: 6, dy: 20 }}
      />
      <Tooltip content={<ChartTooltip visible={visible} />} />
      {SERIES.filter((s) => visible[s.key]).map((s) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.name}
          stroke={s.color}
          strokeWidth={4.5}
          fill={`url(#dl-grad-${s.key})`}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0, style: { filter: `drop-shadow(0 0 8px ${s.color})` } }}
          animationDuration={900}
        >
          <LabelList dataKey={s.key} content={makeValueLabel(s.color)} />
        </Area>
      ))}
    </AreaChart>
  </ResponsiveContainer>
);

const DamLevelsModal = () => {
  const { layerVisibility } = useMapStore();
  const on = layerVisibility.damLevels;
  const [data, setData] = useState([]);
  const [isMaximized, setIsMaximized] = useState(true); // open full-width by default
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState({ tarbela: true, mangla: true, combined: true });
  const [year, setYear] = useState(null); // selected calendar year (set once data loads)
  const dragControls = useDragControls();

  const toggleSeries = (key) =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  // Distinct calendar years present in the data, ascending.
  const years = useMemo(() => [...new Set(data.map(yearOf))].sort((a, b) => a - b), [data]);

  // Default to the most recent complete (12-month) year, else the latest year.
  useEffect(() => {
    if (!years.length) return;
    setYear((prev) => {
      if (prev != null && (prev === 'all' || years.includes(prev))) return prev;
      const complete = years.filter((y) => data.filter((r) => yearOf(r) === y).length >= 12);
      return complete.length ? complete[complete.length - 1] : years[years.length - 1];
    });
  }, [years, data]);

  const chartData = useMemo(
    () => (year == null || year === 'all' ? data : data.filter((r) => yearOf(r) === year)),
    [data, year],
  );

  useEffect(() => {
    fetch('/Dam_Levels_Monthly_Averages.csv')
      .then((r) => r.text())
      .then((t) => setData(parseDamLevels(t)))
      .catch((e) => console.warn('Could not load Dam Levels CSV:', e.message));
  }, []);

  useEffect(() => {
    if (on) { setDismissed(false); setIsMaximized(true); }
  }, [on]);

  useEffect(() => {
    if (!isMaximized) return;
    const handler = (e) => { if (e.key === 'Escape') setIsMaximized(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMaximized]);

  const open = on && !dismissed;

  const header = (maximized) => (
    <div
      className="ic-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="ic-title">Dam Storage Levels · Apr 2015 – Mar 2025</span>
      <div className="ic-header-btns">
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ic-icon-btn" onClick={() => { setDismissed(true); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {open && !isMaximized && (
            <motion.div
              className="ic-modal dl-modal"
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
              <div className="dl-body">
                <div className="dl-subtitle">Monthly average live storage (MAF) — Tarbela, Mangla &amp; combined</div>
                <div className="dl-controls">
                  <SeriesToggles visible={visible} onToggle={toggleSeries} />
                  <YearSelect year={year} years={years} onChange={setYear} />
                </div>
                <Chart data={chartData} height={300} visible={visible} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {open && isMaximized && (
            <motion.div
              className="ic-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="ic-fullscreen-inner dl-fullscreen-inner">
                {header(true)}
                <div className="dl-body dl-body-full">
                  <div className="dl-subtitle">Monthly average live storage (MAF) — Tarbela, Mangla &amp; combined</div>
                  <div className="dl-controls">
                    <SeriesToggles visible={visible} onToggle={toggleSeries} />
                    <YearSelect year={year} years={years} onChange={setYear} />
                  </div>
                  <div className="dl-chart-fill">
                    <Chart data={chartData} height="100%" visible={visible} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default DamLevelsModal;
