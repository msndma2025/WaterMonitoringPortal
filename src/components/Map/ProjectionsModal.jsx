import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import FontSizeControl from './FontSizeControl';
import './ProjectionsModal.css';

const ROWS = [
  {
    year: 2027,
    enso: 'El Nino dominant, weakening toward neutral late year',
    iod: 'Neutral to weak positive IOD',
    rimInflow: '134–140 MAF',
    basinRainfall: '24–28 MAF',
    farmRainfall: '8–9 MAF',
    overall: 'Monsoon suppressed; plains rainfall deficient, but snow/glacier melt keeps RIM inflow near-normal to slightly below-normal',
  },
  {
    year: 2028,
    enso: 'Neutral to weak La Nina tendency after El Nino decay',
    iod: 'Neutral to weak negative',
    rimInflow: '140–148 MAF',
    basinRainfall: '34–38 MAF',
    farmRainfall: '12–14 MAF',
    overall: 'Monsoon recovery year; higher rainfall and higher flood-risk sensitivity than 2027',
  },
  {
    year: 2029,
    enso: 'Mostly neutral ENSO',
    iod: 'Neutral IOD',
    rimInflow: '138–145 MAF',
    basinRainfall: '32–36 MAF',
    farmRainfall: '11–13 MAF',
    overall: 'Near-normal water year; no strong ENSO/IOD forcing assumed',
  },
  {
    year: 2030,
    enso: 'Neutral baseline / weak oscillation possible',
    iod: 'Neutral to weak positive IOD possible',
    rimInflow: '140–146 MAF',
    basinRainfall: '34–36 MAF',
    farmRainfall: '12–13 MAF',
    overall: 'Close to long-term average; low confidence, climatological projection preferred',
  },
];

const TableBody = () => (
  <>
    <thead>
      <tr>
        <th className="pm-th pm-th-year">Year</th>
        <th className="pm-th">Likely ENSO Phase</th>
        <th className="pm-th">Likely IOD Phase</th>
        <th className="pm-th">Total RIM Inflow</th>
        <th className="pm-th">Basin Rainfall</th>
        <th className="pm-th">Farm-field Rainfall</th>
        <th className="pm-th pm-th-reason">Overall</th>
      </tr>
    </thead>
    <tbody>
      {ROWS.map((r, i) => (
        <tr key={r.year} className={i % 2 === 0 ? 'pm-row-dark' : 'pm-row-black'}>
          <td className="pm-td pm-td-year">{r.year}</td>
          <td className="pm-td">{r.enso}</td>
          <td className="pm-td">{r.iod}</td>
          <td className="pm-td">{r.rimInflow}</td>
          <td className="pm-td">{r.basinRainfall}</td>
          <td className="pm-td">{r.farmRainfall}</td>
          <td className="pm-td pm-td-reason">{r.overall}</td>
        </tr>
      ))}
    </tbody>
  </>
);

const ProjectionsModal = () => {
  const { showProjectionsModal, setShowProjectionsModal, tableFontScale } = useMapStore();
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
        <FontSizeControl />
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
              <div className="pm-fullscreen-inner" style={{ '--fs': tableFontScale }}>
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
