import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LegendCards.css';

const IRRIGATION_ITEMS = [
  { id: 'canal_cmd', label: 'Canal Command', maf: 103, color: '#00CC00', icon: 'fa-solid fa-water', gradient: 'linear-gradient(135deg, #00CC00 0%, #00990099 100%)' },
  { id: 'loss_main', label: 'Loss at Main Canal', maf: 25, color: '#FF6347', icon: 'fa-solid fa-arrow-down', gradient: 'linear-gradient(135deg, #FF6347 0%, #CC4F3999 100%)' },
  { id: 'loss_branch', label: 'Loss at Branch Canal', maf: 21, color: '#4DA6FF', icon: 'fa-solid fa-arrow-down', gradient: 'linear-gradient(135deg, #4DA6FF 0%, #3A80CC99 100%)' },
  { id: 'loss_dist', label: 'Loss at Distributary', maf: 10, color: '#FFA94D', icon: 'fa-solid fa-arrow-down', gradient: 'linear-gradient(135deg, #FFA94D 0%, #CC873D99 100%)' },
  { id: 'farm_gate', label: 'Available at Farm Gate', maf: 47, color: '#34d399', icon: 'fa-solid fa-tractor', gradient: 'linear-gradient(135deg, #34d399 0%, #22996D99 100%)' },
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

  return <span>{Number.isInteger(value) ? Math.round(display) : display.toFixed(1)}</span>;
};

const IrrigationBubble = ({ item, index }) => {
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
          <span className="lb-unit" style={{ color: item.color }}>MAF</span>
        </div>
      </div>
    </motion.div>
  );
};

const IrrigationCards = () => (
  <AnimatePresence mode="wait">
    <motion.div
      className="legend-bubbles-container irrigation-grid"
      key="irrigation-cards"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {IRRIGATION_ITEMS.map((item, i) => (
        <IrrigationBubble key={item.id} item={item} index={i} />
      ))}
    </motion.div>
  </AnimatePresence>
);

export default IrrigationCards;
