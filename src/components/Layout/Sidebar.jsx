import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LAYER_GROUPS } from '../../config/mapConfig';
import { useMapStore } from '../../store/mapStore';
import LayerGroup from './LayerGroup';
import About from './About';
import FontSizeControl from '../Map/FontSizeControl';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { layerVisibility, toggleLayer, expandedGroups, toggleGroup, setShowInflowsModal, setShowLossesModal, setShowInflowsCompModal, setShowProjectionsModal, setShowMonthlyInflowsModal, setShowIndDomModal, setShowAgriModal, sidebarFontScale } = useMapStore();
  const [showAbout, setShowAbout] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const reports = [
    { id: 'catchment',   label: 'Catchment Wise Inflows 2026',      icon: 'fa-table',        open: setShowInflowsModal },
    { id: 'losses',      label: 'Losses (MAF) 2026',                icon: 'fa-tint-slash',   open: setShowLossesModal },
    { id: 'inflows',     label: 'Water Inflows 2025–2026',          icon: 'fa-water',        open: setShowInflowsCompModal },
    { id: 'monthly',     label: 'Monthly Inflows 2025–2027',        icon: 'fa-calendar-alt', open: setShowMonthlyInflowsModal },
    { id: 'projections', label: 'Projections 2027–2030',            icon: 'fa-chart-line',   open: setShowProjectionsModal },
    { id: 'inddom',      label: 'Industrial & Domestic Availability', icon: 'fa-industry',   open: setShowIndDomModal },
    { id: 'agri',        label: 'Demand vs Availability',           icon: 'fa-chart-area',   open: setShowAgriModal },
  ];

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
        style={{ '--sfs': sidebarFontScale }}
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

        {/* Reports & Charts dropdown */}
        <div className="sidebar-inflows-btn-wrap">
          <div className="reports-group">
            <button
              className={`reports-group-header${reportsOpen ? ' open' : ''}`}
              onClick={() => setReportsOpen((v) => !v)}
            >
              <span className="reports-group-icon"><i className="fas fa-folder-open"></i></span>
              <span className="reports-group-label">Reports &amp; Charts</span>
              <i className={`fas fa-chevron-down reports-group-arrow${reportsOpen ? ' expanded' : ''}`}></i>
            </button>
            <AnimatePresence initial={false}>
              {reportsOpen && (
                <motion.div
                  className="reports-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {reports.map((r) => (
                    <motion.button
                      key={r.id}
                      className={`report-btn report-btn-${r.id}`}
                      onClick={() => { r.open(true); onClose(); }}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="report-btn-icon"><i className={`fas ${r.icon}`}></i></span>
                      <span className="report-btn-label">{r.label}</span>
                      <i className="fas fa-chevron-right report-btn-go"></i>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
          <FontSizeControl variant="sidebar" />
        </motion.div>
      </motion.aside>

      {/* About Modal */}
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default Sidebar;
