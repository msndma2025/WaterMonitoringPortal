import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GALLERY_IMAGES } from '../../config/mapConfig';
import './GalleryCard.css';

const GalleryCard = () => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const openLightbox = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => 
      prev === 0 ? GALLERY_IMAGES.length - 1 : prev - 1
    );
  }, []);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => 
      prev === GALLERY_IMAGES.length - 1 ? 0 : prev + 1
    );
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  }, [closeLightbox, goToPrevious, goToNext]);

  return (
    <>
      <div className="media-card gallery-card">
        <div className="media-card-content">
          <div 
            className="gallery-thumbnail"
            onClick={() => openLightbox(0)}
            role="button"
            tabIndex={0}
            aria-label="Open image gallery"
          >
            <img 
              src={GALLERY_IMAGES[0]} 
              alt="Water monitoring visualization"
              loading="lazy"
            />
            <div className="gallery-overlay">
              <i className="fas fa-images"></i>
              <span>{GALLERY_IMAGES.length} images</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div 
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
            aria-modal="true"
            aria-label="Image gallery"
          >
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button 
                className="lightbox-close" 
                onClick={closeLightbox}
                aria-label="Close gallery"
              >
                <i className="fas fa-times"></i>
              </button>

              <button 
                className="lightbox-nav lightbox-prev" 
                onClick={goToPrevious}
                aria-label="Previous image"
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              <motion.img
                key={selectedIndex}
                src={GALLERY_IMAGES[selectedIndex]}
                alt={`Gallery image ${selectedIndex + 1}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              />

              <button 
                className="lightbox-nav lightbox-next" 
                onClick={goToNext}
                aria-label="Next image"
              >
                <i className="fas fa-chevron-right"></i>
              </button>

              <div className="lightbox-counter">
                {selectedIndex + 1} / {GALLERY_IMAGES.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GalleryCard;
