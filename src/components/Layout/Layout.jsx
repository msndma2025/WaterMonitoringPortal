import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import MapContainer from '../Map/MapContainer';
import ChartsPanel from '../MediaPanel/ChartsPanel';
import RightPanel from '../MediaPanel/RightPanel';
import NewsTicker from './NewsTicker';
import BackgroundVideo from './BackgroundVideo';
import './Layout.css';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <BackgroundVideo />
      
      <div className="dashboard">
        <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="main-content">
          <div className="content-grid">
            <div className="main-left">
              <div className="map-section">
                <MapContainer />
              </div>
              
              <div className="charts-section">
                <ChartsPanel />
              </div>
            </div>
            
            <aside className="media-section">
              <RightPanel />
            </aside>
          </div>
        </main>

        <AnimatePresence>
          {isSidebarOpen && (
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={() => setIsSidebarOpen(false)} 
            />
          )}
        </AnimatePresence>
      </div>

      <NewsTicker />
    </div>
  );
};

export default Layout;
