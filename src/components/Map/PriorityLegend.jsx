import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import './PriorityLegend.css';

// Colour classes must stay in sync with the "Priority" match expression
// used for the monsoon-basin-layer in MapContainer.jsx.
const PRIORITY_ITEMS = [
  { label: 'Priority 1', color: '#ef4444' },
  { label: 'Priority 2', color: '#3b82f6' },
];

const PriorityLegend = () => {
  const { layerVisibility } = useMapStore();
  const visible = layerVisibility.monsoonBasin;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="priority-legend"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          drag
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.03, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)' }}
        >
          <div className="priority-legend-title">Monsoon Basin — Priority</div>
          <div className="priority-legend-items">
            {PRIORITY_ITEMS.map((item) => (
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

export default PriorityLegend;
