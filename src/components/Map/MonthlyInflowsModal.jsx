import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import FontSizeControl from './FontSizeControl';
import './InflowsCompModal.css';
import './MonthlyInflowsModal.css';

const ROWS = [
  { month: 'January',   y2025: 4.0,  y2026: 3.0,  y2027: 4.0,  logic: 'Stronger western disturbance / winter baseflow' },
  { month: 'February',  y2025: 4.0,  y2026: 4.0,  y2027: 4.8,  logic: 'Continued WD influence and snowfall contribution' },
  { month: 'March',     y2025: 5.0,  y2026: 6.0,  y2027: 7.0,  logic: 'Snowpack buildup + early warming signal' },
  { month: 'April',     y2025: 9.0,  y2026: 11.5, y2027: 12.0, logic: 'Early melt begins from above-average snowpack' },
  { month: 'May',       y2025: 10.5, y2026: 10.7, y2027: 11.5, logic: 'Accelerated snowmelt' },
  { month: 'June',      y2025: 18.0, y2026: 16.0, y2027: 15.7, logic: 'High melt, but limited pre-monsoon rain' },
  { month: 'July',      y2025: 27.0, y2026: 25.0, y2027: 25.0, logic: 'Melt remains strong, monsoon starts suppressed' },
  { month: 'August',    y2025: 28.0, y2026: 22.0, y2027: 21.0, logic: 'El Nino suppresses core monsoon rainfall' },
  { month: 'September', y2025: 29.4, y2026: 19.0, y2027: 18.0, logic: 'Weak monsoon tail, reduced rainfall contribution' },
  { month: 'October',   y2025: 4.5,  y2026: 7.0,  y2027: 5.4,  logic: 'Recession flow; lower post-monsoon support' },
  { month: 'November',  y2025: 4.0,  y2026: 6.0,  y2027: 4.5,  logic: 'Limited late-year WD contribution' },
  { month: 'December',  y2025: 3.6,  y2026: 5.0,  y2027: 4.1,  logic: 'Low winter baseflow, slight WD support' },
];

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th className="ic-th ic-th-month">Month</th>
        <th className="ic-th ic-th-year">2025 Inflow</th>
        <th className="ic-th ic-th-year">2026 Inflow</th>
        <th className="ic-th ic-th-year mi-th-2027">2027 Projected Inflow</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r, i) => (
        <tr key={r.month} className={i % 2 === 0 ? 'ic-row-dark' : 'ic-row-black'}>
          <td className="ic-td ic-td-month">{r.month}</td>
          <td className="ic-td">{r.y2025.toFixed(1)}</td>
          <td className="ic-td">{r.y2026.toFixed(1)}</td>
          <td className="ic-td mi-td-2027">{r.y2027.toFixed(1)}</td>
        </tr>
      ))}
      <tr className="ic-row-total">
        <td className="ic-td ic-td-month ic-td-total-label">Total inflow at RIMs</td>
        <td className="ic-td ic-td-total-val">145 – 149</td>
        <td className="ic-td ic-td-total-val">135 – 137</td>
        <td className="ic-td ic-td-total-val mi-td-2027">133 – 136 MAF</td>
      </tr>
    </tbody>
  </>
);

const MonthlyInflowsModal = () => {
  const { showMonthlyInflowsModal, setShowMonthlyInflowsModal, tableFontScale } = useMapStore();
  const [isMaximized, setIsMaximized] = useState(false);
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
      <span className="ic-title">Monthly Inflows 2025 – 2027</span>
      <div className="ic-header-btns">
        <FontSizeControl />
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ic-icon-btn" onClick={() => { setShowMonthlyInflowsModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showMonthlyInflowsModal && !isMaximized && (
            <motion.div
              className="ic-modal mi-modal"
              style={{ '--fs': tableFontScale }}
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
              <div className="ic-table-wrap">
                <table className="ic-table mi-table"><TableBody /></table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showMonthlyInflowsModal && isMaximized && (
            <motion.div
              className="ic-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="ic-fullscreen-inner" style={{ '--fs': tableFontScale }}>
                {header(true)}
                <div className="ic-table-wrap ic-table-wrap-full">
                  <table className="ic-table ic-table-full mi-table"><TableBody /></table>
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

export default MonthlyInflowsModal;
