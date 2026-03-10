import { useState } from 'react';
import { motion } from 'framer-motion';
import { CHARTS_CONFIG } from '../../config/mapConfig';
import './ChartCard.css';

const ChartCard = () => {
  const [activeChart, setActiveChart] = useState(CHARTS_CONFIG[0].id);

  const handleEnlarge = () => {
    const activeConfig = CHARTS_CONFIG.find(c => c.id === activeChart);
    if (activeConfig) {
      window.open(
        `https://public.flourish.studio/visualisation/${activeConfig.visualizationId}/`,
        '_blank'
      );
    }
  };

  return (
    <div className="media-card chart-card">
      <div className="media-card-header">
        <div className="chart-tabs">
          {CHARTS_CONFIG.map((chart) => (
            <button
              key={chart.id}
              className={`chart-tab ${activeChart === chart.id ? 'active' : ''}`}
              onClick={() => setActiveChart(chart.id)}
            >
              {chart.label}
            </button>
          ))}
        </div>
        <button 
          className="enlarge-btn"
          onClick={handleEnlarge}
          title="Open in new tab"
        >
          <i className="fas fa-expand-alt"></i>
        </button>
      </div>

      <div className="media-card-content">
        {CHARTS_CONFIG.map((chart) => (
          <motion.div
            key={chart.id}
            className="chart-embed"
            initial={false}
            animate={{ 
              opacity: activeChart === chart.id ? 1 : 0,
              display: activeChart === chart.id ? 'block' : 'none'
            }}
          >
            <iframe
              src={`https://public.flourish.studio/visualisation/${chart.visualizationId}/embed`}
              title={chart.label}
              frameBorder="0"
              scrolling="no"
              style={{ width: '100%', height: '100%' }}
              allowFullScreen
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ChartCard;
