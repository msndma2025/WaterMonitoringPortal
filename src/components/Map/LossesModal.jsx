import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import FontSizeControl from './FontSizeControl';
import './LossesModal.css';

const MONTHS = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ROWS = [
  { no: 1, label: 'River System',  sub: null,                           values: [0.6,0.6,0.7,0.9,1.1,1.3,1.4,1.1,0.9,0.7,0.6,0.6], total: 10  },
  { no: 2, label: 'Canal',         sub: '(Main, Branch, Distributary)', values: [3.8,4,  4.2,4.5,5,  5.2,5.3,5,  4.8,4.5,4.2,4  ], total: 55  },
  { no: 3, label: 'Farm Field',    sub: null,                           values: [1.4,1.5,1.6,1.8,2.2,2.3,2.4,2.2,2.1,1.9,1.6,1.5], total: 23  },
  { no: 4, label: 'Kotri Escapage',sub: null,                           values: [0.8,0.9,1.2,1.8,2.5,3.5,4.5,3.8,3,  1.5,1,  0.8], total: 24  },
  { no: 5, label: 'Total',         sub: null,                           values: [6.6,7,  7.7,9,  10.8,12.3,13.6,12.1,10.8,8.6,7.4,6.9], total: 112, isTotal: true },
];

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th className="lm-th lm-th-no">#</th>
        <th className="lm-th lm-th-label">Losses (MAF)</th>
        {MONTHS.map((m) => <th key={m} className="lm-th lm-th-month">{m}</th>)}
        <th className="lm-th lm-th-total">Total<br />(MAF)</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r) => (
        <tr key={r.no} className={r.isTotal ? 'lm-row-total' : r.no % 2 === 0 ? 'lm-row-dark' : 'lm-row-black'}>
          <td className="lm-td lm-td-no">{r.no}</td>
          <td className="lm-td lm-td-label">
            {r.label}
            {r.sub && <div className="lm-sub">{r.sub}</div>}
          </td>
          {r.values.map((v, i) => <td key={i} className="lm-td">{v}</td>)}
          <td className="lm-td lm-td-total">{r.total}</td>
        </tr>
      ))}
    </tbody>
  </>
);

const LossesModal = () => {
  const { showLossesModal, setShowLossesModal, tableFontScale } = useMapStore();
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
      className="lm-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="lm-title">Losses (MAF) — 2026</span>
      <div className="lm-header-btns">
        <FontSizeControl />
        <button className="lm-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="lm-icon-btn" onClick={() => { setShowLossesModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showLossesModal && !isMaximized && (
            <motion.div
              className="lm-modal"
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
              <div className="lm-table-wrap">
                <table className="lm-table"><TableBody /></table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showLossesModal && isMaximized && (
            <motion.div
              className="lm-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="lm-fullscreen-inner" style={{ '--fs': tableFontScale }}>
                {header(true)}
                <div className="lm-table-wrap lm-table-wrap-full">
                  <table className="lm-table lm-table-full"><TableBody /></table>
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

export default LossesModal;
