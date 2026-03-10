import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SlidesGallery.css';

// API uses proxy - no need for absolute URL

// Default slides for fallback
const defaultSlides = [
  {
    id: '1',
    title: 'Tarbela Dam Reservoir',
    description: 'Live water level monitoring from satellite imagery',
    url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&q=80',
    type: 'image',
    category: 'Dams'
  },
  {
    id: '2',
    title: 'Indus River Basin',
    description: 'Seasonal flow analysis across the basin',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    type: 'image',
    category: 'Rivers'
  },
  {
    id: '3',
    title: 'Snow Cover Analysis',
    description: 'Winter snow accumulation in northern regions',
    url: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=80',
    type: 'image',
    category: 'Snow'
  },
  {
    id: '4',
    title: 'Flood Extent Mapping',
    description: 'Real-time flood monitoring in affected areas',
    url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80',
    type: 'image',
    category: 'Floods'
  },
  {
    id: '5',
    title: 'Evapotranspiration Data',
    description: 'Agricultural water loss monitoring',
    url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80',
    type: 'image',
    category: 'Agriculture'
  },
  {
    id: '6',
    title: 'Coastal Zone Monitoring',
    description: 'Sea level and coastal erosion tracking',
    url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&q=80',
    type: 'image',
    category: 'Coastal'
  }
];

const SlidesGallery = ({ autoPlay = true, interval = 30000 }) => {
  const [slides, setSlides] = useState(defaultSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const galleryRef = useRef(null);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  // Fetch slides from API
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch('/api/slides');
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            // Sort by order and map url for uploaded files
            const sortedSlides = data
              .sort((a, b) => a.order - b.order)
              .map(slide => ({
                ...slide,
                url: slide.url?.startsWith('/uploads') 
                  ? slide.url 
                  : slide.url
              }));
            setSlides(sortedSlides);
          }
        }
      } catch (error) {
        console.log('Using default slides (API not available)');
      } finally {
        setLoading(false);
      }
    };
    fetchSlides();
  }, []);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  };

  const paginate = useCallback((newDirection) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = slides.length - 1;
      if (next >= slides.length) next = 0;
      return next;
    });
  }, [slides.length]);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        paginate(1);
      }, interval);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, interval, paginate]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      galleryRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const currentSlide = slides[currentIndex];

  return (
    <div className={`slides-gallery ${isFullscreen ? 'fullscreen' : ''}`} ref={galleryRef}>
      <div className="gallery-header">
        <div className="gallery-title-section">
          <h3>
            <i className="fas fa-images" />
            Slides Gallery
          </h3>
          <span className="slide-counter">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="gallery-controls">
          <button 
            className={`control-btn ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
          </button>
          <button 
            className="control-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`} />
          </button>
        </div>
      </div>

      <div className="gallery-viewport">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 }
            }}
            className="slide-item"
          >
            <div className="slide-image-wrapper">
              {/* Render based on slide type */}
              {currentSlide.type === 'video' ? (
                <video 
                  ref={videoRef}
                  src={currentSlide.url} 
                  controls
                  autoPlay={isPlaying}
                  muted
                  loop
                  className="slide-video"
                />
              ) : currentSlide.type === 'ppt' || currentSlide.type === 'pdf' ? (
                <div className="slide-document">
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentSlide.url)}&embedded=true`}
                    title={currentSlide.title}
                    className="document-viewer"
                  />
                  <a 
                    href={currentSlide.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="download-link"
                  >
                    <i className="fas fa-download" /> Download {currentSlide.type.toUpperCase()}
                  </a>
                </div>
              ) : (
                <img 
                  src={currentSlide.url} 
                  alt={currentSlide.title}
                  loading="lazy"
                />
              )}
              <div className="slide-overlay">
                <motion.span 
                  className="slide-category"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentSlide.category || currentSlide.type}
                </motion.span>
                <motion.h4
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {currentSlide.title}
                </motion.h4>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {currentSlide.description}
                </motion.p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button 
          className="nav-btn nav-prev"
          onClick={() => paginate(-1)}
          aria-label="Previous slide"
        >
          <i className="fas fa-chevron-left" />
        </button>
        <button 
          className="nav-btn nav-next"
          onClick={() => paginate(1)}
          aria-label="Next slide"
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>

      <div className="gallery-thumbnails">
        {slides.map((slide, index) => (
          <motion.button
            key={slide.id}
            className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {slide.type === 'video' ? (
              <div className="thumbnail-video">
                <i className="fas fa-play-circle" />
              </div>
            ) : slide.type === 'ppt' || slide.type === 'pdf' ? (
              <div className="thumbnail-document">
                <i className={`fas fa-file-${slide.type === 'ppt' ? 'powerpoint' : 'pdf'}`} />
              </div>
            ) : (
              <img src={slide.url} alt={slide.title} loading="lazy" />
            )}
            <div className="thumbnail-overlay" />
          </motion.button>
        ))}
      </div>

      <div className="progress-bar">
        <motion.div 
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: isPlaying ? '100%' : `${((currentIndex + 1) / slides.length) * 100}%` }}
          transition={isPlaying ? { duration: interval / 1000, ease: 'linear' } : { duration: 0.3 }}
          key={isPlaying ? currentIndex : 'static'}
        />
      </div>
    </div>
  );
};

export default SlidesGallery;
