import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WaterChart, StatCards, TimeSeriesChart, SlidesGallery } from '../Charts';
import { fetchAndParseCSV } from '../../utils/csv';
import './MediaPanel.css';


const MediaPanel = () => {
  const [activeView, setActiveView] = useState('chart');
  const [activeChartTab, setActiveChartTab] = useState('rcp');
  const [rcpData, setRcpData] = useState(null);
  const [projectionData, setProjectionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCSVs() {
      setLoading(true);
      const rcp = await fetchAndParseCSV('/Water_RCP_Scenarios.csv');
      const proj = await fetchAndParseCSV('/Water_Projection_data.csv');
      setRcpData(rcp);
      setProjectionData(proj);
      setLoading(false);
    }
    loadCSVs();
  }, []);

  // Transform RCP CSV data for TimeSeriesChart
  function getTimeSeriesChartData() {
    if (!rcpData) return null;
    const years = rcpData.map(row => Number(row['Years']));
    const series = [
      {
        id: 'population',
        name: 'Population (millions)',
        color: '#6366f1',
        visible: true,
        data: rcpData.map(row => Number(row['Population (millions)'])),
      },
      {
        id: 'waterAvailability',
        name: 'Water Availability-IRSA',
        color: '#ff6b9d',
        visible: true,
        data: rcpData.map(row => Number(row['Water Availability-IRSA'])),
      },
      {
        id: 'precipitationAnomaly',
        name: 'RCP 4.5 Precipitation Anomaly (mm)',
        color: '#00e5ff',
        visible: true,
        data: rcpData.map(row => row['RCP 4.5 Precipitation Anomaly (mm)'] ? Number(row['RCP 4.5 Precipitation Anomaly (mm)']) : null),
      },
      {
        id: 'tempAnomaly',
        name: 'RCP 4.5 Temperature Anomaly (C)',
        color: '#ffa726',
        visible: true,
        data: rcpData.map(row => row['RCP 4.5 Temperature Anomaly (C)'] ? Number(row['RCP 4.5 Temperature Anomaly (C)']) : null),
      },
      {
        id: 'perCapitaSurface',
        name: 'Per Capita Surface Water (m³/person/year)',
        color: '#a855f7',
        visible: true,
        data: rcpData.map(row => row['Per Capita Surface Water Availability (m³/person/year)'] ? Number(row['Per Capita Surface Water Availability (m³/person/year)']) : null),
      },
      {
        id: 'perCapitaGW',
        name: 'Per Capita Water (S+GW) (m³/person)',
        color: '#00cc88',
        visible: true,
        data: rcpData.map(row => row['Per Capita Water (S+GW) Availability (m³/person)'] ? Number(row['Per Capita Water (S+GW) Availability (m³/person)']) : null),
      },
    ];
    return { years, series };
  }

  // Transform Projection CSV data for a simple bar/line chart
  function getProjectionChartData() {
    if (!projectionData) return null;
    return {
      years: projectionData.map(row => Number(row['Year'])),
      supply: projectionData.map(row => Number(row['Domestic&Industrial_Supply(MAF)'])),
      demand: projectionData.map(row => Number(row['Domestic&Industrial_Demand(MAF)'])),
      irrigationSupply: projectionData.map(row => Number(row['Irrigation_Supply(MAF)'])),
      irrigationDemand: projectionData.map(row => Number(row['Irrigation_Demand(MAF)'])),
    };
  }

  return (
    <div className="media-panel">
      <StatCards />

      <div className="view-switcher">
        <button 
          className={`view-btn ${activeView === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveView('chart')}
        >
          <i className="fas fa-chart-line" />
          Charts
        </button>
        <button 
          className={`view-btn ${activeView === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveView('gallery')}
        >
          <i className="fas fa-images" />
          Slides Gallery
        </button>
      </div>

      <div className="media-panel-main">
        <AnimatePresence mode="wait">
          {activeView === 'chart' ? (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                <button
                  className={`chart-tab-btn ${activeChartTab === 'rcp' ? 'active' : ''}`}
                  onClick={() => setActiveChartTab('rcp')}
                >
                  RCP Scenarios
                </button>
                <button
                  className={`chart-tab-btn ${activeChartTab === 'projection' ? 'active' : ''}`}
                  onClick={() => setActiveChartTab('projection')}
                >
                  Water Projection
                </button>
              </div>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center' }}>Loading data...</div>
              ) : activeChartTab === 'rcp' ? (
                <TimeSeriesChart data={getTimeSeriesChartData()} />
              ) : (
                <WaterProjectionChart data={getProjectionChartData()} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              <SlidesGallery />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Interactive chart for Water Projection data
function WaterProjectionChart({ data }) {
  const [visibleSeries, setVisibleSeries] = useState({
    supply: true,
    demand: true,
    irrigationSupply: true,
    irrigationDemand: true,
  });
  const [soloMode, setSoloMode] = useState(null);

  if (!data) return null;
  
  const series = [
    { id: 'supply', name: 'Domestic/Industrial Supply', color: '#00e5ff', data: data.supply },
    { id: 'demand', name: 'Domestic/Industrial Demand', color: '#ff6b9d', data: data.demand },
    { id: 'irrigationSupply', name: 'Irrigation Supply', color: '#00ffcc', data: data.irrigationSupply },
    { id: 'irrigationDemand', name: 'Irrigation Demand', color: '#ffa726', data: data.irrigationDemand },
  ];

  const toggleSeries = (id) => {
    if (soloMode === id) {
      setSoloMode(null);
      setVisibleSeries({ supply: true, demand: true, irrigationSupply: true, irrigationDemand: true });
    } else {
      setSoloMode(id);
      setVisibleSeries({ supply: false, demand: false, irrigationSupply: false, irrigationDemand: false, [id]: true });
    }
  };

  const width = 400, height = 200, padding = 40;
  const years = data.years;
  const activeSeries = series.filter(s => visibleSeries[s.id]);
  const maxY = Math.max(...activeSeries.map(s => Math.max(...s.data))) * 1.1;
  const x = i => padding + (i / (years.length - 1)) * (width - 2 * padding);
  const y = v => height - padding - (v / maxY) * (height - 2 * padding);
  const line = arr => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  
  return (
    <div style={{ background: '#0a1628', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ color: '#fff', margin: 0 }}>Water Projection (2025-2050)</h4>
        {soloMode && (
          <button
            onClick={() => { setSoloMode(null); setVisibleSeries({ supply: true, demand: true, irrigationSupply: true, irrigationDemand: true }); }}
            style={{
              padding: '2px 4px',
              background: 'rgba(0, 229, 255, 0.15)',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              borderRadius: 3,
              color: '#00e5ff',
              fontSize: '8px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        )}
      </div>
      <svg width={width} height={height} style={{ marginBottom: 12 }}>
        {/* Axes */}
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#94a3b8" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#94a3b8" strokeWidth="1" />
        {/* Lines */}
        {visibleSeries.supply && <path d={line(data.supply)} fill="none" stroke="#00e5ff" strokeWidth="2.5" />}
        {visibleSeries.demand && <path d={line(data.demand)} fill="none" stroke="#ff6b9d" strokeWidth="2.5" />}
        {visibleSeries.irrigationSupply && <path d={line(data.irrigationSupply)} fill="none" stroke="#00ffcc" strokeWidth="2" strokeDasharray="4 2" />}
        {visibleSeries.irrigationDemand && <path d={line(data.irrigationDemand)} fill="none" stroke="#ffa726" strokeWidth="2" strokeDasharray="4 2" />}
        {/* Year labels - show every 5 years to avoid overlap */}
        {years.map((year, i) => (
          year % 5 === 0 && <text key={year} x={x(i)} y={height-padding+18} fontSize="10" fill="#94a3b8" textAnchor="middle">{year}</text>
        ))}
        {/* Y labels */}
        {[0,0.25,0.5,0.75,1].map(f => (
          <text key={f} x={padding-8} y={y(maxY*f)} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(maxY*f)}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {series.map(s => (
          <button
            key={s.id}
            onClick={() => toggleSeries(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 4px',
              background: visibleSeries[s.id] ? `${s.color}20` : 'rgba(0, 0, 0, 0.25)',
              border: `1px solid ${visibleSeries[s.id] ? s.color + '60' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: 3,
              color: visibleSeries[s.id] ? s.color : '#64748b',
              fontSize: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: visibleSeries[s.id] ? 1 : 0.5,
            }}
          >
            <div style={{ width: 3, height: 3, borderRadius: 1, background: s.color }} />
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MediaPanel;
