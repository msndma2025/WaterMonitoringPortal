import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import './InflowsCompModal.css';

const ROWS = [
  { basin: 'Gilgit–Hunza',      share: '26%', maf: '17.55 MAF' },
  { basin: 'Shigar',            share: '9%',  maf: '6.08 MAF'  },
  { basin: 'Shyok',             share: '16%', maf: '10.80 MAF' },
  { basin: 'Astore',            share: '6%',  maf: '4.05 MAF'  },
  { basin: 'Upper Indus',       share: '23%', maf: '15.52 MAF' },
  { basin: 'Lower UIB Residual', share: '20%', maf: '13.50 MAF' },
];

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th className="ic-th ic-th-month">Sub basins</th>
        <th className="ic-th ic-th-year">Share</th>
        <th className="ic-th ic-th-year">Value in MAF</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r, i) => (
        <tr key={r.basin} className={i % 2 === 0 ? 'ic-row-dark' : 'ic-row-black'}>
          <td className="ic-td ic-td-month">{r.basin}</td>
          <td className="ic-td">{r.share}</td>
          <td className="ic-td">{r.maf}</td>
        </tr>
      ))}
      <tr className="ic-row-total">
        <td className="ic-td ic-td-month ic-td-total-label">Total Indus</td>
        <td className="ic-td ic-td-total-val">100%</td>
        <td className="ic-td ic-td-total-val">65 – 70 MAF</td>
      </tr>
    </tbody>
  </>
);

const SubBasinsModal = () => {
  const { layerVisibility } = useMapStore();
  const subBasinsOn = layerVisibility.subBasins;
  const [isMaximized, setIsMaximized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dragControls = useDragControls();

  // Reset the dismissed state each time the layer is (re)enabled
  useEffect(() => {
    if (subBasinsOn) setDismissed(false);
  }, [subBasinsOn]);

  useEffect(() => {
    if (!isMaximized) return;
    const handler = (e) => { if (e.key === 'Escape') setIsMaximized(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMaximized]);

  const open = subBasinsOn && !dismissed;

  const header = (maximized) => (
    <div
      className="ic-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="ic-title">Indus Sub-Basins — Share of Inflows</span>
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
              className="ic-modal"
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
          {open && isMaximized && (
            <motion.div
              className="ic-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="ic-fullscreen-inner">
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

export default SubBasinsModal;
