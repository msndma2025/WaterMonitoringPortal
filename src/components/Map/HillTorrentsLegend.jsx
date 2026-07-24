import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import './PriorityLegend.css';

// Colours must stay in sync with the hill-torrents layer in MapContainer.jsx
const TORRENT_ITEMS = [
  { label: 'D.I. Khan 1',   color: '#f97316' },
  { label: 'D.I. Khan 2',   color: '#eab308' },
  { label: 'Kirthar Range', color: '#a855f7' },
  { label: 'Sindh Torrent', color: '#ec4899' },
];

const HillTorrentsLegend = () => {
  const { layerVisibility } = useMapStore();
  const visible = layerVisibility.hillTorrents;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="priority-legend hill-torrents-legend"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          drag
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.03, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)' }}
        >
          <div className="priority-legend-title">Hill Torrents</div>
          <div className="priority-legend-items">
            {TORRENT_ITEMS.map((item) => (
              <div key={item.label} className="priority-legend-row">
                <span
                  className="priority-legend-swatch"
                  style={{ backgroundColor: item.color }}
                />
                <span className="priority-legend-label">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HillTorrentsLegend;
