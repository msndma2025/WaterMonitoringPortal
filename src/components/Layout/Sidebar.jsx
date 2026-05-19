import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LAYER_GROUPS } from '../../config/mapConfig';
import { useMapStore } from '../../store/mapStore';
import LayerGroup from './LayerGroup';
import About from './About';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { layerVisibility, toggleLayer, expandedGroups, toggleGroup, setShowInflowsModal, setShowLossesModal, setShowInflowsCompModal } = useMapStore();
  const [showAbout, setShowAbout] = useState(false);

  const sidebarVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 30 
      }
    },
    exit: { 
      x: '-100%', 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <>
      {/* Sidebar */}
      <motion.aside 
        className="sidebar"
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="sidebar-header">
          <h2>Map Layers</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close sidebar">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="sidebar-content">
          {Object.entries(LAYER_GROUPS).map(([groupKey, group]) => (
            <LayerGroup
              key={groupKey}
              groupId={groupKey}
              group={group}
              isExpanded={expandedGroups[groupKey] || false}
              onToggleExpand={() => toggleGroup(groupKey)}
              layerVisibility={layerVisibility}
              onToggleLayer={toggleLayer}
            />
          ))}
        </div>

        {/* Catchment Inflows Button */}
        <div className="sidebar-inflows-btn-wrap">
          <motion.button
            className="catchment-inflows-btn"
            onClick={() => { setShowInflowsModal(true); onClose(); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="fas fa-table"></i>
            <span>Catchment Wise Inflows 2026</span>
          </motion.button>
          <motion.button
            className="catchment-inflows-btn losses-btn"
            onClick={() => { setShowLossesModal(true); onClose(); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ marginTop: '0.4rem' }}
          >
            <i className="fas fa-tint-slash"></i>
            <span>Losses (MAF) 2026</span>
          </motion.button>
          <motion.button
            className="catchment-inflows-btn inflows-comp-btn"
            onClick={() => { setShowInflowsCompModal(true); onClose(); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ marginTop: '0.4rem' }}
          >
            <i className="fas fa-water"></i>
            <span>Water Inflows 2025–2026</span>
          </motion.button>
        </div>

        {/* About Button at Bottom */}
        <motion.div
          className="sidebar-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button 
            className="about-btn"
            onClick={() => setShowAbout(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="fas fa-info-circle"></i>
            <span>About</span>
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* About Modal */}
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default Sidebar;
