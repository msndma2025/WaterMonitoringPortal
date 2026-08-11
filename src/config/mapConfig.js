// Map Configuration
export const MAP_CONFIG = {
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
  defaultCenter: [68.71, 30.0], // Pakistan center
  defaultZoom: 4.5,
  minZoom: 3,
  maxZoom: 18,
  styles: {
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11',
    streets: 'mapbox://styles/mapbox/streets-v12',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    navigation: 'mapbox://styles/mapbox/navigation-night-v1',
  },
  defaultStyle: 'streets',
};

// GeoServer Configuration
export const GEOSERVER_CONFIG = {
  baseUrl: '/geoserver',
  waterMonitoring: '/geoserver/water_monitoring',
  waterPortalWS: '/geoserver/WaterPortal_WS',
  pakBoundaries: 'http://172.18.1.4:8080/geoserver',
  coastal: 'http://172.18.1.151:8080/geoserver/Costal',
};

// Build WMS URL helper
export const buildWmsUrl = (workspace, layerName) => {
  return `${GEOSERVER_CONFIG.baseUrl}/${workspace}/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${workspace}:${layerName}&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}`;
};

// Build WFS URL helper
export const buildWfsUrl = (workspace, layerName, includeSrs = true) => {
  const base = `${GEOSERVER_CONFIG.baseUrl}/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:${layerName}&outputFormat=application/json`;
  return includeSrs ? `${base}&srsName=EPSG:4326` : base;
};

// Boundary Layer Configurations - Using Vector Tiles (TMS/PBF)
export const BOUNDARY_LAYERS = {
  national: {
    id: 'national',
    sourceId: 'nationalBoundary',
    tileUrl: 'http://172.18.1.4:8080/geoserver/gwc/service/tms/1.0.0/abdul_sattar:National_Boundary@EPSG:900913@pbf/{z}/{x}/{y}.pbf',
    sourceLayer: 'National_Boundary',
    type: 'line',
    paint: {
      'line-color': '#38bdf8',
      'line-width': 3,
      'line-opacity': 1,
    },
  },
  provincial: {
    id: 'provincial',
    sourceId: 'provincialBoundary',
    tileUrl: 'http://172.18.1.4:8080/geoserver/gwc/service/tms/1.0.0/abdul_sattar:Provincial_Boundary@EPSG:900913@pbf/{z}/{x}/{y}.pbf',
    sourceLayer: 'Provincial_Boundary',
    type: 'line',
    paint: {
      'line-color': '#60a5fa',
      'line-width': 2,
      'line-opacity': 0.9,
    },
  },
  district: {
    id: 'district',
    sourceId: 'districtBoundary',
    tileUrl: 'http://172.18.1.4:8080/geoserver/gwc/service/tms/1.0.0/abdul_sattar:District_Boundary@EPSG:900913@pbf/{z}/{x}/{y}.pbf',
    sourceLayer: 'District_Boundary',
    type: 'line',
    paint: {
      'line-color': '#818cf8',
      'line-width': 1,
      'line-opacity': 0.7,
    },
  },
  tehsil: {
    id: 'tehsil',
    sourceId: 'tehsilBoundary',
    tileUrl: 'http://172.18.1.4:8080/geoserver/gwc/service/tms/1.0.0/abdul_sattar:Tehsil_Boundary@EPSG:900913@pbf/{z}/{x}/{y}.pbf',
    sourceLayer: 'Tehsil_Boundary',
    type: 'fill',
    paint: {
      'fill-color': '#6366f1',
      'fill-opacity': 0.12,
    },
  },
};

// Dam Icons
export const DAM_ICONS = {
  ongoing: 'https://i.postimg.cc/15KHvk2h/hydroelectric.png',
  underConstruction: 'https://i.postimg.cc/yYnc2XSh/dam.png',
  future: 'https://i.postimg.cc/SQWG14K9/hydropower.png',
  headworks: 'https://i.postimg.cc/sX6wZs1P/water.png',
  indian: 'https://i.postimg.cc/yYnc2XSh/dam.png',
  riverNames: '/media/sea.png',
};

// Layer Configurations
export const LAYER_GROUPS = {
  boundaries: {
    label: 'Boundaries',
    icon: 'fa-map-marked-alt',
    layers: [
      { id: 'national', label: 'National Boundary', defaultVisible: false },
      { id: 'provincial', label: 'Provincial Boundary', defaultVisible: true },
      { id: 'district', label: 'District Boundary', defaultVisible: false },
      { id: 'tehsil', label: 'Tehsil Boundary', defaultVisible: false },
    ],
  },
  rivers: {
    label: 'River Systems',
    icon: 'fa-water',
    layers: [
      { id: 'rivers', label: 'Major Rivers', defaultVisible: false },
      { id: 'riverTributaries', label: 'River Tributaries', defaultVisible: false },
      { id: 'riverBasins', label: 'Catchment Basins', defaultVisible: false },
      { id: 'subBasins', label: 'Sub-Basins', defaultVisible: false },
    ],
  },
  dams: {
    label: 'Dam Infrastructure',
    icon: 'fa-water',
    layers: [
      { id: 'headworks', label: 'Head Works', defaultVisible: false },
      { id: 'ongoingDams', label: 'Ongoing Dams', defaultVisible: false },
      { id: 'underConstruction', label: 'Under Construction', defaultVisible: false },
      { id: 'futureDams', label: 'Future Dams', defaultVisible: false },
      { id: 'indianDams', label: 'Indian Dams', defaultVisible: false },
      { id: 'wapdaProposed', label: 'Wapda Proposed', defaultVisible: false },
      { id: 'damLevels', label: 'Dam Levels', defaultVisible: false },
    ],
  },
  waterVariables: {
    label: 'Water Variables',
    icon: 'fa-layer-group',
    layers: [
      { id: 'snowCover', label: 'Snow Cover', defaultVisible: false, hasTimeSeries: true },
      { id: 'evapotranspiration', label: 'Evapotranspiration', defaultVisible: false, hasTimeSeries: true },
      { id: 'precipitation', label: 'Precipitation', defaultVisible: false, hasTimeSeries: true },
      { id: 'temperature', label: 'Temperature', defaultVisible: false, hasTimeSeries: true },
      { id: 'groundwater', label: 'Ground Water', defaultVisible: false, isLink: true, href: 'https://lookerstudio.google.com/u/0/reporting/77819a68-5bd9-40bd-89b8-34d3ed6d410d/page/p_gglvdfgjsd' },
      { id: 'hillTorrents', label: 'Hill Torrents', defaultVisible: false },
      { id: 'seaSurface', label: 'Sea Surface Temperature', defaultVisible: false },
      { id: 'floodExtent', label: 'Flood Extend 2025', defaultVisible: false },
      { id: 'baselineKarachi', label: 'Baseline Karachi', defaultVisible: false },
      { id: 'shorelines', label: 'Shorelines', defaultVisible: false },
      { id: 'transectsKarachi', label: 'Transects Karachi', defaultVisible: false },
    ],
  },
  monsoonBasins: {
    label: 'Monsoon Basins',
    icon: 'fa-cloud-showers-heavy',
    layers: [
      { id: 'monsoonBasin', label: 'Monsoon Basin', defaultVisible: false },
      { id: 'monsoonBasin2', label: 'Accumulation Points', defaultVisible: false },
      { id: 'siteLocations', label: 'Site Locations', defaultVisible: false },
      { id: 'prioritySites', label: 'Priority Site Locations', defaultVisible: false },
      { id: 'glacialBasins', label: 'Glacial Basins', defaultVisible: false },
    ],
  },
  irrigation: {
    label: 'Irrigation',
    icon: 'fa-tint',
    layers: [
      { id: 'mainCanals', label: 'Main Canals', defaultVisible: false },
      { id: 'branchCanals', label: 'Branch Canals', defaultVisible: false },
      { id: 'distributaryCanals', label: 'Distributary Canals', defaultVisible: false },
    ],
  },
  industries: {
    label: 'Industries',
    icon: 'fa-industry',
    layers: [
      { id: 'industries', label: 'All Industries', defaultVisible: false },
    ],
  },
  projections: {
    label: 'Projections',
    icon: 'fa-chart-line',
    layers: [
      { id: 'agriculture', label: 'Agriculture Use', defaultVisible: false },
      { id: 'industrial', label: 'Industrial & Domestic', defaultVisible: false },
    ],
  },
};

// Industry sector grouping & colors (Sectoral_C → broad category)
export const INDUSTRY_SECTORS = {
  'Textile': { color: '#FF6B6B', match: ['TEXTILE', 'WOOLEN', 'SYNTHETIC', 'COTTON', 'JUTE', 'CARPETS', 'PRESSING'] },
  'Food & Beverage': { color: '#4ECB71', match: ['FOOD', 'BEVERAGES', 'COOKING OIL', 'VEGETABLE GHEE', 'VANASPATI', 'SUGAR', 'TOBACCO'] },
  'Chemical & Pharma': { color: '#45B7D1', match: ['CHEMICAL', 'PHARMACEUTICAL', 'Chemicals'] },
  'Energy & Fuel': { color: '#FFA94D', match: ['POWER', 'FUEL', 'OIL AND GAS', 'OIL REFINERY', 'PETROLEUM', 'COAL', 'THERMAL', 'HYDEL', 'ALTERNATE ENERGY'] },
  'Engineering & Metal': { color: '#CC5DE8', match: ['ENGINEERING', 'STEEL', 'HARDWARE', 'Fabricated Metal', 'MINERAL', 'MINING', 'MARBLE'] },
  'Auto & Transport': { color: '#20C997', match: ['AUTO', 'AUTOMOBILE', 'Motor Vehicle', 'Other Transport'] },
  'Construction': { color: '#F59F00', match: ['CEMENT', 'BUILDING', 'GLASS', 'CERAMICS', 'Other Non-metallic'] },
  'Electronics & Electrical': { color: '#339AF0', match: ['ELECTRICAL', 'CABLES', 'Electronics', 'Electrical Machinery', 'Medical'] },
  'Agriculture': { color: '#8BC34A', match: ['AGRICULTURAL', 'CORPORATE AGRICULTURAL', 'LIVESTOCK', 'FISH', 'POULTRY', 'SEED'] },
  'Other': { color: '#ADB5BD', match: [] },
};

// ET Style names (must match GeoServer style names)
export const ET_STYLES = {
  2021: 'ET_2021',
  2022: 'ET_2022',
  2023: 'ET_2023',
  2024: 'Annual_ET_2024_Pakistan',
};

// Time Series Options
export const TIME_SERIES = {
  evapotranspiration: [2021, 2022, 2023, 2024],
  snowCover: [2005, 2010, 2015, 2020, 2025],
  precipitation: [
    { id: '2000-2005', layer: 'rainfall_2000_2005', label: '2000-2005' },
    { id: '2006-2010', layer: 'rainfall_2006_2010', label: '2006-2010' },
    { id: '2011-2015', layer: 'rainfall_2011_2015', label: '2011-2015' },
    { id: '2016-2020', layer: 'rainfall_2016_2020', label: '2016-2020' },
    { id: '2021-2025', layer: 'rainfall_2021_2025', label: '2021-2025' },
  ],
  temperature: [
    { id: 'jan', label: 'January' },
    { id: 'feb', label: 'February' },
    { id: 'mar', label: 'March' },
    { id: 'apr', label: 'April' },
    { id: 'may', label: 'May' },
    { id: 'jun', label: 'June' },
    { id: 'jul', label: 'July' },
    { id: 'aug', label: 'August' },
    { id: 'sep', label: 'September' },
    { id: 'oct', label: 'October' },
    { id: 'nov', label: 'November' },
    { id: 'dec', label: 'December' },
  ],
};

// River Configurations (WFS Vector)
export const RIVERS_CONFIG = [
  { id: 'indus', layerName: 'Indus', color: '#0066CC', name: 'Indus' },
  { id: 'jhelum', layerName: 'Jhelum', color: '#00CC66', name: 'Jhelum' },
  { id: 'chenab', layerName: 'Chenab', color: '#CC0066', name: 'Chenab' },
  { id: 'ravi', layerName: 'Ravi', color: '#CC6600', name: 'Ravi' },
  { id: 'sutlaj', layerName: 'Sutlej', color: '#6600CC', name: 'Sutlaj' },
];

// Coastal Layers Configuration
export const COASTAL_LAYERS = {
  transectsKarachi: {
    id: 'transectsKarachi',
    sourceId: 'Transects_Karachi',
    type: 'wms',
    url: 'http://172.18.1.151:8080/geoserver/Costal/wms?service=WMS&version=1.1.0&request=GetMap&layers=Costal:Transects_Karachi&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true',
  },
  baselineKarachi: {
    id: 'baselineKarachi',
    sourceId: 'baseline_karachi',
    type: 'wms',
    url: 'http://172.18.1.151:8080/geoserver/Costal/wms?service=WMS&version=1.1.0&request=GetMap&layers=Costal:basline_karachi&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true',
  },
  shorelines: {
    id: 'shorelines',
    sourceId: 'shorelines',
    type: 'vector',
    url: 'http://172.18.1.151:8080/geoserver/gwc/service/tms/1.0.0/Costal:shorelines@EPSG:900913@pbf/{z}/{x}/{y}.pbf',
    sourceLayer: 'shorelines',
    paint: {
      'line-opacity': 0.9,
      'line-color': '#0066FF',
      'line-width': 2,
    },
  },
};

// WFS Layers Configuration
export const WFS_LAYERS = {
  headworks: {
    id: 'headworks',
    sourceId: 'headworks-source',
    layerId: 'headworks-layer',
    workspace: 'water_monitoring',
    layerName: 'headworks',
    type: 'symbol',
    iconImage: 'headworks-icon',
    nameField: 'Name2',
    textColor: '#00CED1',
  },
  rivers: {
    id: 'rivers',
    sourceId: 'rivers-source',
    layerId: 'rivers-layer',
    workspace: 'water_monitoring',
    layerName: 'rivers',
    type: 'line',
    paint: {
      'line-color': '#0066FF',
      'line-width': 3,
      'line-opacity': 0.9,
    },
  },
  floodExtent: {
    id: 'floodExtent',
    sourceId: 'floodextend-source',
    layerId: 'floodextend-layer',
    workspace: 'water_monitoring',
    layerName: 'Flood_Extent',
    type: 'fill',
    paint: {
      'fill-color': '#ff0000',
      'fill-opacity': 0.45,
    },
    outlinePaint: {
      'line-color': '#990000',
      'line-width': 2,
    },
  },
  irrigation: {
    id: 'irrigation',
    sourceId: 'irrigation-source',
    layerId: 'irrigation-layer',
    workspace: 'water_monitoring',
    layerName: 'Irrigation',
    type: 'line',
    paint: {
      'line-width': 3,
      'line-opacity': 1,
    },
    colorExpression: [
      'match',
      ['get', 'TYPE'],
      'Branch Canal', '#FF0000',
      'Distributary Canal', '#0066FF',
      'Main Canal', '#00CC00',
      '#0066FF'
    ],
  },
};

// River Basin Colors
export const BASIN_COLORS = {
  'Chenab': '#3399FF',
  'Indus': '#FF9933',
  'Jhelum': '#66CC66',
  'Ravi': '#FF66B2',
  'Sutlej': '#9933CC',
};

// Media Gallery Images
export const GALLERY_IMAGES = [
  '/media/1.png',
  '/media/2.png',
  '/media/4.png',
  '/media/5.png',
  '/media/6.png',
  '/media/7.png',
  '/media/8.png',
  '/media/9.png',
  '/media/10.png',
  '/media/11.png',
  '/media/12.png',
];

// Flourish Chart Configurations
export const CHARTS_CONFIG = [
  { id: 'graph-a', visualizationId: '25889526', label: 'Graph A' },
  { id: 'graph-b', visualizationId: '25907594', label: 'Graph B' },
];

// News Ticker Content
export const NEWS_TICKER_CONTENT = `Pakistan faces water shortages during the Kharif season due to reduced river flows from October to March. Most river discharge occurs during the peak monsoon (July–October), leaving early Kharif (April–May) and late Rabi (February–March) vulnerable to shortages. The approved water shortage for the Rabi 2025 season is 8%, the lowest in the past decade of system operations. Limited surface storage capacity — currently only 13.3% of annual flows — restricts the ability to conserve surplus monsoon water for use during the dry months.`;
