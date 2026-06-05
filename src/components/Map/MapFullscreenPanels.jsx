import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import ChartsPanel from '../MediaPanel/ChartsPanel';
import { StatCards, LegendCards, SnowCoverCards, DamCards, IndustrialCards, PrecipitationCards, IrrigationCards } from '../Charts';
import './MapFullscreenPanels.css';

const FloatingPanel = ({ title, icon, children, defaultStyle, defaultMinimized = true }) => {
  const [minimized, setMinimized] = useState(defaultMinimized);
  const dragControls = useDragControls();

  return (
    <motion.div
      className={`fsp-panel${minimized ? ' fsp-minimized' : ''}`}
      style={defaultStyle}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
    >
      <div className="fsp-header" onPointerDown={(e) => dragControls.start(e)}>
        <div className="fsp-header-left">
          <i className={`fas ${icon} fsp-icon`} />
          <span className="fsp-title">{title}</span>
        </div>
        <button className="fsp-btn" onClick={() => setMinimized(!minimized)} title={minimized ? 'Expand' : 'Minimize'}>
          <i className={`fas fa-${minimized ? 'chevron-up' : 'minus'}`} />
        </button>
      </div>
      {!minimized && <div className="fsp-body">{children}</div>}
    </motion.div>
  );
};

const StatsContent = () => {
  const { layerVisibility } = useMapStore();
  if (layerVisibility.riverBasins) return <LegendCards />;
  if (layerVisibility.snowCover) return <SnowCoverCards />;
  if (layerVisibility.precipitation) return <PrecipitationCards />;
  if (layerVisibility.mainCanals || layerVisibility.branchCanals || layerVisibility.distributaryCanals) return <IrrigationCards />;
  if (layerVisibility.ongoingDams || layerVisibility.futureDams || layerVisibility.underConstruction || layerVisibility.indianDams) return <DamCards />;
  if (layerVisibility.industries) return <IndustrialCards />;
  return <StatCards />;
};

const CATCHMENT_ROWS = [
  { catchment: 'Indus + Kabul', snowPct: '78 – 80', snowMaf: 76,   rainPct: '20 – 22', rainMaf: 19,   total: 95   },
  { catchment: 'Jhelum',        snowPct: '58 – 60', snowMaf: 16,   rainPct: '40 – 42', rainMaf: 8,    total: 24   },
  { catchment: 'Chenab',        snowPct: '63 – 65', snowMaf: 15,   rainPct: '35 – 37', rainMaf: 6,    total: 21   },
  { catchment: 'Ravi',          snowPct: '—',       snowMaf: '—',  rainPct: '100',     rainMaf: 0.9,  total: 0.9  },
  { catchment: 'Sutlej',        snowPct: '—',       snowMaf: '—',  rainPct: '100',     rainMaf: 0.98, total: 0.98 },
];

const CatchmentContent = () => (
  <table className="fsp-catchment-table">
    <thead>
      <tr>
        <th rowSpan={2}>River<br />Catchment</th>
        <th colSpan={2}>Snow + Glacier</th>
        <th colSpan={2}>Rain</th>
        <th rowSpan={2}>Total<br />MAF</th>
      </tr>
      <tr>
        <th className="fsp-th-sub">Share %</th>
        <th className="fsp-th-sub">Flow at RIMS</th>
        <th className="fsp-th-sub">Share %</th>
        <th className="fsp-th-sub">Flow at RIMS</th>
      </tr>
    </thead>
    <tbody>
      {CATCHMENT_ROWS.map((r, i) => (
        <tr key={i} className={i % 2 === 0 ? 'fsp-row-a' : 'fsp-row-b'}>
          <td className="fsp-td-catchment">{r.catchment}</td>
          <td>{r.snowPct}</td>
          <td>{r.snowMaf}</td>
          <td>{r.rainPct}</td>
          <td>{r.rainMaf}</td>
          <td className="fsp-td-total">{r.total}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const MapFullscreenPanels = () => {
  const { mapFullscreen } = useMapStore();
  if (!mapFullscreen) return null;

  return createPortal(
    <>
      <FloatingPanel
        title="Charts"
        icon="fa-chart-line"
        defaultStyle={{ position: 'fixed', bottom: 50, left: 20, width: 720, zIndex: 9100 }}
      >
        <div className="fsp-charts-body">
          <ChartsPanel />
        </div>
      </FloatingPanel>

      <FloatingPanel
        title="Statistics"
        icon="fa-tachometer-alt"
        defaultStyle={{ position: 'fixed', bottom: 50, right: 20, width: 420, zIndex: 9100 }}
      >
        <div className="fsp-stats-body">
          <StatsContent />
        </div>
      </FloatingPanel>

      <FloatingPanel
        title="Catchment Wise Inflows 2026"
        icon="fa-mountain"
        defaultStyle={{ position: 'fixed', top: 90, right: 20, width: 540, zIndex: 9100 }}
      >
        <div className="fsp-catchment-body">
          <CatchmentContent />
        </div>
      </FloatingPanel>
    </>,
    document.body
  );
};

export default MapFullscreenPanels;
