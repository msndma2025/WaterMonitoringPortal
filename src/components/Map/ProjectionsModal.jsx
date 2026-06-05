import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import './ProjectionsModal.css';

const ROWS = [
  {
    year: 2027,
    inflows: '134 – 140 MAF',
    status: 'Slightly Below Normal',
    enso: 'Moderate to strong El Niño',
    iod: 'Neutral to Negative IOD likely',
    reasoning: 'El Niño typically weakens monsoon. Higher temperatures boost melt but may not fully compensate for reduced rainfall. Western Disturbance expected average to below.',
  },
  {
    year: 2028,
    inflows: '140 – 145 MAF',
    status: 'Near Normal',
    enso: 'Delaying El Niño — Neutral',
    iod: 'Variable, positive IOD possible',
    reasoning: 'Recovery Phase. Better chance of normal monsoon + continued warming supports melt.',
  },
  {
    year: 2029,
    inflows: '142 – 151 MAF',
    status: 'Near Normal to Above',
    enso: 'Neutral to weak La Niña',
    iod: 'Positive IOD possible',
    reasoning: 'Favorable for monsoon. Strong melt contribution due to warming trend.',
  },
  {
    year: 2030,
    inflows: '138 – 148 MAF',
    status: 'Near Normal',
    enso: 'Neutral (most likely)',
    iod: 'Variable',
    reasoning: 'Balanced year. High uncertainty; depends on exact ENSO/IOD alignment.',
  },
];

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th className="pm-th pm-th-year">Year</th>
        <th className="pm-th">Projected Rim Inflows (MAF)</th>
        <th className="pm-th">Status</th>
        <th className="pm-th">Likely ENSO Phase</th>
        <th className="pm-th">IOD &amp; Other Factors</th>
        <th className="pm-th pm-th-reason">Overall Reasoning</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r, i) => (
        <tr key={r.year} className={i % 2 === 0 ? 'pm-row-dark' : 'pm-row-black'}>
          <td className="pm-td pm-td-year">{r.year}</td>
          <td className="pm-td pm-td-inflows">{r.inflows}</td>
          <td className="pm-td pm-td-status">{r.status}</td>
          <td className="pm-td">{r.enso}</td>
          <td className="pm-td">{r.iod}</td>
          <td className="pm-td pm-td-reason">{r.reasoning}</td>
        </tr>
      ))}
    </tbody>
  </>
);

const ProjectionsModal = () => {
  const { showProjectionsModal, setShowProjectionsModal } = useMapStore();
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
      className="pm-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="pm-title">Projections 2027 – 2030</span>
      <div className="pm-header-btns">
        <button className="pm-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="pm-icon-btn" onClick={() => { setShowProjectionsModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showProjectionsModal && !isMaximized && (
            <motion.div
              className="pm-modal"
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
              <div className="pm-table-wrap">
                <table className="pm-table"><TableBody /></table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showProjectionsModal && isMaximized && (
            <motion.div
              className="pm-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="pm-fullscreen-inner">
                {header(true)}
                <div className="pm-table-wrap pm-table-wrap-full">
                  <table className="pm-table pm-table-full"><TableBody /></table>
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

export default ProjectionsModal;
