import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import WaterStorageChart from './WaterStorageChart';
import FontSizeControl from './FontSizeControl';
import './InflowsCompModal.css';
import './AgriDemandModal.css';

const StorageAvailabilityModal = () => {
  const { showStorageModal, setShowStorageModal, tableFontScale } = useMapStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [fitAll, setFitAll] = useState(true);
  const [limited, setLimited] = useState(false);
  const dragControls = useDragControls();

  // Open in the full-width chart by default each time the modal is shown.
  useEffect(() => {
    if (showStorageModal) setFitAll(true);
  }, [showStorageModal]);

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
      <span className="ic-title">Storage vs Availability</span>
      <div className="ic-header-btns">
        <FontSizeControl />
        <button
          className={`ic-icon-btn${fitAll ? ' is-active' : ''}`}
          onClick={() => setFitAll(!fitAll)}
          title={fitAll ? 'Scrollable view' : 'Fit all years'}
        >
          <i className={`fas fa-${fitAll ? 'arrows-left-right' : 'arrows-left-right-to-line'}`} />
        </button>
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button
          className={`ic-icon-btn ic-icon-btn-text${limited ? ' is-active' : ''}`}
          onClick={() => setLimited(!limited)}
          title={limited ? 'Show all years' : 'Limit to 2026–2030'}
        >
          L
        </button>
        <button className="ic-icon-btn" onClick={() => { setShowStorageModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showStorageModal && !isMaximized && (
            <motion.div
              className={`ic-modal agri-v2-modal${fitAll ? ' is-fit' : ''}`}
              style={
                fitAll
                  ? { minWidth: 'auto', maxWidth: 'none' }
                  : { width: `min(${Math.round(760 * tableFontScale)}px, 96vw)`, minWidth: 'auto', maxWidth: 'none' }
              }
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
              <div className="agri-v2-body">
                <WaterStorageChart scale={tableFontScale} full={false} fit={fitAll} limited={limited} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showStorageModal && isMaximized && (
            <motion.div
              className="ic-fullscreen agri-v2-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`ic-fullscreen-inner agri-v2-fullscreen-inner${fitAll ? ' is-fit' : ''}`}>
                {header(true)}
                <div className="agri-v2-body agri-v2-body-full">
                  <WaterStorageChart scale={tableFontScale} full={true} fit={fitAll} limited={limited} />
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

export default StorageAvailabilityModal;
