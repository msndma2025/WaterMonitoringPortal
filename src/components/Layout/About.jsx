import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './About.css';

// Mini Water Drop Game Component
const WaterDropGame = () => {
  const [score, setScore] = useState(0);
  const [drops, setDrops] = useState([]);
  const [bucketPos, setBucketPos] = useState(50);
  const [gameActive, setGameActive] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [missedDrops, setMissedDrops] = useState(0);
  const [caughtDrops, setCaughtDrops] = useState([]); // For catch animation
  
  const bucketPosRef = useRef(bucketPos);
  const gameActiveRef = useRef(gameActive);
  const spawnIntervalRef = useRef(null);
  const gameLoopRef = useRef(null);

  // Keep refs in sync
  useEffect(() => {
    bucketPosRef.current = bucketPos;
  }, [bucketPos]);

  useEffect(() => {
    gameActiveRef.current = gameActive;
  }, [gameActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  const spawnDrop = useCallback(() => {
    if (!gameActiveRef.current) return;
    const newDrop = {
      id: Date.now() + Math.random(),
      x: Math.random() * 70 + 15,
      y: 0,
    };
    setDrops(prev => {
      // Limit max drops to prevent memory issues
      if (prev.length > 10) {
        return [...prev.slice(-8), newDrop];
      }
      return [...prev, newDrop];
    });
  }, []);

  // Spawn drops
  useEffect(() => {
    if (!gameActive) {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
      return;
    }
    
    spawnIntervalRef.current = setInterval(spawnDrop, 1200);
    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, [gameActive, spawnDrop]);

  // Game loop
  useEffect(() => {
    if (!gameActive) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      setDrops(prev => {
        const currentBucketPos = bucketPosRef.current;
        let newCaught = [];
        let newMissed = 0;
        
        const updatedDrops = prev.map(drop => {
          const newY = drop.y + 4;
          
          // Check if caught
          if (newY >= 80 && newY < 95 && !drop.caught && !drop.missed) {
            if (Math.abs(drop.x - currentBucketPos) < 18) {
              newCaught.push({ id: drop.id, x: drop.x });
              return { ...drop, y: newY, caught: true };
            }
          }
          
          // Check if missed
          if (newY >= 100 && !drop.caught && !drop.missed) {
            newMissed++;
            return { ...drop, y: newY, missed: true };
          }
          
          return { ...drop, y: newY };
        });
        
        // Update score for caught drops
        if (newCaught.length > 0) {
          setScore(s => s + newCaught.length);
          setCaughtDrops(c => [...c, ...newCaught]);
          // Clear caught animation after delay
          setTimeout(() => {
            setCaughtDrops(c => c.filter(d => !newCaught.find(nc => nc.id === d.id)));
          }, 300);
        }
        
        // Update missed drops
        if (newMissed > 0) {
          setMissedDrops(m => m + newMissed);
        }
        
        // Remove caught and off-screen drops
        return updatedDrops.filter(d => !d.caught && d.y < 105);
      });
    }, 50);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameActive]);

  // Check game over
  useEffect(() => {
    if (missedDrops >= 3 && gameActive) {
      setGameActive(false);
      setHighScore(prev => Math.max(prev, score));
    }
  }, [missedDrops, gameActive, score]);

  const handleMouseMove = (e) => {
    if (!gameActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setBucketPos(Math.max(10, Math.min(90, x)));
  };

  const handleTouchMove = (e) => {
    if (!gameActive) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    setBucketPos(Math.max(10, Math.min(90, x)));
  };

  const startGame = () => {
    setScore(0);
    setDrops([]);
    setMissedDrops(0);
    setCaughtDrops([]);
    setGameActive(true);
  };

  const livesRemaining = Math.max(0, 3 - missedDrops);
  const livesMissed = Math.min(3, missedDrops);

  return (
    <div className="mini-game">
      <div className="game-header">
        <span className="game-title">💧 Drop Catcher</span>
        <span className="game-score">Score: {score}</span>
        {highScore > 0 && <span className="game-high">Best: {highScore}</span>}
      </div>
      
      <div 
        className="game-area"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {!gameActive && (
          <div className="game-overlay">
            {missedDrops >= 3 ? (
              <>
                <span className="game-over">Game Over!</span>
                <span className="final-score">Score: {score}</span>
              </>
            ) : (
              <span className="game-start-text">Catch the drops!</span>
            )}
            <button className="game-start-btn" onClick={startGame}>
              {missedDrops >= 3 ? 'Play Again' : 'Start'}
            </button>
          </div>
        )}
        
        {/* Falling drops */}
        {drops.map(drop => (
          <div
            key={drop.id}
            className="game-drop"
            style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
          >
            💧
          </div>
        ))}
        
        {/* Catch animation */}
        {caughtDrops.map(drop => (
          <div
            key={`catch-${drop.id}`}
            className="game-catch-effect"
            style={{ left: `${drop.x}%` }}
          >
            ✨
          </div>
        ))}
        
        <div 
          className="game-bucket"
          style={{ left: `${bucketPos}%` }}
        >
          🪣
        </div>
        
        <div className="game-lives">
          {[...Array(livesRemaining)].map((_, i) => (
            <span key={`live-${i}`}>❤️</span>
          ))}
          {[...Array(livesMissed)].map((_, i) => (
            <span key={`dead-${i}`} style={{ opacity: 0.3 }}>🖤</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const About = ({ isOpen, onClose }) => {
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 50,
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: 50,
      transition: { duration: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  const floatAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const shimmerAnimation = {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "linear"
    }
  };

  const credits = [
    {
      role: 'Supervised by',
      name: 'Ms. Shahrukh Malik',
      title: 'AM Environment',
      icon: 'fa-user-tie',
      color: '#9C27B0',
    },
    {
      role: 'Data & Formal Analysis',
      name: 'M. Sohail Qasim',
      title: 'AM Risk Assessment',
      icon: 'fa-chart-line',
      color: '#2196F3',
    },
    {
      role: 'App Development',
      name: 'Muddasir Shah',
      title: 'AM Remote Sensing',
      icon: 'fa-code',
      color: '#00BCD4',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="about-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          <div className="about-modal-wrapper">
            <motion.div 
              className="about-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Decorative Background Elements */}
              <div className="about-bg-decoration">
                <motion.div 
                  className="bg-circle circle-1"
                  animate={floatAnimation}
                />
                <motion.div 
                  className="bg-circle circle-2"
                  animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 0.5 } }}
                />
                <motion.div 
                  className="bg-circle circle-3"
                  animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 1 } }}
                />
              </div>

            {/* Header */}
            <motion.div className="about-header" variants={itemVariants}>
              <motion.div 
                className="about-logo"
                animate={pulseAnimation}
              >
                <i className="fas fa-water"></i>
              </motion.div>
              <motion.h1 
                className="about-title"
                animate={shimmerAnimation}
              >
                Water Monitoring Portal
              </motion.h1>
              <button className="about-close-btn" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </motion.div>

            {/* About Content */}
            <motion.div className="about-content" variants={itemVariants}>
              <motion.div 
                className="about-description"
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <motion.div className="description-icon" animate={floatAnimation}>
                  <i className="fas fa-tint"></i>
                </motion.div>
                <p>
                  The <strong>National Water Monitoring Portal</strong> is a comprehensive geospatial 
                  intelligence platform designed to monitor, analyze, and visualize Pakistan's water 
                  resources in real-time. This cutting-edge system integrates satellite imagery, 
                  hydrological data, and advanced analytics to provide actionable insights for 
                  water resource management, flood monitoring, and climate adaptation strategies.
                </p>
                <div className="description-features">
                  <span><i className="fas fa-satellite"></i> Satellite Imagery</span>
                  <span><i className="fas fa-chart-area"></i> Real-time Analytics</span>
                  <span><i className="fas fa-map-marked-alt"></i> Geospatial Data</span>
                </div>
              </motion.div>

              {/* Credits Section */}
              <motion.div className="about-credits" variants={itemVariants}>
                <motion.h2 
                  className="credits-title"
                  animate={shimmerAnimation}
                >
                  <i className="fas fa-users"></i>
                  Credits
                </motion.h2>

                <div className="credits-grid">
                  {credits.map((credit, index) => (
                    <motion.div
                      key={index}
                      className="credit-card"
                      variants={itemVariants}
                      whileHover={{ 
                        scale: 1.05, 
                        rotateY: 5,
                        boxShadow: '0 20px 40px rgba(0, 229, 255, 0.3)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <motion.div 
                        className="credit-icon"
                        style={{ background: `linear-gradient(135deg, ${credit.color}, ${credit.color}88)` }}
                        animate={{
                          boxShadow: [
                            `0 0 20px ${credit.color}44`,
                            `0 0 40px ${credit.color}66`,
                            `0 0 20px ${credit.color}44`,
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <i className={`fas ${credit.icon}`}></i>
                      </motion.div>
                      <div className="credit-info">
                        <span className="credit-role">{credit.role}</span>
                        <motion.h3 
                          className="credit-name"
                          initial={{ backgroundPosition: '0% 50%' }}
                          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                          transition={{ duration: 5, repeat: Infinity }}
                        >
                          {credit.name}
                        </motion.h3>
                        <span className="credit-title">{credit.title}</span>
                      </div>
                      <motion.div 
                        className="credit-glow"
                        style={{ background: credit.color }}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Mini Game Section */}
              <motion.div className="about-game-section" variants={itemVariants}>
                <WaterDropGame />
              </motion.div>

              {/* Footer */}
              <motion.div className="about-footer" variants={itemVariants}>
                <motion.div 
                  className="footer-badge"
                  whileHover={{ scale: 1.1 }}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(0, 229, 255, 0.3)',
                      '0 0 40px rgba(0, 229, 255, 0.5)',
                      '0 0 20px rgba(0, 229, 255, 0.3)',
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <img src="/media/ndma_logo.png" alt="NDMA" className="footer-logo" />
                  <span>NDMA Pakistan</span>
                </motion.div>
                <p className="footer-text">
                  © 2026 National Disaster Management Authority
                </p>
                <motion.div 
                  className="footer-version"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Version 2.0.0
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default About;
