// @refresh reset
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import { TIME_SERIES } from '../../config/mapConfig';
import './TimeSeriesController.css';

// Speed options in milliseconds
const SPEED_OPTIONS = [
  { label: '1x', value: 1500 },
  { label: '2x', value: 750 },
  { label: '4x', value: 375 },
  { label: '6x', value: 250 },
  { label: '8x', value: 185 },
];

const TimeSeriesController = ({ type, visible, onClose }) => {
  const { mapRef, timeSeriesSelections, setTimeSeriesSelection } = useMapStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [opacity, setOpacity] = useState(70);
  const [speedIndex, setSpeedIndex] = useState(0);
  const speed = SPEED_OPTIONS[speedIndex].value;
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef(null);
  const constraintsRef = useRef(null);

  // Get configuration based on type
  const getConfig = () => {
    switch (type) {
      case 'evapotranspiration':
        return {
          title: 'Evapotranspiration (ET)',
          years: TIME_SERIES.evapotranspiration,
          layerPrefix: 'et-',
          color: '#2ecc71',
          colorHover: '#27ae60',
          legend: [
            { color: '#30123b', label: 'Low' },
            { color: '#4666dd', label: '' },
            { color: '#28bceb', label: '' },
            { color: '#32f298', label: '' },
            { color: '#8bff4b', label: '' },
            { color: '#cdec34', label: '' },
            { color: '#fb8222', label: '' },
            { color: '#7a0403', label: 'High' },
          ],
        };
      case 'snowCover':
        return {
          title: 'Snow Cover',
          years: TIME_SERIES.snowCover,
          layerPrefix: 'snow-',
          color: '#00BCD4',
          colorHover: '#00ACC1',
          legend: [
            { color: '#ffffff', label: 'Snow' },
            { color: '#87ceeb', label: 'Ice' },
            { color: '#4169e1', label: 'Glacier' },
          ],
        };
      case 'precipitation':
        return {
          title: 'Precipitation',
          periods: TIME_SERIES.precipitation,
          layerPrefix: 'precipitation-',
          color: '#2196F3',
          colorHover: '#1976D2',
          legend: [
            { color: '#ffffcc', label: 'Low' },
            { color: '#a1dab4', label: '' },
            { color: '#41b6c4', label: '' },
            { color: '#2c7fb8', label: '' },
            { color: '#253494', label: 'High' },
          ],
        };
      case 'temperature':
        return {
          title: 'Temperature',
          months: TIME_SERIES.temperature,
          layerPrefix: 'temperature-',
          color: '#FF9800',
          colorHover: '#F57C00',
          legend: [
            { color: '#2166ac', label: 'Cold' },
            { color: '#4575b4', label: '' },
            { color: '#abd9e9', label: '' },
            { color: '#fee090', label: '' },
            { color: '#fdae61', label: '' },
            { color: '#d73027', label: 'Hot' },
          ],
        };
      default:
        return null;
    }
  };

  const config = getConfig();
  if (!config) return null;

  const isTimePeriod = type === 'precipitation' || type === 'temperature';
  const items = isTimePeriod
    ? (config.periods || config.months)
    : config.years;
  const currentValue = timeSeriesSelections[type];
  const currentIndex = isTimePeriod
    ? items.findIndex(p => p.id === currentValue)
    : items.indexOf(currentValue);

  // Update layer visibility - wrapped in useCallback
  const updateLayer = useCallback((index) => {
    const map = mapRef;
    if (!map) {
      console.log('No map reference');
      return;
    }

    console.log(`Updating ${type} layer to index ${index}`);
    
    items.forEach((item, i) => {
      const layerId = isTimePeriod 
        ? `${config.layerPrefix}${item.id}`
        : `${config.layerPrefix}${item}`;
      
      const layerExists = map.getLayer(layerId);
      
      if (layerExists) {
        const newVisibility = i === index ? 'visible' : 'none';
        map.setLayoutProperty(layerId, 'visibility', newVisibility);
        if (i === index) {
          console.log(`✓ Showing layer: ${layerId}`);
        }
      }
    });

    const newValue = isTimePeriod ? items[index].id : items[index];
    setTimeSeriesSelection(type, newValue);
    setCurrentPlayIndex(index);
  }, [mapRef, type, items, isTimePeriod, config?.layerPrefix, setTimeSeriesSelection]);

  // Handle play animation with useEffect - now uses speed state
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentPlayIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % items.length;
          updateLayer(nextIndex);
          return nextIndex;
        });
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, items.length, updateLayer, speed]);

  // Toggle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // Start from current index
      setCurrentPlayIndex(currentIndex >= 0 ? currentIndex : 0);
      setIsPlaying(true);
    }
  };

  // Handle slider change
  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    setIsPlaying(false); // Stop playing when manually changing
    updateLayer(index);
  };

  // Handle opacity change
  const handleOpacityChange = (e) => {
    const newOpacity = parseInt(e.target.value);
    setOpacity(newOpacity);
    
    const map = mapRef;
    if (!map) return;

    items.forEach(item => {
      const layerId = isTimePeriod 
        ? `${config.layerPrefix}${item.id}`
        : `${config.layerPrefix}${item}`;
      
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'raster-opacity', newOpacity / 100);
      }
    });
  };

  // Sync currentPlayIndex with store's selection
  useEffect(() => {
    const idx = currentIndex >= 0 ? currentIndex : 0;
    setCurrentPlayIndex(idx);
  }, [currentIndex]);

  // Show initial layer when controller becomes visible
  useEffect(() => {
    if (visible && mapRef) {
      // Delay slightly to ensure layers are set up
      const timer = setTimeout(() => {
        const idx = currentIndex >= 0 ? currentIndex : 0;
        updateLayer(idx);
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible, mapRef, currentIndex, updateLayer]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const displayValue = isTimePeriod 
    ? items[currentIndex]?.label || items[0].label
    : currentValue || items[0];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className={`time-series-controller ${isMinimized ? 'minimized' : ''}`}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          drag
          dragMomentum={false}
          dragElastic={0.1}
          whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
        >
          <div className="tsc-header tsc-drag-handle">
            <div className="tsc-header-left">
              <i className="fas fa-grip-vertical tsc-grip"></i>
              <strong className="tsc-title">{config.title}</strong>
            </div>
            <div className="tsc-header-right">
              <span className="tsc-value">{displayValue}</span>
              <button 
                className="tsc-minimize-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <i className={`fas ${isMinimized ? 'fa-expand' : 'fa-minus'}`}></i>
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <div className="tsc-body">
              <div className="tsc-controls">
                <button 
                  className="tsc-play-btn"
                  onClick={togglePlay}
                  style={{ 
                    background: isPlaying ? '#f44336' : config.color,
                  }}
                >
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
              
                <input 
                  type="range"
                  className="tsc-slider"
                  min="0"
                  max={items.length - 1}
                  value={currentIndex >= 0 ? currentIndex : 0}
                  onChange={handleSliderChange}
                />
              </div>
              
              <div className="tsc-speed-controls">
                <button
                  className="tsc-speed-cycle-btn"
                  onClick={() => setSpeedIndex((prev) => (prev + 1) % SPEED_OPTIONS.length)}
                  title="Click to cycle speed"
                >
                  <i className="fas fa-tachometer-alt" />
                  <span>{SPEED_OPTIONS[speedIndex].label}</span>
                </button>
              </div>
            
              <div className="tsc-options">
                <div className="tsc-opacity">
                  <label>Opacity</label>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={opacity}
                    onChange={handleOpacityChange}
                  />
                </div>
              
                <div className="tsc-legend">
                  {config.legend.map((item, idx) => (
                    <span 
                      key={idx}
                      className="tsc-legend-item"
                      style={{ background: item.color }}
                    />
                  ))}
                  <span className="tsc-legend-labels">
                    <span>{config.legend[0].label}</span>
                    <span>{config.legend[config.legend.length - 1].label}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimeSeriesController;
