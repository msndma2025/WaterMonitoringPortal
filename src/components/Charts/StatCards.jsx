import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import './StatCards.css';

// Stats data
const STATS = [
  {
    id: 'totalStorage',
    label: ['River Inflows'],
    value: '135–137',
    unit: 'MAF',
    change: +2.3,
    icon: 'fa-solid fa-water',
    color: '#38bdf8',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)',
    bgGlow: 'rgba(56, 189, 248, 0.10)',
    bgGif: '/animated_gifs/river.gif',
  },
  {
    id: 'precipitation',
    label: ['Rain in', 'Lower Basin'],
    value: 30,
    unit: 'MAF',
    change: +12,
    icon: 'fa-solid fa-cloud-showers-heavy',
    color: '#34d399',
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    bgGlow: 'rgba(52, 211, 153, 0.10)',
    bgGif: '/animated_gifs/rain.gif',
  },
  {
    id: 'evaporation',
    label: ['Ground Water', 'Extraction'],
    value: 54,
    unit: 'MAF',
    change: +2.0,
    icon: 'fa-solid fa-arrow-up-from-ground-water',
    color: '#f472b6',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
    bgGlow: 'rgba(244, 114, 182, 0.10)',
    bgGif: '/animated_gifs/groundwater.gif',
  },
  {
    id: 'rainField',
    label: ['Rains in', 'Field'],
    value: 10,
    unit: 'MAF',
    change: +1.2,
    icon: 'fa-solid fa-cloud-rain',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    bgGlow: 'rgba(251, 191, 36, 0.10)',
    bgGif: '/animated_gifs/fields.gif',
  },
  {
    id: 'netNationalWater',
    label: ['Net National', 'Water'],
    value: 229,
    unit: 'MAF',
    change: +7.0,
    icon: 'fa-solid fa-faucet-drip',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    bgGlow: 'rgba(167, 139, 250, 0.10)',
    bgGif: '/animated_gifs/netwater.gif',
  },
];

const AnimatedNumber = ({ value, duration = 2000 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    let startTime;
    let animationFrame;
    const from = prevValue.current;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(from + (value - from) * easeOutExpo);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        prevValue.current = value;
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toFixed(1)}</span>;
};

/* Sparkline paths per card for variety */
const SPARKLINE_PATHS = [
  'M0 16 C5 14, 10 10, 15 12 S25 6, 30 8 S40 4, 45 6 S55 2, 60 5',
  'M0 14 C8 10, 12 16, 20 11 S30 8, 38 13 S48 5, 60 3',
  'M0 12 C6 15, 14 8, 22 14 S32 6, 40 10 S50 3, 60 7',
  'M0 10 C10 15, 18 6, 26 12 S36 4, 44 9 S54 2, 60 6',
  'M0 18 C7 12, 15 14, 22 8 S32 10, 40 5 S50 7, 60 2',
];

const StatCard = ({ stat, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        type: 'spring',
        stiffness: 90,
        damping: 14,
      }}
      whileHover={{
        y: -5,
        scale: 1.03,
        transition: { duration: 0.25, type: 'spring', stiffness: 280, damping: 18 },
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        '--card-color': stat.color,
        '--card-glow': stat.bgGlow,
        '--card-idx': index,
      }}
    >
      {/* Top accent bar */}
      <motion.div
        className="stat-card-accent"
        style={{ background: stat.gradient }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: index * 0.1 + 0.2 }}
      />

      {/* Animated GIF background */}
      {stat.bgGif && (
        <div
          className="stat-card-gif"
          style={{ backgroundImage: `url(${stat.bgGif})` }}
        />
      )}

      {/* Background glow orb */}
      <motion.div
        className="stat-card-bg-glow"
        style={{ background: `radial-gradient(circle at 20% 40%, ${stat.color}22, transparent 65%)` }}
        animate={{
          opacity: isHovered ? 0.6 : 0.15,
          scale: isHovered ? 1.15 : 1,
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Icon */}
      <motion.div
        className="stat-icon-wrapper"
        style={{ background: stat.gradient }}
      >
        <i className={stat.icon} />
        <div className="stat-icon-glow" style={{ background: stat.color }} />
      </motion.div>

      {/* Content */}
      <div className="stat-content">
        <span className="stat-label">
          {(Array.isArray(stat.label) ? stat.label : [stat.label]).map((line, i) => (
            <span key={i} className="stat-label-line">{line}</span>
          ))}
        </span>
        <div className="stat-value-row">
          <span className="stat-value" style={{ color: stat.color }}>
            {typeof stat.value === 'string'
              ? stat.value
              : <AnimatedNumber value={stat.value} />}
          </span>
          <span className="stat-unit" style={{ color: `${stat.color}bb` }}>{stat.unit}</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="stat-sparkline">
        <svg viewBox="0 0 60 20" preserveAspectRatio="none" className="sparkline-svg">
          <defs>
            <linearGradient id={`spark-fill-${stat.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stat.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={stat.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={SPARKLINE_PATHS[index % SPARKLINE_PATHS.length]}
            fill="none"
            stroke={stat.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.8, delay: 0.5 + index * 0.12, ease: 'easeOut' }}
          />
          <motion.path
            d={`${SPARKLINE_PATHS[index % SPARKLINE_PATHS.length]} L60 20 L0 20 Z`}
            fill={`url(#spark-fill-${stat.id})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1.2, delay: 1.2 + index * 0.12 }}
          />
        </svg>
      </div>
    </motion.div>
  );
};

const StatCards = () => {
  return (
    <motion.div
      className="stat-cards-container"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
    >
      {STATS.map((stat, index) => (
        <StatCard key={stat.id} stat={stat} index={index} />
      ))}
    </motion.div>
  );
};

export default StatCards;
