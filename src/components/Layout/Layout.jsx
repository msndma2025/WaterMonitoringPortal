import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import MapContainer from '../Map/MapContainer';
import ChartsPanel from '../MediaPanel/ChartsPanel';
import RightPanel from '../MediaPanel/RightPanel';
import NewsTicker from './NewsTicker';
import BackgroundVideo from './BackgroundVideo';
import MapFullscreenPanels from '../Map/MapFullscreenPanels';
import { useMapStore } from '../../store/mapStore';
import './Layout.css';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { mapFullscreen } = useMapStore();

  return (
    <div className="app-layout">
      <BackgroundVideo />
      
      <div className="dashboard">
        <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="main-content">
          <div className="content-grid">
            <div className="main-left">
              <div className={`map-section${mapFullscreen ? ' map-fullscreen' : ''}`}>
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
      <MapFullscreenPanels />
    </div>
  );
};

export default Layout;
