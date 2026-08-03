import { create } from 'zustand';
import { LAYER_GROUPS } from '../config/mapConfig';

// Initialize layer visibility from config
const initializeLayerVisibility = () => {
  const visibility = {};
  const addLayers = (layers) => {
    layers.forEach((layer) => {
      if (layer.isGroup && Array.isArray(layer.layers)) {
        addLayers(layer.layers); // recurse into nested sub-groups
      } else {
        visibility[layer.id] = layer.defaultVisible;
      }
    });
  };
  Object.values(LAYER_GROUPS).forEach((group) => addLayers(group.layers));
  return visibility;
};

export const useMapStore = create((set, get) => ({
  // Map instance reference
  mapRef: null,
  setMapRef: (ref) => set({ mapRef: ref }),

  // Map style
  mapStyle: 'streets',
  setMapStyle: (style) => set({ mapStyle: style }),

  // Layer visibility
  layerVisibility: initializeLayerVisibility(),
  toggleLayer: (layerId) =>
    set((state) => {
      const wasVisible = state.layerVisibility[layerId];
      const newVisibility = { ...state.layerVisibility, [layerId]: !wasVisible };
      let newOrder = [...state.activeLayerOrder];
      if (!wasVisible) {
        // Turning on — add to top of active order
        newOrder = newOrder.filter(id => id !== layerId);
        newOrder.push(layerId);
      } else {
        // Turning off — remove from order
        newOrder = newOrder.filter(id => id !== layerId);
      }
      return { layerVisibility: newVisibility, activeLayerOrder: newOrder };
    }),
  setLayerVisibility: (layerId, visible) =>
    set((state) => {
      let newOrder = [...state.activeLayerOrder];
      if (visible) {
        newOrder = newOrder.filter(id => id !== layerId);
        newOrder.push(layerId);
      } else {
        newOrder = newOrder.filter(id => id !== layerId);
      }
      return {
        layerVisibility: { ...state.layerVisibility, [layerId]: visible },
        activeLayerOrder: newOrder,
      };
    }),

  // Active layer order (bottom to top)
  activeLayerOrder: [],
  reorderLayers: (newOrder) => set({ activeLayerOrder: newOrder }),

  // Expanded control groups
  expandedGroups: {},
  toggleGroup: (groupId) =>
    set((state) => ({
      expandedGroups: {
        ...state.expandedGroups,
        [groupId]: !state.expandedGroups[groupId],
      },
    })),

  // Sidebar visibility
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Selected dam for comparison
  selectedDams: new Map(),
  addDamToComparison: (name, storage) =>
    set((state) => {
      const newDams = new Map(state.selectedDams);
      if (!newDams.has(name)) {
        newDams.set(name, storage);
      }
      return { selectedDams: newDams };
    }),
  removeDamFromComparison: (name) =>
    set((state) => {
      const newDams = new Map(state.selectedDams);
      newDams.delete(name);
      return { selectedDams: newDams };
    }),
  clearDamComparison: () => set({ selectedDams: new Map() }),

  // Active popup
  activePopup: null,
  setActivePopup: (popup) => set({ activePopup: popup }),
  closePopup: () => set({ activePopup: null }),

  // Time series selections
  timeSeriesSelections: {
    evapotranspiration: 2024,
    snowCover: 2025,
    precipitation: '2021-2025',
    temperature: 'jan',
  },
  setTimeSeriesSelection: (type, value) =>
    set((state) => ({
      timeSeriesSelections: {
        ...state.timeSeriesSelections,
        [type]: value,
      },
    })),

  // Catchment Inflows modal
  showInflowsModal: false,
  setShowInflowsModal: (v) => set({ showInflowsModal: v }),

  // Losses modal
  showLossesModal: false,
  setShowLossesModal: (v) => set({ showLossesModal: v }),

  // Water Inflows 2025-2026 modal
  showInflowsCompModal: false,
  setShowInflowsCompModal: (v) => set({ showInflowsCompModal: v }),

  // Projections 2027-2030 modal
  showProjectionsModal: false,
  setShowProjectionsModal: (v) => set({ showProjectionsModal: v }),

  // Monthly Inflows 2025-2027 modal
  showMonthlyInflowsModal: false,
  setShowMonthlyInflowsModal: (v) => set({ showMonthlyInflowsModal: v }),

  // Industrial & Domestic Availability modal
  showIndDomModal: false,
  setShowIndDomModal: (v) => set({ showIndDomModal: v }),

  // Demand vs Availability chart modal (agri + domestic/industrial)
  showAgriModal: false,
  setShowAgriModal: (v) => set({ showAgriModal: v }),

  // Map fullscreen (CSS-based)
  mapFullscreen: false,
  setMapFullscreen: (v) => set({ mapFullscreen: v }),

  // Cinematic map tour (Karachi -> Gilgit)
  isTouring: false,
  setIsTouring: (v) => set({ isTouring: v }),
  tourTrigger: 0,
  triggerTour: () => set((s) => ({ tourTrigger: s.tourTrigger + 1 })),

  // Shared font-size multiplier for the data-table modals (1 = default)
  tableFontScale: 1.15,
  setTableFontScale: (v) => set({ tableFontScale: Math.min(2, Math.max(0.8, v)) }),
  bumpTableFontScale: (delta) =>
    set((state) => ({ tableFontScale: Math.min(2, Math.max(0.8, +(state.tableFontScale + delta).toFixed(2))) })),

  // Font-size multiplier for the sidebar and its layer dropdowns (1 = default)
  sidebarFontScale: 1.1,
  setSidebarFontScale: (v) => set({ sidebarFontScale: Math.min(1.8, Math.max(0.8, v)) }),
  bumpSidebarFontScale: (delta) =>
    set((state) => ({ sidebarFontScale: Math.min(1.8, Math.max(0.8, +(state.sidebarFontScale + delta).toFixed(2))) })),

  // Loading state
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Map bounds/viewport
  viewport: {
    longitude: 69.3451,
    latitude: 30.3753,
    zoom: 4.5,
  },
  setViewport: (viewport) => set({ viewport }),
}));
