import { motion, AnimatePresence } from 'framer-motion';

const LayerGroup = ({ 
  groupId, 
  group, 
  isExpanded, 
  onToggleExpand, 
  layerVisibility, 
  onToggleLayer 
}) => {
  const itemVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: { duration: 0.15 }
    }
  };

  const handleLayerClick = (layer, e) => {
    e.stopPropagation();
    if (layer.isLink && layer.href) {
      window.open(layer.href, '_blank', 'noopener,noreferrer');
      return;
    }
    onToggleLayer(layer.id);
  };

  return (
    <div className="layer-group">
      <div 
        className="layer-group-header" 
        onClick={onToggleExpand}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
      >
        <div className="layer-group-icon">
          <i className={`fas ${group.icon}`}></i>
        </div>
        <span className="layer-group-label">{group.label}</span>
        <i className={`fas fa-chevron-down layer-group-arrow ${isExpanded ? 'expanded' : ''}`}></i>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="layer-items"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {group.layers.map((layer) => (
              <div 
                key={layer.id}
                className={`layer-item ${layerVisibility[layer.id] ? 'active' : ''}`}
                onClick={(e) => handleLayerClick(layer, e)}
              >
                <label className="custom-checkbox">
                  <input 
                    type="checkbox" 
                    checked={layerVisibility[layer.id] || false}
                    onChange={() => {}}
                    aria-label={layer.label}
                  />
                  <span className="checkbox-visual"></span>
                </label>
                {layer.isLink ? (
                  <a 
                    href={layer.href} 
                    className="layer-item-link layer-item-label"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {layer.label}
                  </a>
                ) : (
                  <span className="layer-item-label">{layer.label}</span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LayerGroup;
