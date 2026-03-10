import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MAP_CONFIG } from '../../config/mapConfig';
import { useMapStore } from '../../store/mapStore';
import './MapControls.css';

const MapControls = () => {
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const { mapRef, mapStyle, setMapStyle } = useMapStore();

  const handleStyleChange = (styleKey) => {
    if (mapRef && MAP_CONFIG.styles[styleKey]) {
      mapRef.setStyle(MAP_CONFIG.styles[styleKey]);
      setMapStyle(styleKey);
    }
    setIsStyleMenuOpen(false);
  };

  const styleLabels = {
    navigation: 'Navigation Night',
    satellite: 'Satellite',
    dark: 'Dark',
    light: 'Light',
    streets: 'Streets',
    outdoors: 'Outdoors',
  };

  return (
    <div className="map-controls">
      {/* Style Switcher */}
      <div className="control-group style-switcher">
        <button 
          className="control-btn"
          onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
          aria-expanded={isStyleMenuOpen}
          aria-haspopup="listbox"
        >
          <i className="fas fa-layer-group"></i>
          <span>{styleLabels[mapStyle]}</span>
          <i className={`fas fa-chevron-down ${isStyleMenuOpen ? 'rotated' : ''}`}></i>
        </button>

        <AnimatePresence>
          {isStyleMenuOpen && (
            <motion.div 
              className="style-dropdown"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              role="listbox"
            >
              {Object.entries(styleLabels).map(([key, label]) => (
                <button
                  key={key}
                  className={`style-option ${mapStyle === key ? 'active' : ''}`}
                  onClick={() => handleStyleChange(key)}
                  role="option"
                  aria-selected={mapStyle === key}
                >
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MapControls;
