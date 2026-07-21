import { useState, useEffect } from 'react';
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
} from 'recharts';
import { useMapStore } from '../../store/mapStore';
import './InflowsCompModal.css';
import './DamLevelsModal.css';

const SERIES = [
  { key: 'tarbela',  name: 'Tarbela',  color: '#38bdf8' },
  { key: 'mangla',   name: 'Mangla',   color: '#34d399' },
  { key: 'combined', name: 'Combined', color: '#fbbf24' },
];

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

const Chart = ({ data, height, visible }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 12, right: 18, left: -6, bottom: 4 }}>
      <defs>
        {SERIES.map((s) => (
          <linearGradient key={s.key} id={`dl-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
      <XAxis
        dataKey="month"
        tick={{ fill: '#94a3b8', fontSize: 10 }}
        tickLine={false}
        axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
        interval={5}
        angle={-40}
        textAnchor="end"
        height={48}
      />
      <YAxis
        tick={{ fill: '#94a3b8', fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
        width={44}
        label={{ value: 'MAF', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, dy: 20 }}
      />
      <Tooltip content={<ChartTooltip visible={visible} />} />
      {SERIES.filter((s) => visible[s.key]).map((s) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.name}
          stroke={s.color}
          strokeWidth={2}
          fill={`url(#dl-grad-${s.key})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
          animationDuration={900}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);

const DamLevelsModal = () => {
  const { layerVisibility } = useMapStore();
  const on = layerVisibility.damLevels;
  const [data, setData] = useState([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState({ tarbela: true, mangla: true, combined: true });
  const dragControls = useDragControls();

  const toggleSeries = (key) =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  useEffect(() => {
    fetch('/Dam_Levels_Monthly_Averages.csv')
      .then((r) => r.text())
      .then((t) => setData(parseDamLevels(t)))
      .catch((e) => console.warn('Could not load Dam Levels CSV:', e.message));
  }, []);

  useEffect(() => {
    if (on) setDismissed(false);
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
                <SeriesToggles visible={visible} onToggle={toggleSeries} />
                <Chart data={data} height={300} visible={visible} />
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
                  <SeriesToggles visible={visible} onToggle={toggleSeries} />
                  <Chart data={data} height={560} visible={visible} />
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
