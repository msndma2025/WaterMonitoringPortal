// @refresh reset
import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  MAP_CONFIG, 
  GEOSERVER_CONFIG, 
  BOUNDARY_LAYERS,
  DAM_ICONS,
  RIVERS_CONFIG,
  TIME_SERIES,
  ET_STYLES,
  COASTAL_LAYERS,
  BASIN_COLORS,
  LAYER_GROUPS,
  INDUSTRY_SECTORS,
  buildWmsUrl,
  buildWfsUrl
} from '../../config/mapConfig';
import { useMapStore } from '../../store/mapStore';
import { 
  ongoingDamsPakistan, 
  futureDams, 
  underConstructionDams, 
  indianDams 
} from '../../data';
import MapControls from './MapControls';
import StorageComparison from './StorageComparison';
import TimeSeriesController from './TimeSeriesController';
import CatchmentInflowsModal from './CatchmentInflowsModal';
import LossesModal from './LossesModal';
import InflowsCompModal from './InflowsCompModal';
import './MapContainer.css';

// Track loaded layers globally to avoid refetching
const loadedLayersCache = new Set();

// Set access token
mapboxgl.accessToken = MAP_CONFIG.accessToken;

const MapContainer = () => {
  const mapContainerRef = useRef(null);
  const mapWrapperRef = useRef(null);
  const mapRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const { setMapRef, mapStyle, layerVisibility, activeLayerOrder, reorderLayers, setIsLoading } = useMapStore();
  
  // Track current layers to restore after style change
  const activeLayersRef = useRef(new Set());

  // Load image and add to map
  const loadMapImage = useCallback((map, url, name) => {
    return new Promise((resolve, reject) => {
      map.loadImage(url, (err, image) => {
        if (err) {
          console.error(`Failed to load image ${name}:`, err);
          reject(err);
        } else {
          if (!map.hasImage(name)) {
            map.addImage(name, image);
          }
          resolve();
        }
      });
    });
  }, []);

  // Add vector tile boundary layer (TMS/PBF from GeoServer)
  const addBoundaryLayer = useCallback((map, layerConfig) => {
    const { id, sourceId, tileUrl, sourceLayer, type, paint } = layerConfig;
    
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        scheme: 'tms',
        tiles: [tileUrl],
      });
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id: id,
        type: type,
        source: sourceId,
        'source-layer': sourceLayer,
        layout: { visibility: 'none' },
        paint: paint,
      });
      console.log(`Added boundary layer: ${id}`);
    }
  }, []);

  // Setup Dam Layers (local GeoJSON data)
  const setupDamLayers = useCallback(async (map) => {
    const damConfigs = [
      { id: 'ongoingDams', sourceId: 'ongoing-source', layerId: 'ongoing-layer', data: ongoingDamsPakistan, icon: 'ongoing-dam-icon', iconUrl: DAM_ICONS.ongoing, nameField: 'name', color: '#FF8C00' },
      { id: 'underConstruction', sourceId: 'underconstruction-source', layerId: 'underconstruction-layer', data: underConstructionDams, icon: 'under-dam-icon', iconUrl: DAM_ICONS.underConstruction, nameField: 'name', color: '#FFFFFF', bold: true },
      { id: 'futureDams', sourceId: 'future-source', layerId: 'future-layer', data: futureDams, icon: 'future-dam-icon', iconUrl: DAM_ICONS.future, nameField: 'name', color: '#1E90FF' },
      { id: 'indianDams', sourceId: 'indian-source', layerId: 'indian-layer', data: indianDams, icon: 'indian-dam-icon', iconUrl: DAM_ICONS.indian, nameField: 'name', color: '#1E90FF', bold: true },
    ];

    // Load all icons first
    await Promise.all(damConfigs.map(config => 
      loadMapImage(map, config.iconUrl, config.icon).catch(() => {})
    ));

    // Add sources and layers
    damConfigs.forEach(config => {
      if (!map.getSource(config.sourceId)) {
        map.addSource(config.sourceId, {
          type: 'geojson',
          data: config.data,
        });
      }

      if (!map.getLayer(config.layerId)) {
        const layout = {
          'icon-image': config.icon,
          'icon-size': 0.04,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['get', config.nameField],
          'text-offset': [0, 1.5],
          'text-size': config.bold ? 12 : 11,
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'visibility': 'none',
        };

        if (config.bold) {
          layout['text-font'] = ['Open Sans Bold', 'Arial Unicode MS Bold'];
        }

        map.addLayer({
          id: config.layerId,
          type: 'symbol',
          source: config.sourceId,
          layout,
          paint: {
            'text-color': config.color,
            'text-halo-color': config.outlineColor || '#000000',
            'text-halo-width': config.outlineColor ? 3 : 0.4,
            'text-halo-blur': config.outlineColor ? 1 : 0,
          },
        });
      }
    });

    console.log('✓ Dam layers loaded');
  }, [loadMapImage]);

  // Setup River Basins (fetch from public GeoJSON)
  const setupRiverBasins = useCallback(async (map) => {
    if (!map.getSource('river-basins')) {
      try {
        const resp = await fetch('/Cachments_Basins.geojson');
        if (!resp.ok) throw new Error(`Failed to fetch Cachments_Basins.geojson: ${resp.status}`);
        const geojson = await resp.json();

        map.addSource('river-basins', {
          type: 'geojson',
          data: geojson,
        });

        map.addLayer({
          id: 'river-basins-fill',
          type: 'fill',
          source: 'river-basins',
          layout: { visibility: 'none' },
          paint: {
            'fill-color': [
              'match', ['get', 'name'],
              'Chenab', BASIN_COLORS['Chenab'],
              'Indus', BASIN_COLORS['Indus'],
              'Jhelum', BASIN_COLORS['Jhelum'],
              'Ravi', BASIN_COLORS['Ravi'],
              'Sutlej', BASIN_COLORS['Sutlej'],
              '#CCCCCC'
            ],
            'fill-opacity': 0.7,
          },
        });

        map.addLayer({
          id: 'river-basins-outline',
          type: 'line',
          source: 'river-basins',
          layout: { visibility: 'none' },
          paint: { 'line-color': '#000000', 'line-width': 1 },
        });

        // Tooltip on hover
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'basin-tooltip',
        });

        map.on('mousemove', 'river-basins-fill', (e) => {
          if (e.features && e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            const basinColor = BASIN_COLORS[props.name] || '#00e5ff';
            const html = `
              <div style="padding:12px 18px;font-family:sans-serif;font-size:16px;background:#1e1e2e;color:#f0f0f0;border-radius:8px;">
                <strong style="font-size:17px;color:${basinColor};">${props.name}</strong>
                ${props.con != null ? `<div style="margin-top:5px;font-size:15px;color:#aaa;">Contribution: <span style="color:${basinColor};font-weight:700;font-size:16px;">${props.con} MAF</span></div>` : ''}
              </div>
            `;
            popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
          }
        });

        map.on('mouseleave', 'river-basins-fill', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });

        console.log('✓ River Basins loaded from Cachments_Basins.geojson');
      } catch (e) {
        console.warn('Could not load Catchment Basins:', e.message);
      }
    }
  }, []);

  // Setup River Tributaries (fetch from public GeoJSON)
  const setupRiverTributaries = useCallback(async (map) => {
    if (!map.getSource('river-tributaries')) {
      try {
        const resp = await fetch('/River_Tributries.geojson');
        if (!resp.ok) throw new Error(`Failed to fetch River_Tributries.geojson: ${resp.status}`);
        const geojson = await resp.json();

        map.addSource('river-tributaries', {
          type: 'geojson',
          data: geojson,
        });

        map.addLayer({
          id: 'river-tributaries-layer',
          type: 'line',
          source: 'river-tributaries',
          layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#00BFFF',
            'line-width': 1.5,
            'line-opacity': 0.8,
          },
        });

        // Build point features at midpoint of each line for labels
        const labelFeatures = geojson.features
          .filter(f => f.properties.river_name)
          .map(f => {
            const coords = f.geometry.type === 'MultiLineString'
              ? f.geometry.coordinates[0]
              : f.geometry.coordinates;
            const mid = coords[Math.floor(coords.length / 2)];
            return {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: mid },
              properties: { river_name: f.properties.river_name },
            };
          });

        map.addSource('river-tributaries-labels-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: labelFeatures },
        });

        map.addLayer({
          id: 'river-tributaries-labels',
          type: 'symbol',
          source: 'river-tributaries-labels-src',
          layout: {
            visibility: 'none',
            'text-field': ['get', 'river_name'],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-allow-overlap': false,
            'text-padding': 5,
            'text-offset': [0, -0.8],
            'text-anchor': 'bottom',
          },
          paint: {
            'text-color': '#7DF9FF',
            'text-halo-color': 'rgba(0, 0, 0, 0.9)',
            'text-halo-width': 2,
          },
        });

        console.log('✓ River Tributaries loaded from River_Tributries.geojson');
      } catch (e) {
        console.warn('Could not load River Tributaries:', e.message);
      }
    }
  }, []);

  // Helper: classify Sectoral_C into broad sector
  const getSectorForCategory = (sectoralC) => {
    if (!sectoralC) return 'Other';
    const upper = sectoralC.toUpperCase();
    for (const [sector, cfg] of Object.entries(INDUSTRY_SECTORS)) {
      if (sector === 'Other') continue;
      if (cfg.match.some(m => upper.includes(m.toUpperCase()))) return sector;
    }
    return 'Other';
  };

  // Setup Industries layer
  const setupIndustries = useCallback(async (map) => {
    if (map.getSource('industries')) return;
    try {
      const resp = await fetch('/Industries.geojson');
      if (!resp.ok) throw new Error(`Failed to fetch Industries.geojson: ${resp.status}`);
      const geojson = await resp.json();

      // Add sector property to each feature
      geojson.features.forEach(f => {
        f.properties._sector = getSectorForCategory(f.properties.Sectoral_C);
      });

      map.addSource('industries', { type: 'geojson', data: geojson });

      // Build Mapbox color expression from sectors
      const colorExpr = ['match', ['get', '_sector']];
      Object.entries(INDUSTRY_SECTORS).forEach(([sector, cfg]) => {
        colorExpr.push(sector, cfg.color);
      });
      colorExpr.push('#ADB5BD'); // fallback

      map.addLayer({
        id: 'industries-layer',
        type: 'circle',
        source: 'industries',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2, 8, 4, 12, 6],
          'circle-color': colorExpr,
          'circle-opacity': 0.8,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(255,255,255,0.3)',
        },
      });

      // Tooltip on hover
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'basin-tooltip',
        maxWidth: '280px',
      });

      map.on('mousemove', 'industries-layer', (e) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          const props = e.features[0].properties;
          const sector = props._sector;
          const sectorColor = INDUSTRY_SECTORS[sector]?.color || '#ADB5BD';
          const html = `
            <div style="padding:8px 12px;font-family:sans-serif;font-size:13px;background:#1e1e2e;color:#f0f0f0;border-radius:8px;line-height:1.5;">
              <div style="font-weight:700;color:${sectorColor};font-size:14px;margin-bottom:4px;">${props.Company_Na || 'Unknown'}</div>
              <div><span style="color:#8899aa;">Sector:</span> <span style="color:${sectorColor};">${props.Sectoral_C || 'N/A'}</span></div>
              <div><span style="color:#8899aa;">Category:</span> ${sector}</div>
              <div><span style="color:#8899aa;">Risk Level:</span> ${props.Overall_Ri || 'N/A'}</div>
            </div>
          `;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        }
      });

      map.on('mouseleave', 'industries-layer', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      console.log('✓ Industries loaded from Industries.geojson');
    } catch (e) {
      console.warn('Could not load Industries:', e.message);
    }
  }, []);

  // Setup WFS layers (fetch from GeoServer)
  const setupWfsLayers = useCallback(async (map) => {
    // Headworks
    await loadMapImage(map, DAM_ICONS.headworks, 'headworks-icon').catch(() => {});
    
    try {
      const headworksUrl = buildWfsUrl('water_monitoring', 'headworks');
      const resp = await fetch(headworksUrl);
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('headworks-source')) {
          map.addSource('headworks-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'headworks-layer',
            type: 'symbol',
            source: 'headworks-source',
            layout: {
              'icon-image': 'headworks-icon',
              'icon-size': 0.04,
              'icon-allow-overlap': true,
              'text-field': ['get', 'Name2'],
              'text-offset': [0, 1.5],
              'text-size': 11,
              'text-anchor': 'top',
              'visibility': 'none',
            },
            paint: {
              'text-color': '#00CED1',
              'text-halo-color': '#000000',
              'text-halo-width': 0.5,
            },
          });
          console.log('✓ Headworks layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load headworks:', e.message);
    }

    // Combined Rivers — removed from WFS, now loaded separately via setupMajorRivers

    // Flood Extent
    try {
      const floodUrl = buildWfsUrl('water_monitoring', 'Flood_Extent');
      const resp = await fetch(floodUrl);
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('floodextend-source')) {
          map.addSource('floodextend-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'floodextend-layer',
            type: 'fill',
            source: 'floodextend-source',
            layout: { visibility: 'none' },
            paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.45 },
          });
          map.addLayer({
            id: 'floodextend-outline',
            type: 'line',
            source: 'floodextend-source',
            layout: { visibility: 'none' },
            paint: { 'line-color': '#990000', 'line-width': 2 },
          });
          console.log('✓ Flood Extent layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load flood extent:', e.message);
    }
  }, [loadMapImage]);

  // Setup Major Rivers layer (local GeoJSON)
  const setupMajorRivers = useCallback(async (map) => {
    try {
      const resp = await fetch('/Major_Rivers.geojson');
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('rivers-source')) {
          map.addSource('rivers-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'rivers-layer',
            type: 'line',
            source: 'rivers-source',
            layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#5cb8ff', 'line-width': 3, 'line-opacity': 0.9 },
          });

          // Build point features at midpoint of each line for labels
          const labelFeatures = geojson.features
            .filter(f => f.properties.name)
            .map(f => {
              const coords = f.geometry.type === 'MultiLineString'
                ? f.geometry.coordinates[0]
                : f.geometry.coordinates;
              const mid = coords[Math.floor(coords.length / 2)];
              return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: mid },
                properties: { name: f.properties.name },
              };
            });

          map.addSource('rivers-labels-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: labelFeatures },
          });

          map.addLayer({
            id: 'rivers-labels',
            type: 'symbol',
            source: 'rivers-labels-src',
            layout: {
              visibility: 'none',
              'text-field': ['get', 'name'],
              'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'text-allow-overlap': false,
              'text-padding': 5,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom',
            },
            paint: {
              'text-color': '#60a5fa',
              'text-halo-color': 'rgba(0, 0, 0, 0.9)',
              'text-halo-width': 2,
            },
          });

          console.log('✓ Major Rivers layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load Major Rivers:', e.message);
    }
  }, []);

  // Setup individual river WFS layers
  const setupRiverLayers = useCallback(async (map) => {
    for (const river of RIVERS_CONFIG) {
      try {
        const url = buildWfsUrl('water_monitoring', river.layerName);
        const resp = await fetch(url);
        if (resp.ok) {
          const geojson = await resp.json();
          const sourceId = `${river.id}-source`;
          const layerId = `${river.id}-layer`;
          
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: geojson });
            map.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': river.color, 'line-width': 3, 'line-opacity': 0.8 },
            });
            console.log(`✓ ${river.name} river loaded`);
          }
        }
      } catch (e) {
        console.warn(`Could not load ${river.name}:`, e.message);
      }
    }
  }, []);

  // Setup Evapotranspiration layers (WMS raster)
  const setupETLayers = useCallback((map) => {
    TIME_SERIES.evapotranspiration.forEach(year => {
      const sourceId = `et-${year}`;
      const layerId = `et-${year}`;
      const wmsUrl = `${GEOSERVER_CONFIG.waterMonitoring}/wms?service=WMS&version=1.1.1&request=GetMap&layers=water_monitoring:ET_${year}&styles=&format=image/png&transparent=true&exceptions=application/vnd.ogc.se_inimage&tiled=true&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'raster', tiles: [wmsUrl], tileSize: 256 });
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.7 },
        });
        console.log(`Added ET layer: ${layerId}`);
      }
    });
    console.log('✓ ET layers loaded');
  }, []);

  // Setup Precipitation layers (WMS raster)
  const setupPrecipitationLayers = useCallback((map) => {
    TIME_SERIES.precipitation.forEach(period => {
      const sourceId = `precipitation-${period.id}`;
      const layerId = `precipitation-${period.id}`;
      const wmsUrl = `${GEOSERVER_CONFIG.waterMonitoring}/wms?service=WMS&version=1.1.1&request=GetMap&layers=water_monitoring:${period.layer}&styles=&format=image/png&transparent=true&exceptions=application/vnd.ogc.se_inimage&tiled=true&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'raster', tiles: [wmsUrl], tileSize: 256 });
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.7 },
        });
        console.log(`Added Precipitation layer: ${layerId}`);
      }
    });
    console.log('✓ Precipitation layers loaded');
  }, []);

  // Setup Snow Cover layers (WMS raster)
  const setupSnowCoverLayers = useCallback((map) => {
    TIME_SERIES.snowCover.forEach(year => {
      const sourceId = `snow-${year}`;
      const layerId = `snow-${year}`;
      const wmsUrl = `${GEOSERVER_CONFIG.waterMonitoring}/wms?service=WMS&version=1.1.1&request=GetMap&layers=water_monitoring:SnowCover_${year}&styles=&format=image/png&transparent=true&exceptions=application/vnd.ogc.se_inimage&tiled=true&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'raster', tiles: [wmsUrl], tileSize: 256 });
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.7 },
        });
        console.log(`Added Snow Cover layer: ${layerId}`);
      }
    });
    console.log('✓ Snow Cover layers loaded');
  }, []);

  // Setup Coastal layers
  const setupCoastalLayers = useCallback((map) => {
    // Transects Karachi (WMS)
    if (!map.getSource('Transects_Karachi')) {
      map.addSource('Transects_Karachi', {
        type: 'raster',
        tiles: [COASTAL_LAYERS.transectsKarachi.url],
        tileSize: 256,
      });
      map.addLayer({
        id: 'transectsKarachi',
        type: 'raster',
        source: 'Transects_Karachi',
        layout: { visibility: 'none' },
      });
    }

    // Baseline Karachi (WMS)
    if (!map.getSource('baseline_karachi')) {
      map.addSource('baseline_karachi', {
        type: 'raster',
        tiles: [COASTAL_LAYERS.baselineKarachi.url],
        tileSize: 256,
      });
      map.addLayer({
        id: 'baselineKarachi',
        type: 'raster',
        source: 'baseline_karachi',
        layout: { visibility: 'none' },
      });
    }

    // Shorelines (Vector tiles)
    if (!map.getSource('shorelines')) {
      map.addSource('shorelines', {
        type: 'vector',
        scheme: 'tms',
        tiles: [COASTAL_LAYERS.shorelines.url],
      });
      map.addLayer({
        id: 'shorelines',
        type: 'line',
        source: 'shorelines',
        'source-layer': 'shorelines',
        layout: { visibility: 'none' },
        paint: COASTAL_LAYERS.shorelines.paint,
      });
    }

    console.log('✓ Coastal layers loaded');
  }, []);

  // Setup Main Canals layer (local GeoJSON)
  const setupMainCanals = useCallback(async (map) => {
    try {
      const resp = await fetch('/Main_canal.geojson');
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('main-canals-source')) {
          map.addSource('main-canals-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'main-canals-layer',
            type: 'line',
            source: 'main-canals-source',
            layout: { visibility: 'none' },
            paint: {
              'line-color': '#00CC00',
              'line-width': 2.5,
              'line-opacity': 0.9,
            },
          });

          // Build point features at midpoint of each line for labels
          const labelFeatures = geojson.features
            .filter(f => f.properties.CNLName)
            .map(f => {
              const coords = f.geometry.type === 'MultiLineString'
                ? f.geometry.coordinates[0]
                : f.geometry.coordinates;
              const mid = coords[Math.floor(coords.length / 2)];
              return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: mid },
                properties: { CNLName: f.properties.CNLName },
              };
            });

          map.addSource('main-canals-labels-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: labelFeatures },
          });

          map.addLayer({
            id: 'main-canals-labels',
            type: 'symbol',
            source: 'main-canals-labels-src',
            layout: {
              visibility: 'none',
              'text-field': ['get', 'CNLName'],
              'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              'text-size': 11,
              'text-allow-overlap': false,
              'text-padding': 5,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom',
            },
            paint: {
              'text-color': '#90EE90',
              'text-halo-color': 'rgba(0, 0, 0, 0.9)',
              'text-halo-width': 2,
            },
          });

          console.log('✓ Main Canals layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load Main Canals:', e.message);
    }
  }, []);

  // Setup Branch Canals layer (local GeoJSON)
  const setupBranchCanals = useCallback(async (map) => {
    try {
      const resp = await fetch('/Branch_canal.geojson');
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('branch-canals-source')) {
          map.addSource('branch-canals-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'branch-canals-layer',
            type: 'line',
            source: 'branch-canals-source',
            layout: { visibility: 'none' },
            paint: {
              'line-color': '#FF6347',
              'line-width': 1.8,
              'line-opacity': 0.85,
            },
          });

          // Build point features at midpoint of each line for labels
          const labelFeatures = geojson.features
            .filter(f => f.properties.CCAName)
            .map(f => {
              const coords = f.geometry.type === 'MultiLineString'
                ? f.geometry.coordinates[0]
                : f.geometry.coordinates;
              const mid = coords[Math.floor(coords.length / 2)];
              return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: mid },
                properties: { CCAName: f.properties.CCAName },
              };
            });

          map.addSource('branch-canals-labels-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: labelFeatures },
          });

          map.addLayer({
            id: 'branch-canals-labels',
            type: 'symbol',
            source: 'branch-canals-labels-src',
            layout: {
              visibility: 'none',
              'text-field': ['get', 'CCAName'],
              'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              'text-size': 10,
              'text-allow-overlap': false,
              'text-padding': 5,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom',
            },
            paint: {
              'text-color': '#FFA07A',
              'text-halo-color': 'rgba(0, 0, 0, 0.9)',
              'text-halo-width': 2,
            },
          });

          console.log('✓ Branch Canals layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load Branch Canals:', e.message);
    }
  }, []);

  // Setup Distributary Canals layer (local GeoJSON)
  const setupDistributaryCanals = useCallback(async (map) => {
    try {
      const resp = await fetch('/Distributary_canal.geojson');
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('distributary-canals-source')) {
          map.addSource('distributary-canals-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'distributary-canals-layer',
            type: 'line',
            source: 'distributary-canals-source',
            layout: { visibility: 'none' },
            paint: {
              'line-color': '#4DA6FF',
              'line-width': 1.2,
              'line-opacity': 0.8,
            },
          });

          const labelFeatures = geojson.features
            .filter(f => f.properties.CCAName)
            .map(f => {
              const coords = f.geometry.type === 'MultiLineString'
                ? f.geometry.coordinates[0]
                : f.geometry.coordinates;
              const mid = coords[Math.floor(coords.length / 2)];
              return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: mid },
                properties: { CCAName: f.properties.CCAName },
              };
            });

          map.addSource('distributary-canals-labels-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: labelFeatures },
          });

          map.addLayer({
            id: 'distributary-canals-labels',
            type: 'symbol',
            source: 'distributary-canals-labels-src',
            layout: {
              visibility: 'none',
              'text-field': ['get', 'CCAName'],
              'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              'text-size': 9,
              'text-allow-overlap': false,
              'text-padding': 5,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom',
            },
            paint: {
              'text-color': '#87CEFA',
              'text-halo-color': 'rgba(0, 0, 0, 0.9)',
              'text-halo-width': 2,
            },
          });

          console.log('\u2713 Distributary Canals layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load Distributary Canals:', e.message);
    }
  }, []);

  // Initialize all layers - OPTIMIZED: Only load essential layers on startup
  const initializeAllLayers = useCallback(async (map) => {
    // Boundary layers (WMS) - lightweight, just tile URLs
    Object.values(BOUNDARY_LAYERS).forEach(config => addBoundaryLayer(map, config));

    // Local data layers - already in memory, no network request
    await setupDamLayers(map);
    await setupRiverBasins(map);

    // DO NOT fetch WFS layers on startup - they will be lazy loaded when toggled
    // await setupWfsLayers(map);
    // await setupRiverLayers(map);

    // DO NOT add time series layers on startup - lazy load when enabled
    // setupETLayers(map);
    // setupPrecipitationLayers(map);
    // setupSnowCoverLayers(map);

    // DO NOT add coastal layers on startup - lazy load when enabled
    // setupCoastalLayers(map);

    // Apply initial visibility for layers that should be visible by default
    const { layerVisibility } = useMapStore.getState();
    Object.entries(layerVisibility).forEach(([layerId, visible]) => {
      if (visible && map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    });

    console.log('✓ Essential layers initialized (WFS/raster layers will load on demand)');
  }, [addBoundaryLayer, setupDamLayers, setupRiverBasins]);

  // Handle visibility changes - WITH LAZY LOADING for WFS/raster layers
  const updateLayerVisibility = useCallback(async (map, layerId, visible) => {
    // Map layerId to actual map layer IDs
    const layerMappings = {
      'ongoingDams': 'ongoing-layer',
      'underConstruction': 'underconstruction-layer',
      'futureDams': 'future-layer',
      'indianDams': 'indian-layer',
      'headworks': 'headworks-layer',
      'rivers': ['rivers-layer', 'rivers-labels'],
      'riverTributaries': ['river-tributaries-layer', 'river-tributaries-labels'],
      'riverBasins': ['river-basins-fill', 'river-basins-outline'],
      'floodExtent': ['floodextend-layer', 'floodextend-outline'],
      'mainCanals': ['main-canals-layer', 'main-canals-labels'],
      'branchCanals': ['branch-canals-layer', 'branch-canals-labels'],
      'distributaryCanals': ['distributary-canals-layer', 'distributary-canals-labels'],
      'industries': 'industries-layer',
      'indus': 'indus-layer',
      'jhelum': 'jhelum-layer',
      'chenab': 'chenab-layer',
      'ravi': 'ravi-layer',
      'sutlaj': 'sutlaj-layer',
    };

    // Time series layer configurations
    const timeSeriesConfigs = {
      'evapotranspiration': { prefix: 'et-', items: TIME_SERIES.evapotranspiration },
      'precipitation': { prefix: 'precipitation-', items: TIME_SERIES.precipitation.map(p => p.id) },
      'snowCover': { prefix: 'snow-', items: TIME_SERIES.snowCover },
    };

    // Lazy load WFS layers when first toggled on
    if (visible && !loadedLayersCache.has(layerId)) {
      // WFS Layers that need to be fetched
      if (layerId === 'headworks' || layerId === 'floodExtent') {
        await setupWfsLayers(map);
        loadedLayersCache.add('headworks');
        loadedLayersCache.add('floodExtent');
      }

      // Major Rivers layer (local GeoJSON)
      if (layerId === 'rivers') {
        await setupMajorRivers(map);
        loadedLayersCache.add('rivers');
      }
      
      // Individual river layers
      if (['indus', 'jhelum', 'chenab', 'ravi', 'sutlaj'].includes(layerId)) {
        await setupRiverLayers(map);
        ['indus', 'jhelum', 'chenab', 'ravi', 'sutlaj'].forEach(r => loadedLayersCache.add(r));
      }
      
      // River Tributaries layer
      if (layerId === 'riverTributaries') {
        await setupRiverTributaries(map);
        loadedLayersCache.add('riverTributaries');
      }

      // Main Canals layer
      if (layerId === 'mainCanals') {
        await setupMainCanals(map);
        loadedLayersCache.add('mainCanals');
      }

      // Branch Canals layer
      if (layerId === 'branchCanals') {
        await setupBranchCanals(map);
        loadedLayersCache.add('branchCanals');
      }

      // Distributary Canals layer
      if (layerId === 'distributaryCanals') {
        await setupDistributaryCanals(map);
        loadedLayersCache.add('distributaryCanals');
      }

      // Industries layer
      if (layerId === 'industries') {
        await setupIndustries(map);
        loadedLayersCache.add('industries');
      }
      
      // Time series layers - setup and immediately show first layer
      if (layerId === 'evapotranspiration') {
        setupETLayers(map);
        loadedLayersCache.add('evapotranspiration');
        // Immediately show the selected layer after setup
        const { timeSeriesSelections } = useMapStore.getState();
        const selectedYear = timeSeriesSelections.evapotranspiration || TIME_SERIES.evapotranspiration[0];
        const etLayerId = `et-${selectedYear}`;
        if (map.getLayer(etLayerId)) {
          map.setLayoutProperty(etLayerId, 'visibility', 'visible');
          console.log(`✓ Showing ET layer: ${etLayerId}`);
        }
      }
      if (layerId === 'precipitation') {
        setupPrecipitationLayers(map);
        loadedLayersCache.add('precipitation');
        // Immediately show the selected layer after setup
        const { timeSeriesSelections } = useMapStore.getState();
        const selectedPeriod = timeSeriesSelections.precipitation || TIME_SERIES.precipitation[0].id;
        const precipLayerId = `precipitation-${selectedPeriod}`;
        if (map.getLayer(precipLayerId)) {
          map.setLayoutProperty(precipLayerId, 'visibility', 'visible');
          console.log(`✓ Showing Precipitation layer: ${precipLayerId}`);
        }
      }
      if (layerId === 'snowCover') {
        setupSnowCoverLayers(map);
        loadedLayersCache.add('snowCover');
        // Immediately show the selected layer after setup
        const { timeSeriesSelections } = useMapStore.getState();
        const selectedYear = timeSeriesSelections.snowCover || TIME_SERIES.snowCover[0];
        const snowLayerId = `snow-${selectedYear}`;
        if (map.getLayer(snowLayerId)) {
          map.setLayoutProperty(snowLayerId, 'visibility', 'visible');
          console.log(`✓ Showing Snow Cover layer: ${snowLayerId}`);
        }
      }
      
      // Coastal layers
      const coastalLayerIds = Object.keys(COASTAL_LAYERS);
      if (coastalLayerIds.includes(layerId)) {
        setupCoastalLayers(map);
        coastalLayerIds.forEach(c => loadedLayersCache.add(c));
      }
    }

    const visibility = visible ? 'visible' : 'none';
    const mappedLayers = layerMappings[layerId];

    // Handle time series layers specially
    if (timeSeriesConfigs[layerId]) {
      const { prefix, items } = timeSeriesConfigs[layerId];
      const { timeSeriesSelections } = useMapStore.getState();
      const selectedItem = timeSeriesSelections[layerId] || items[0];
      
      items.forEach(item => {
        const tsLayerId = `${prefix}${item}`;
        if (map.getLayer(tsLayerId)) {
          // When turning on, show only the selected layer
          // When turning off, hide all layers
          const layerVisibility = visible && item === selectedItem ? 'visible' : 'none';
          map.setLayoutProperty(tsLayerId, 'visibility', layerVisibility);
        }
      });
    } else if (mappedLayers) {
      const layers = Array.isArray(mappedLayers) ? mappedLayers : [mappedLayers];
      layers.forEach(layer => {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, 'visibility', visibility);
        }
      });
    } else if (map.getLayer(layerId)) {
      // Direct layer ID match
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }, [setupWfsLayers, setupMajorRivers, setupRiverLayers, setupRiverTributaries, setupMainCanals, setupBranchCanals, setupDistributaryCanals, setupIndustries, setupETLayers, setupPrecipitationLayers, setupSnowCoverLayers, setupCoastalLayers]);

  const initializeMap = useCallback(() => {
    if (mapRef.current || !mapContainerRef.current || mapInitializedRef.current) return;
    mapInitializedRef.current = true;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_CONFIG.styles[mapStyle],
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100 }), 'bottom-left');
    map.addControl(new mapboxgl.FullscreenControl({ container: mapWrapperRef.current }), 'top-left');

    map.on('load', async () => {
      console.log('Map loaded successfully');
      mapRef.current = map;
      setMapRef(map);

      await initializeAllLayers(map);
      setIsLoading(false);
    });

    // Handle style changes - re-add layers when basemap changes
    map.on('style.load', async () => {
      console.log('Style changed, re-adding layers...');
      
      // Clear the loaded layers cache since all layers are gone after style change
      loadedLayersCache.clear();
      
      // Re-initialize all essential layers
      await initializeAllLayers(map);
      
      // Get current layer visibility state and re-apply
      const { layerVisibility: currentVisibility } = useMapStore.getState();
      
      // Re-apply visibility for all currently enabled layers
      for (const [layerId, visible] of Object.entries(currentVisibility)) {
        if (visible) {
          await updateLayerVisibility(map, layerId, visible);
        }
      }
      
      console.log('✓ Layers restored after style change');
    });

    map.on('error', (e) => console.error('Map error:', e));
  }, [mapStyle, setMapRef, setIsLoading, initializeAllLayers, updateLayerVisibility]);

  // Initialize map only once on mount
  useEffect(() => {
    initializeMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        mapInitializedRef.current = false;
        loadedLayersCache.clear();
      }
    };
  }, []); // Empty dependency - only run on mount/unmount

  // Handle layer visibility changes - async for lazy loading
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Process visibility changes asynchronously
    const updateVisibilities = async () => {
      for (const [layerId, visible] of Object.entries(layerVisibility)) {
        await updateLayerVisibility(map, layerId, visible);
      }
    };
    
    updateVisibilities();
  }, [layerVisibility, updateLayerVisibility]);

  // Handle layer reordering on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || activeLayerOrder.length < 2) return;

    const layerMappings = {
      'ongoingDams': ['ongoing-layer'],
      'underConstruction': ['underconstruction-layer'],
      'futureDams': ['future-layer'],
      'indianDams': ['indian-layer'],
      'headworks': ['headworks-layer'],
      'rivers': ['rivers-layer', 'rivers-labels'],
      'riverTributaries': ['river-tributaries-layer', 'river-tributaries-labels'],
      'riverBasins': ['river-basins-fill', 'river-basins-outline'],
      'floodExtent': ['floodextend-layer', 'floodextend-outline'],
      'mainCanals': ['main-canals-layer', 'main-canals-labels'],
      'branchCanals': ['branch-canals-layer', 'branch-canals-labels'],
      'distributaryCanals': ['distributary-canals-layer', 'distributary-canals-labels'],
      'industries': ['industries-layer'],
    };

    // Move layers in order (first in array = bottom, last = top)
    for (let i = 1; i < activeLayerOrder.length; i++) {
      const currentId = activeLayerOrder[i];
      const mapLayers = layerMappings[currentId];
      if (!mapLayers) continue;

      mapLayers.forEach(mlId => {
        if (map.getLayer(mlId)) {
          map.moveLayer(mlId);
        }
      });
    }
    // Now re-sort: move each layer group on top in order
    activeLayerOrder.forEach(logicalId => {
      const mapLayers = layerMappings[logicalId];
      if (!mapLayers) return;
      mapLayers.forEach(mlId => {
        if (map.getLayer(mlId)) {
          map.moveLayer(mlId);
        }
      });
    });
  }, [activeLayerOrder]);

  const moveLayer = (idx, direction) => {
    const newOrder = [...activeLayerOrder];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    reorderLayers(newOrder);
  };

  // Flat label lookup
  const getLayerLabel = (id) => {
    for (const group of Object.values(LAYER_GROUPS)) {
      const found = group.layers.find(l => l.id === id);
      if (found) return found.label;
    }
    return id;
  };

  return (
    <div ref={mapWrapperRef} className="map-container">
      <div ref={mapContainerRef} className="map-canvas" />
      <MapControls />
      <StorageComparison />
      <TimeSeriesController 
        type="evapotranspiration" 
        visible={layerVisibility.evapotranspiration} 
      />
      <TimeSeriesController 
        type="snowCover" 
        visible={layerVisibility.snowCover} 
      />
      <TimeSeriesController 
        type="precipitation" 
        visible={layerVisibility.precipitation} 
      />

      <CatchmentInflowsModal />
      <LossesModal />
      <InflowsCompModal />
      <div id="map-modal-portal" />

      {activeLayerOrder.length >= 2 && (
        <div className="layer-order-panel">
          <div className="layer-order-panel-header">
            <i className="fas fa-layer-group"></i>
            <span>Layer Order</span>
          </div>
          <div className="layer-order-panel-list">
            {[...activeLayerOrder].reverse().map((layerId, displayIdx) => {
              const realIdx = activeLayerOrder.length - 1 - displayIdx;
              return (
                <div key={layerId} className="layer-order-panel-item">
                  <span className="layer-order-panel-label">{getLayerLabel(layerId)}</span>
                  <div className="layer-order-panel-arrows">
                    <button
                      className="lo-arrow-btn"
                      disabled={realIdx === activeLayerOrder.length - 1}
                      onClick={() => moveLayer(realIdx, 1)}
                      title="Move up"
                    >
                      <i className="fas fa-chevron-up"></i>
                    </button>
                    <button
                      className="lo-arrow-btn"
                      disabled={realIdx === 0}
                      onClick={() => moveLayer(realIdx, -1)}
                      title="Move down"
                    >
                      <i className="fas fa-chevron-down"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapContainer;
