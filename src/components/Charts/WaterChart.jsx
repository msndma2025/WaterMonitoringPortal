import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './WaterChart.css';

// Sample data - will be replaced with real data later
const SAMPLE_DATA = {
  storage: {
    title: 'Dam Storage Levels',
    subtitle: 'Million Acre Feet (MAF)',
    data: [
      { name: 'Tarbela', value: 85, max: 100, color: '#00e5ff' },
      { name: 'Mangla', value: 72, max: 100, color: '#00ffcc' },
      { name: 'Chashma', value: 45, max: 100, color: '#ff6b9d' },
      { name: 'Warsak', value: 58, max: 100, color: '#ffd700' },
      { name: 'Mirani', value: 33, max: 100, color: '#00cc88' },
    ]
  },
  precipitation: {
    title: 'Monthly Precipitation',
    subtitle: 'Millimeters (mm)',
    data: [
      { month: 'Jan', value: 45 },
      { month: 'Feb', value: 52 },
      { month: 'Mar', value: 78 },
      { month: 'Apr', value: 95 },
      { month: 'May', value: 42 },
      { month: 'Jun', value: 28 },
      { month: 'Jul', value: 125 },
      { month: 'Aug', value: 142 },
      { month: 'Sep', value: 68 },
      { month: 'Oct', value: 32 },
      { month: 'Nov', value: 18 },
      { month: 'Dec', value: 35 },
    ]
  },
  waterBalance: {
    title: 'Water Balance',
    subtitle: 'Annual Distribution',
    data: [
      { name: 'Agriculture', value: 93, color: '#00e5ff' },
      { name: 'Industrial', value: 4, color: '#ff6b9d' },
      { name: 'Domestic', value: 3, color: '#00ffcc' },
    ]
  }
};

// Animated Bar Chart
const BarChart = ({ data, animated }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bar-chart">
      {data.map((item, index) => (
        <div key={item.name} className="bar-item">
          <div className="bar-label">{item.name}</div>
          <div className="bar-track">
            <motion.div
              className="bar-fill"
              initial={{ width: 0 }}
              animate={{ width: animated ? `${(item.value / item.max) * 100}%` : 0 }}
              transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
              style={{ background: item.color }}
            >
              <div className="bar-glow" style={{ background: item.color }} />
            </motion.div>
          </div>
          <motion.div 
            className="bar-value"
            initial={{ opacity: 0 }}
            animate={{ opacity: animated ? 1 : 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            {item.value}%
          </motion.div>
        </div>
      ))}
    </div>
  );
};

// Animated Line Chart
const LineChart = ({ data, animated }) => {
  const canvasRef = useRef(null);
  const maxValue = Math.max(...data.map(d => d.value));
  const padding = { top: 20, right: 20, bottom: 35, left: 45 };
  
  useEffect(() => {
    if (!canvasRef.current || !animated) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Draw Y axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      const value = Math.round(maxValue - (maxValue / 4) * i);
      ctx.fillText(value.toString(), padding.left - 8, y + 4);
    }
    
    // Draw X axis labels
    ctx.textAlign = 'center';
    data.forEach((item, index) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      ctx.fillText(item.month, x, height - 10);
    });
    
    // Calculate points
    const points = data.map((item, index) => ({
      x: padding.left + (chartWidth / (data.length - 1)) * index,
      y: padding.top + chartHeight - (item.value / maxValue) * chartHeight
    }));
    
    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((point, i) => {
      if (i === 0) return;
      ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Draw glow
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw points
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1628';
      ctx.fill();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
  }, [data, animated, maxValue]);
  
  return (
    <motion.div 
      className="line-chart"
      initial={{ opacity: 0 }}
      animate={{ opacity: animated ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <canvas ref={canvasRef} width={400} height={200} />
    </motion.div>
  );
};

// Animated Donut Chart
const DonutChart = ({ data, animated }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;
  
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };
  
  return (
    <div className="donut-chart">
      <svg viewBox="-1.2 -1.2 2.4 2.4" className="donut-svg">
        {data.map((item, index) => {
          const percent = item.value / total;
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
          cumulativePercent += percent;
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          const largeArcFlag = percent > 0.5 ? 1 : 0;
          
          const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          ].join(' ');
          
          return (
            <motion.path
              key={item.name}
              d={pathData}
              fill="none"
              stroke={item.color}
              strokeWidth="0.25"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: animated ? 1 : 0, 
                opacity: animated ? 1 : 0 
              }}
              transition={{ duration: 1, delay: index * 0.2, ease: "easeOut" }}
              className="donut-segment"
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <motion.span 
          className="donut-total"
          initial={{ scale: 0 }}
          animate={{ scale: animated ? 1 : 0 }}
          transition={{ delay: 0.8, type: "spring" }}
        >
          100%
        </motion.span>
        <span className="donut-label">Total</span>
      </div>
      <div className="donut-legend">
        {data.map((item, index) => (
          <motion.div 
            key={item.name} 
            className="legend-item"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: animated ? 0 : -20, opacity: animated ? 1 : 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <span className="legend-dot" style={{ background: item.color }} />
            <span className="legend-name">{item.name}</span>
            <span className="legend-value">{item.value}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const WaterChart = () => {
  const [activeTab, setActiveTab] = useState('storage');
  const [isVisible, setIsVisible] = useState(true);
  
  const tabs = [
    { id: 'storage', label: 'Storage', icon: 'fa-database' },
    { id: 'precipitation', label: 'Rainfall', icon: 'fa-cloud-rain' },
    { id: 'waterBalance', label: 'Usage', icon: 'fa-chart-pie' },
  ];
  
  const handleTabChange = (tabId) => {
    setIsVisible(false);
    setTimeout(() => {
      setActiveTab(tabId);
      setIsVisible(true);
    }, 300);
  };
  
  const currentData = SAMPLE_DATA[activeTab];
  
  return (
    <div className="water-chart-card">
      <div className="chart-header">
        <div className="chart-info">
          <h3 className="chart-title">{currentData.title}</h3>
          <span className="chart-subtitle">{currentData.subtitle}</span>
        </div>
        <div className="chart-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`chart-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <i className={`fas ${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="chart-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="chart-wrapper"
          >
            {activeTab === 'storage' && (
              <BarChart data={currentData.data} animated={isVisible} />
            )}
            {activeTab === 'precipitation' && (
              <LineChart data={currentData.data} animated={isVisible} />
            )}
            {activeTab === 'waterBalance' && (
              <DonutChart data={currentData.data} animated={isVisible} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WaterChart;
