import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import { BASIN_COLORS } from '../../config/mapConfig';
import './Legend.css';

const Legend = () => {
  const { layerVisibility } = useMapStore();
  const [isMinimized, setIsMinimized] = useState(false);

  // Define legend configurations for layers that need them
  const legendConfigs = {
    snowCover: {
      title: 'Snow Cover',
      type: 'gradient',
      colors: ['#FFFFFF', '#87CEEB', '#0000FF'],
      labels: ['Low', 'Medium', 'High'],
    },
    evapotranspiration: {
      title: 'Evapotranspiration',
      type: 'gradient',
      colors: ['#F7FCB9', '#ADDD8E', '#31A354', '#006837'],
      labels: ['Low', '', '', 'High'],
    },
    precipitation: {
      title: 'Precipitation (mm)',
      type: 'gradient',
      colors: ['#FFFFD9', '#C7E9B4', '#41B6C4', '#225EA8'],
      labels: ['0', '250', '500', '1000+'],
    },
    indus: {
      title: 'Indus River',
      type: 'line',
      color: '#0066CC',
    },
    jhelum: {
      title: 'Jhelum River',
      type: 'line',
      color: '#00CC66',
    },
    chenab: {
      title: 'Chenab River',
      type: 'line',
      color: '#CC0066',
    },
    ravi: {
      title: 'Ravi River',
      type: 'line',
      color: '#CC6600',
    },
    sutlaj: {
      title: 'Sutlaj River',
      type: 'line',
      color: '#6600CC',
    },
    riverBasins: {
      title: 'Catchment Basins',
      type: 'category',
      items: [
        { label: 'Indus', color: BASIN_COLORS['Indus'], maf: '93.0' },
        { label: 'Chenab', color: BASIN_COLORS['Chenab'], maf: '23.0' },
        { label: 'Jhelum', color: BASIN_COLORS['Jhelum'], maf: '22.3' },
        { label: 'Sutlej', color: BASIN_COLORS['Sutlej'], maf: '1.5' },
        { label: 'Ravi', color: BASIN_COLORS['Ravi'], maf: '1.4' },
      ],
    },
  };

  // Row stagger animation variants
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
  };
  const rowVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  // Get active legends
  const activeLegends = Object.entries(legendConfigs).filter(
    ([layerId]) => layerVisibility[layerId]
  );

  if (activeLegends.length === 0) return null;

  return (
    <motion.div 
      className={`map-legend ${isMinimized ? 'minimized' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
    >
      <div className="legend-header legend-drag-handle">
        <div className="legend-header-left">
          <i className="fas fa-grip-vertical legend-grip"></i>
          <h4>Legend</h4>
        </div>
        <button 
          className="legend-minimize-btn"
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          <i className={`fas ${isMinimized ? 'fa-expand' : 'fa-minus'}`}></i>
        </button>
      </div>

      {!isMinimized && (
        <div className="legend-content">
          <AnimatePresence>
            {activeLegends.map(([layerId, config]) => (
              <motion.div 
                key={layerId}
                className="legend-item"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {config.type !== 'category' && (
                  <span className="legend-title">{config.title}</span>
                )}
              
                {config.type === 'gradient' && (
                  <div className="legend-gradient">
                    <div 
                      className="gradient-bar"
                      style={{ 
                        background: `linear-gradient(to right, ${config.colors.join(', ')})` 
                      }}
                    />
                    <div className="gradient-labels">
                      {config.labels.map((label, i) => (
                        <span key={i}>{label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {config.type === 'line' && (
                  <div className="legend-line">
                    <div 
                      className="line-sample"
                      style={{ backgroundColor: config.color }}
                    />
                  </div>
                )}

                {config.type === 'category' && (
                  <motion.div
                    className="legend-category"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="category-table-header">
                      <span>Basin</span>
                      <span>MAF</span>
                    </div>
                    {config.items.map((item, i) => {
                      const maxMaf = Math.max(...config.items.map(it => parseFloat(it.maf)));
                      const pct = (parseFloat(item.maf) / maxMaf) * 100;
                      return (
                        <motion.div key={i} className="category-row" variants={rowVariants}>
                          <div className="category-row-left">
                            <div
                              className="category-swatch"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="category-label">{item.label}</span>
                          </div>
                          <div className="category-bar-wrap">
                            <motion.div
                              className="category-bar"
                              style={{ backgroundColor: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="category-value">{item.maf}</span>
                        </motion.div>
                      );
                    })}
                    <motion.div
                      className="category-total"
                      variants={rowVariants}
                    >
                      <span className="category-total-label">Cumulative</span>
                      <span className="category-total-value">
                        {config.items.reduce((sum, it) => sum + parseFloat(it.maf), 0).toFixed(1)} MAF
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default Legend;
