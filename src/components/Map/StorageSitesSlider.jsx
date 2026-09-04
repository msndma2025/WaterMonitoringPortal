import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './StorageSitesSlider.css';

// Potential-storage site maps, keyed by the number of sites shown. Files live in
// public/storagevsaval/ and line up with the "9 / 18 / 27 … Basins" boxes drawn
// over the 2026–2031 columns of the storage chart.
const SITE_IMAGES = [
  { sites: 9, src: '/storagevsaval/9sites.png' },
  { sites: 18, src: '/storagevsaval/18sites.png' },
  { sites: 27, src: '/storagevsaval/27sites.png' },
  { sites: 36, src: '/storagevsaval/36sites.png' },
  { sites: 45, src: '/storagevsaval/45sites.png' },
];

// Inline carousel that sits in the empty area above the 2026–2031 bars. Clicking
// the image (or the expand button) maximizes it into a full-screen lightbox;
// the lightbox has minimize/close controls plus prev/next.
export default function StorageSitesSlider() {
  const [idx, setIdx] = useState(0);
  const [maxOpen, setMaxOpen] = useState(false);
  const n = SITE_IMAGES.length;
  const cur = SITE_IMAGES[idx];
  const go = (d) => setIdx((i) => (i + d + n) % n);

  // Keyboard control while the lightbox is open.
  useEffect(() => {
    if (!maxOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMaxOpen(false);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxOpen]);

  return (
    // Minimized view: the image fills the whole box (no heading); controls are
    // overlaid on top. Stop pointerdown from reaching the chart/modal drag
    // handlers underneath.
    <div className="ssl" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="ssl-img-btn" onClick={() => setMaxOpen(true)} title="Click to maximize">
        <img src={cur.src} alt={`${cur.sites} potential storage basins`} draggable="false" />
        <span className="ssl-expand" aria-hidden="true"><i className="fas fa-expand" /></span>
      </button>

      <button type="button" className="ssl-nav ssl-prev" onClick={() => go(-1)} aria-label="Previous image">
        <i className="fas fa-chevron-left" />
      </button>
      <button type="button" className="ssl-nav ssl-next" onClick={() => go(1)} aria-label="Next image">
        <i className="fas fa-chevron-right" />
      </button>

      <div className="ssl-foot">
        <span className="ssl-caption">{cur.sites} Basins</span>
        <div className="ssl-dots">
          {SITE_IMAGES.map((s, i) => (
            <button
              key={s.sites}
              type="button"
              className={`ssl-dot${i === idx ? ' is-active' : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`Show ${s.sites} basins`}
            />
          ))}
        </div>
      </div>

      {maxOpen &&
        createPortal(
          <div className="ssl-lightbox" onClick={() => setMaxOpen(false)}>
            <div className="ssl-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <div className="ssl-lb-bar">
                <span className="ssl-lb-title">{cur.sites} Potential Storage Basins</span>
                <div className="ssl-lb-btns">
                  <button type="button" onClick={() => go(-1)} title="Previous">
                    <i className="fas fa-chevron-left" />
                  </button>
                  <button type="button" onClick={() => go(1)} title="Next">
                    <i className="fas fa-chevron-right" />
                  </button>
                  <button type="button" onClick={() => setMaxOpen(false)} title="Minimize">
                    <i className="fas fa-compress" />
                  </button>
                  <button type="button" onClick={() => setMaxOpen(false)} title="Close">
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
              <div className="ssl-lb-imgwrap">
                <button type="button" className="ssl-lb-nav ssl-lb-prev" onClick={() => go(-1)} aria-label="Previous image">
                  <i className="fas fa-chevron-left" />
                </button>
                <img src={cur.src} alt={`${cur.sites} potential storage basins`} draggable="false" />
                <button type="button" className="ssl-lb-nav ssl-lb-next" onClick={() => go(1)} aria-label="Next image">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
              <div className="ssl-lb-dots">
                {SITE_IMAGES.map((s, i) => (
                  <button
                    key={s.sites}
                    type="button"
                    className={`ssl-dot${i === idx ? ' is-active' : ''}`}
                    onClick={() => setIdx(i)}
                    aria-label={`Show ${s.sites} basins`}
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
