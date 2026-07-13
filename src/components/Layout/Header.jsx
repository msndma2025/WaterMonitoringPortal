import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = ({ onMenuToggle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Left: Menu + Logo */}
        <div className="header-left">
          <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle Menu">
            <i className="fas fa-bars"></i>
          </button>

          <div className="header-logo" onClick={() => window.location.reload()} title="Refresh">
            <img
              src="/media/ndma_logo.png"
              alt="NDMA"
              className="org-logo"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="logo-fallback">
              <i className="fas fa-water"></i>
            </div>
          </div>
        </div>

        {/* Center: Title */}
        <div className="header-center">
          <h1 className="header-title">National Water Equation</h1>
        </div>

        {/* Right: Actions */}
        <div className="header-right">
          <Link to="/slides" className="header-btn">
            <i className="fas fa-images"></i>
          </Link>

          <div className="header-time">
            <span className="time-val">{formatTime(currentTime)}</span>
            <span className="time-date">{formatDate(currentTime)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
