import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import SeasonalBalanceChart from './SeasonalBalanceChart';
import FontSizeControl from './FontSizeControl';
import './InflowsCompModal.css';
import './AgriDemandModal.css';

const SeasonalBalanceModal = () => {
  const { showSeasonalModal, setShowSeasonalModal, tableFontScale } = useMapStore();
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
      <span className="ic-title">Seasonal Water Balance</span>
      <div className="ic-header-btns">
        <FontSizeControl />
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ic-icon-btn" onClick={() => { setShowSeasonalModal(false); setIsMaximized(false); }}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showSeasonalModal && !isMaximized && (
            <motion.div
              className="ic-modal agri-v2-modal is-fit"
              style={{ width: `min(${Math.round(1080 * tableFontScale)}px, 96vw)`, minWidth: 'auto', maxWidth: 'none' }}
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
                <SeasonalBalanceChart scale={tableFontScale} full={false} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showSeasonalModal && isMaximized && (
            <motion.div
              className="ic-fullscreen agri-v2-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="ic-fullscreen-inner agri-v2-fullscreen-inner is-fit">
                {header(true)}
                <div className="agri-v2-body agri-v2-body-full">
                  <SeasonalBalanceChart scale={tableFontScale} full={true} />
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

export default SeasonalBalanceModal;
