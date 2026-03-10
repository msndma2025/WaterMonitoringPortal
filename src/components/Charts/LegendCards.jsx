import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BASIN_COLORS } from '../../config/mapConfig';
import './LegendCards.css';

const BASIN_ITEMS = [
  { id: 'indus', label: 'Indus', maf: 93.0, color: BASIN_COLORS['Indus'], icon: 'fa-solid fa-water', gradient: `linear-gradient(135deg, ${BASIN_COLORS['Indus']} 0%, ${BASIN_COLORS['Indus']}99 100%)` },
  { id: 'chenab', label: 'Chenab', maf: 23.0, color: BASIN_COLORS['Chenab'], icon: 'fa-solid fa-water', gradient: `linear-gradient(135deg, ${BASIN_COLORS['Chenab']} 0%, ${BASIN_COLORS['Chenab']}99 100%)` },
  { id: 'jhelum', label: 'Jhelum', maf: 22.3, color: BASIN_COLORS['Jhelum'], icon: 'fa-solid fa-water', gradient: `linear-gradient(135deg, ${BASIN_COLORS['Jhelum']} 0%, ${BASIN_COLORS['Jhelum']}99 100%)` },
  { id: 'sutlej', label: 'Sutlej', maf: 1.5, color: BASIN_COLORS['Sutlej'], icon: 'fa-solid fa-water', gradient: `linear-gradient(135deg, ${BASIN_COLORS['Sutlej']} 0%, ${BASIN_COLORS['Sutlej']}99 100%)` },
  { id: 'ravi', label: 'Ravi', maf: 1.4, color: BASIN_COLORS['Ravi'], icon: 'fa-solid fa-water', gradient: `linear-gradient(135deg, ${BASIN_COLORS['Ravi']} 0%, ${BASIN_COLORS['Ravi']}99 100%)` },
  { id: 'cumulative', label: 'Cumulative', maf: 141.2, color: '#00e5ff', icon: 'fa-solid fa-layer-group', gradient: 'linear-gradient(135deg, #00e5ff 0%, #0088aa 100%)' },
];

const AnimatedNumber = ({ value, duration = 1800 }) => {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    let start;
    let raf;
    const from = prev.current;
    const animate = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(from + (value - from) * ease);
      if (p < 1) raf = requestAnimationFrame(animate);
      else prev.current = value;
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span>{display.toFixed(1)}</span>;
};

const LegendBubble = ({ item, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="legend-bubble"
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, delay: index * 0.07, type: 'spring', stiffness: 100, damping: 14 }}
      whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.2, type: 'spring', stiffness: 280, damping: 18 } }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ '--lb-color': item.color, '--lb-glow': `${item.color}18` }}
    >
      <motion.div className="lb-accent" style={{ background: item.gradient }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: index * 0.07 + 0.15 }} />

      <motion.div className="lb-bg-glow" style={{ background: `radial-gradient(circle at 20% 40%, ${item.color}22, transparent 65%)` }} animate={{ opacity: isHovered ? 0.55 : 0.12, scale: isHovered ? 1.15 : 1 }} transition={{ duration: 0.35 }} />

      <div className="lb-icon" style={{ background: item.gradient }}>
        <i className={item.icon} />
      </div>

      <div className="lb-content">
        <span className="lb-label">{item.label}</span>
        <div className="lb-value-row">
          <span className="lb-value" style={{ color: item.color }}>
            <AnimatedNumber value={item.maf} />
          </span>
          <span className="lb-unit" style={{ color: `${item.color}bb` }}>MAF</span>
        </div>
      </div>
    </motion.div>
  );
};

const LegendCards = () => {
  return (
    <motion.div
      className="legend-bubbles-container"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      <AnimatePresence>
        {BASIN_ITEMS.map((item, i) => (
          <LegendBubble key={item.id} item={item} index={i} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default LegendCards;
