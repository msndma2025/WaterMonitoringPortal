import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import FontSizeControl from './FontSizeControl';
import './InflowsCompModal.css';

const ROWS = [
  { month: 'January',   y2025: 4.0,  y2026: 3.0  },
  { month: 'February',  y2025: 4.0,  y2026: 4.0  },
  { month: 'March',     y2025: 5.0,  y2026: 6.0  },
  { month: 'April',     y2025: 9.0,  y2026: 11.5 },
  { month: 'May',       y2025: 10.5, y2026: 10.7 },
  { month: 'June',      y2025: 18.0, y2026: 16.0 },
  { month: 'July',      y2025: 27.0, y2026: 25.0 },
  { month: 'August',    y2025: 28.0, y2026: 22.0 },
  { month: 'September', y2025: 29.4, y2026: 19.0 },
  { month: 'October',   y2025: 4.5,  y2026: 7.0  },
  { month: 'November',  y2025: 4.0,  y2026: 6.0  },
  { month: 'December',  y2025: 3.6,  y2026: 5.0  },
];

const ChangeCell = ({ y2025, y2026 }) => {
  const diff = Number((y2026 - y2025).toFixed(1));
  const color = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#9ca3af';
  const arrow = diff > 0 ? 'fa-arrow-up' : diff < 0 ? 'fa-arrow-down' : 'fa-minus';
  const sign = diff > 0 ? '+' : '';
  return (
    <td className="ic-td ic-td-change" style={{ color, fontWeight: 700 }}>
      {sign}{diff.toFixed(1)} <i className={`fas ${arrow}`} style={{ marginLeft: 4 }} />
    </td>
  );
};

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th className="ic-th ic-th-month">Month</th>
        <th className="ic-th ic-th-year">2025 Inflow (MAF)</th>
        <th className="ic-th ic-th-year">2026 Inflow (MAF)</th>
        <th className="ic-th ic-th-change">Change (MAF)</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r, i) => (
        <tr key={r.month} className={i % 2 === 0 ? 'ic-row-dark' : 'ic-row-black'}>
          <td className="ic-td ic-td-month">{r.month}</td>
          <td className="ic-td">{r.y2025}</td>
          <td className="ic-td">{r.y2026}</td>
          <ChangeCell y2025={r.y2025} y2026={r.y2026} />
        </tr>
      ))}
      <tr className="ic-row-total">
        <td className="ic-td ic-td-month ic-td-total-label">Total Inflow at RIMs</td>
        <td className="ic-td ic-td-total-val">145 – 149</td>
        <td className="ic-td ic-td-total-val">135 – 137</td>
        <td className="ic-td ic-td-total-val ic-td-change" style={{ color: '#ef4444', fontWeight: 700 }}>
          -11 <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: '0.85em' }}>Lower in 2026</span>
        </td>
      </tr>
    </tbody>
  </>
);

const InflowsCompModal = () => {
  const { showInflowsCompModal, setShowInflowsCompModal, tableFontScale } = useMapStore();
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
      <span className="ic-title">Water Inflows 2025 – 2026</span>
      <div className="ic-header-btns">
        <FontSizeControl />
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ic-icon-btn" onClick={() => { setShowInflowsCompModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showInflowsCompModal && !isMaximized && (
            <motion.div
              className="ic-modal ic-modal-wide"
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
                <table className="ic-table"><TableBody /></table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showInflowsCompModal && isMaximized && (
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
                  <table className="ic-table ic-table-full"><TableBody /></table>
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

export default InflowsCompModal;
