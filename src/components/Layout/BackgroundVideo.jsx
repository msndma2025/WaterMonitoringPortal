import { useState, useRef, useEffect } from 'react';
import './BackgroundVideo.css';

const BackgroundVideo = () => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false); // Disabled by default for performance
  const videoRef = useRef(null);

  useEffect(() => {
    // Only load video if enabled and after a delay
    if (videoEnabled && videoRef.current) {
      const timer = setTimeout(() => {
        videoRef.current.load();
        setVideoLoaded(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [videoEnabled]);

  return (
    <>
      {/* Static background image - always shown for performance */}
      <div 
        className="background-image"
        style={{
          backgroundImage: 'url(/media/Background_Video-poster.jpg)',
          display: videoLoaded ? 'none' : 'block'
        }}
      />
      
      {/* Video only loads if enabled */}
      {videoEnabled && (
        <video 
          ref={videoRef}
          className="background-video"
          autoPlay 
          muted 
          loop 
          playsInline
          poster="/media/Background_Video-poster.jpg"
          style={{ display: videoLoaded ? 'block' : 'none' }}
          onCanPlay={() => setVideoLoaded(true)}
        >
          <source src="/media/background_video.mp4" type="video/mp4" />
        </video>
      )}
      
      <div className="background-overlay" aria-hidden="true" />
    </>
  );
};

export default BackgroundVideo;
