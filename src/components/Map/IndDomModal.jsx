import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import FontSizeControl from './FontSizeControl';
import './InflowsCompModal.css';

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
    </tbody>
  </>
);

const IndDomModal = () => {
  const { showIndDomModal, setShowIndDomModal, tableFontScale } = useMapStore();
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
      <span className="ic-title">Industrial &amp; Domestic Availability</span>
      <div className="ic-header-btns">
        <FontSizeControl />
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
          {showIndDomModal && isMaximized && (
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

export default IndDomModal;
