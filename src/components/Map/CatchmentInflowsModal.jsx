import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import FontSizeControl from './FontSizeControl';
import './CatchmentInflowsModal.css';

const ROWS = [
  { catchment: 'Indus + Kabul', snowPct: '78 – 80', snowMaf: 74,   rainPct: '20 – 22', rainMaf: 18,   total: 92   },
  { catchment: 'Jhelum',        snowPct: '58 – 60', snowMaf: 15,   rainPct: '40 – 42', rainMaf: 7,    total: 22   },
  { catchment: 'Chenab',        snowPct: '63 – 65', snowMaf: 14,   rainPct: '35 – 37', rainMaf: 6,    total: 20   },
  { catchment: 'Ravi',          snowPct: '—',       snowMaf: '—',  rainPct: '100',     rainMaf: 0.9,  total: 0.9  },
  { catchment: 'Sutlej',        snowPct: '—',       snowMaf: '—',  rainPct: '100',     rainMaf: 0.98, total: 0.98 },
];

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th rowSpan={2} className="ci-th ci-th-catchment">River<br />Catchment</th>
        <th colSpan={2} className="ci-th ci-th-group">Snow + Glacier</th>
        <th colSpan={2} className="ci-th ci-th-group">Rain</th>
        <th rowSpan={2} className="ci-th ci-th-total">Total<br />MAF</th>
      </tr>
      <tr>
        <th className="ci-th ci-th-sub">Share in %</th>
        <th className="ci-th ci-th-sub">Flow at RIMS MAF</th>
        <th className="ci-th ci-th-sub">Share in %</th>
        <th className="ci-th ci-th-sub">Flow at RIMS MAF</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r, i) => (
        <tr key={i} className={i % 2 === 0 ? 'ci-row-dark' : 'ci-row-black'}>
          <td className="ci-td ci-td-catchment">{r.catchment}</td>
          <td className="ci-td">{r.snowPct}</td>
          <td className="ci-td">{r.snowMaf}</td>
          <td className="ci-td">{r.rainPct}</td>
          <td className="ci-td">{r.rainMaf}</td>
          <td className="ci-td ci-td-total">{r.total}</td>
        </tr>
      ))}
    </tbody>
  </>
);

const CatchmentInflowsModal = () => {
  const { showInflowsModal, setShowInflowsModal, tableFontScale } = useMapStore();
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
      className="ci-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="ci-title">Catchment Wise Inflows 2026</span>
      <div className="ci-header-btns">
        <FontSizeControl />
        <button className="ci-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ci-icon-btn" onClick={() => { setShowInflowsModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showInflowsModal && !isMaximized && (
            <motion.div
              className="ci-modal"
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
              <div className="ci-table-wrap">
                <table className="ci-table"><TableBody /></table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showInflowsModal && isMaximized && (
            <motion.div
              className="ci-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="ci-fullscreen-inner" style={{ '--fs': tableFontScale }}>
                {header(true)}
                <div className="ci-table-wrap ci-table-wrap-full">
                  <table className="ci-table ci-table-full"><TableBody /></table>
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

export default CatchmentInflowsModal;
