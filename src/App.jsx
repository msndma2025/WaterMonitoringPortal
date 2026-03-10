import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import SlidesManager from './pages/SlidesManager';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />} />
        <Route path="/slides" element={<SlidesManager />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
