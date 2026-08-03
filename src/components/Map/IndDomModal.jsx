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
  LabelList,
} from 'recharts';
import { useMapStore } from '../../store/mapStore';
import FontSizeControl from './FontSizeControl';
import './InflowsCompModal.css';
import './IndDomModal.css';

const ROWS = [
  { month: 'January',   domestic: 0.355, industrial: 0.330 },
  { month: 'February',  domestic: 0.355, industrial: 0.325 },
  { month: 'March',     domestic: 0.385, industrial: 0.335 },
  { month: 'April',     domestic: 0.405, industrial: 0.340 },
  { month: 'May',       domestic: 0.445, industrial: 0.350 },
  { month: 'June',      domestic: 0.470, industrial: 0.355 },
  { month: 'July',      domestic: 0.470, industrial: 0.355 },
  { month: 'August',    domestic: 0.450, industrial: 0.350 },
  { month: 'September', domestic: 0.420, industrial: 0.345 },
  { month: 'October',   domestic: 0.390, industrial: 0.340 },
  { month: 'November',  domestic: 0.340, industrial: 0.335 },
  { month: 'December',  domestic: 0.335, industrial: 0.340 },
];

const fmt = (v) => v.toFixed(3);

const TOTAL_DOMESTIC = ROWS.reduce((a, r) => a + r.domestic, 0);
const TOTAL_INDUSTRIAL = ROWS.reduce((a, r) => a + r.industrial, 0);
const TOTAL_ALL = TOTAL_DOMESTIC + TOTAL_INDUSTRIAL;

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th className="ic-th ic-th-month">Month</th>
        <th className="ic-th ic-th-year">Domestic (MAF)</th>
        <th className="ic-th ic-th-year">Industrial (MAF)</th>
        <th className="ic-th ic-th-year">Total (MAF)</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r, i) => (
        <tr key={r.month} className={i % 2 === 0 ? 'ic-row-dark' : 'ic-row-black'}>
          <td className="ic-td ic-td-month">{r.month}</td>
          <td className="ic-td">{fmt(r.domestic)}</td>
          <td className="ic-td">{fmt(r.industrial)}</td>
          <td className="ic-td ic-td-total-val">{fmt(r.domestic + r.industrial)}</td>
        </tr>
      ))}
      <tr className="ic-row-total">
        <td className="ic-td ic-td-month ic-td-total-label">Total</td>
        <td className="ic-td ic-td-total-val">{fmt(TOTAL_DOMESTIC)}</td>
        <td className="ic-td ic-td-total-val">{fmt(TOTAL_INDUSTRIAL)}</td>
        <td className="ic-td ic-td-total-val">{fmt(TOTAL_ALL)}</td>
      </tr>
    </tbody>
  </>
);

const CHART_DATA = ROWS.map((r) => ({
  month: r.month.slice(0, 3),
  total: +(r.domestic + r.industrial).toFixed(3),
  domestic: r.domestic,
  industrial: r.industrial,
}));

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="idc-tooltip">
      <div className="idc-tooltip-title">{label}</div>
      <div className="idc-tooltip-row"><span>Domestic</span><span>{d.domestic.toFixed(3)}</span></div>
      <div className="idc-tooltip-row"><span>Industrial</span><span>{d.industrial.toFixed(3)}</span></div>
      <div className="idc-tooltip-row idc-tooltip-total"><span>Total</span><span>{d.total.toFixed(3)} MAF</span></div>
    </div>
  );
};

const TotalChart = ({ height, scale = 1 }) => (
  <ResponsiveContainer width="100%" height={height * scale}>
    <AreaChart data={CHART_DATA} margin={{ top: 22, right: 22, left: 14, bottom: 4 }}>
      <defs>
        <linearGradient id="idc-total-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
      <XAxis
        dataKey="month"
        tick={{ fill: '#cbd5e1', fontSize: 11 * scale, fontWeight: 700 }}
        tickLine={false}
        axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
      />
      <YAxis
        domain={['dataMin - 0.05', 'dataMax + 0.05']}
        tick={{ fill: '#cbd5e1', fontSize: 11 * scale, fontWeight: 700 }}
        tickLine={false}
        axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
        width={52 * scale}
        tickFormatter={(v) => v.toFixed(2)}
        label={{ value: 'MAF', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 * scale, fontWeight: 700, dx: -2, dy: 18 }}
      />
      <Tooltip content={<ChartTooltip />} />
      <Area
        type="monotone"
        dataKey="total"
        name="Total (MAF)"
        stroke="#fbbf24"
        strokeWidth={2.5}
        fill="url(#idc-total-grad)"
        dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
        activeDot={{ r: 5, strokeWidth: 0 }}
        animationDuration={1200}
        animationEasing="ease-out"
      >
        <LabelList
          dataKey="total"
          position="top"
          offset={10}
          formatter={(v) => v.toFixed(3)}
          fill="#fef3c7"
          fontSize={11 * scale}
          fontWeight={700}
        />
      </Area>
    </AreaChart>
  </ResponsiveContainer>
);

const IndDomModal = () => {
  const { showIndDomModal, setShowIndDomModal, tableFontScale } = useMapStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!isMaximized) return;
    const handler = (e) => { if (e.key === 'Escape') setIsMaximized(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMaximized]);

  const header = (maximized) => (
    <div
      className="ic-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="ic-title">Industrial &amp; Domestic Availability</span>
      <div className="ic-header-btns">
        <FontSizeControl />
        <button
          className={`ic-icon-btn idc-toggle-btn${showChart ? ' ic-icon-btn-active' : ''}`}
          onClick={() => setShowChart((v) => !v)}
          title={showChart ? 'Show table' : 'Show Total (MAF) chart'}
        >
          <i className={`fas fa-${showChart ? 'table' : 'chart-area'}`} />
          <span>{showChart ? 'Table' : 'Chart'}</span>
        </button>
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ic-icon-btn" onClick={() => { setShowIndDomModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showIndDomModal && !isMaximized && (
            <motion.div
              className="ic-modal ic-modal-wide"
              style={{
                '--fs': tableFontScale,
                ...(showChart ? { width: `${Math.round(620 * tableFontScale)}px`, maxWidth: 'none' } : {}),
              }}
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
              {showChart ? (
                <motion.div
                  key="chart"
                  className="idc-chart-wrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="idc-chart-title">Total Availability (MAF) · monthly</div>
                  <TotalChart height={260} scale={tableFontScale} />
                </motion.div>
              ) : (
                <div className="ic-table-wrap">
                  <table className="ic-table"><TableBody /></table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showIndDomModal && isMaximized && (
            <motion.div
              className="ic-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="ic-fullscreen-inner"
                style={{
                  '--fs': tableFontScale,
                  ...(showChart ? { width: `${Math.round(880 * tableFontScale)}px`, maxWidth: '96vw' } : {}),
                }}
              >
                {header(true)}
                {showChart ? (
                  <motion.div
                    key="chart-full"
                    className="idc-chart-wrap idc-chart-wrap-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="idc-chart-title">Total Availability (MAF) · monthly</div>
                    <TotalChart height={520} scale={tableFontScale} />
                  </motion.div>
                ) : (
                  <div className="ic-table-wrap ic-table-wrap-full">
                    <table className="ic-table ic-table-full"><TableBody /></table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default IndDomModal;
