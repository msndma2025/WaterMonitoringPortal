import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import './StorageComparison.css';

const StorageComparison = () => {
  const { selectedDams, removeDamFromComparison, clearDamComparison } = useMapStore();

  const parseStorageValue = (storage) => {
    const match = storage?.match(/[\d,.]+/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, '')) || 0;
    }
    return 0;
  };

  const calculateTotal = () => {
    let total = 0;
    selectedDams.forEach((storage) => {
      total += parseStorageValue(storage);
    });
    return total.toLocaleString();
  };

  if (selectedDams.size === 0) return null;

  return (
    <motion.div 
      className="storage-comparison"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="storage-header">
        <h4>Gross Storage Comparison</h4>
        <button 
          className="clear-btn"
          onClick={clearDamComparison}
          aria-label="Clear all"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="storage-list">
        <AnimatePresence>
          {Array.from(selectedDams.entries()).map(([name, storage]) => (
            <motion.div 
              key={name}
              className="storage-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              layout
            >
              <span className="dam-name">{name}</span>
              <div className="storage-info">
                <span className="storage-value">{storage}</span>
                <button 
                  className="remove-btn"
                  onClick={() => removeDamFromComparison(name)}
                  aria-label={`Remove ${name}`}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {selectedDams.size > 1 && (
        <div className="storage-total">
          <span className="total-label">River Inflows</span>
          <span className="total-value">{calculateTotal()} MAF</span>
        </div>
      )}
    </motion.div>
  );
};

export default StorageComparison;
