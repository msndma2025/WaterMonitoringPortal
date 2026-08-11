import { useMapStore } from '../../store/mapStore';
import './FontSizeControl.css';

// Small A- / value / A+ control that adjusts a shared font scale.
// variant "table" (default) drives the data-table modals; "sidebar" drives the sidebar.
const FontSizeControl = ({ variant = 'table' }) => {
  const store = useMapStore();
  const isSidebar = variant === 'sidebar';

  const scale = isSidebar ? store.sidebarFontScale : store.tableFontScale;
  const bump = isSidebar ? store.bumpSidebarFontScale : store.bumpTableFontScale;
  const reset = () => (isSidebar ? store.setSidebarFontScale(1.1) : store.setTableFontScale(1.15));
  const max = isSidebar ? 1.8 : 3;

  const pct = Math.round(scale * 100);

  return (
    <div className="fsc" onPointerDown={(e) => e.stopPropagation()}>
      <button className="fsc-btn" onClick={() => bump(-0.1)} disabled={scale <= 0.8} title="Smaller text">
        <i className="fas fa-minus" />
      </button>
      <button className="fsc-val" onClick={reset} title="Reset text size">
        <i className="fas fa-font" /> {pct}%
      </button>
      <button className="fsc-btn" onClick={() => bump(0.1)} disabled={scale >= max} title="Larger text">
        <i className="fas fa-plus" />
      </button>
    </div>
  );
};

export default FontSizeControl;
