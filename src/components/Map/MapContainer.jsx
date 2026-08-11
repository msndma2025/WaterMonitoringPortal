// @refresh reset
import { useEffect, useRef, useCallback } from 'react';
import { motion, useDragControls } from 'framer-motion';
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
import PriorityLegend from './PriorityLegend';
import HillTorrentsLegend from './HillTorrentsLegend';
import CatchmentInflowsModal from './CatchmentInflowsModal';
import LossesModal from './LossesModal';
import InflowsCompModal from './InflowsCompModal';
import MonthlyInflowsModal from './MonthlyInflowsModal';
import SubBasinsModal from './SubBasinsModal';
import DamLevelsModal from './DamLevelsModal';
import IndDomModal from './IndDomModal';
import AgriDemandModal from './AgriDemandModal';
import ProjectionsModal from './ProjectionsModal';
import './MapContainer.css';

// Track loaded layers globally to avoid refetching
const loadedLayersCache = new Set();

// Set access token
mapboxgl.accessToken = MAP_CONFIG.accessToken;

// Zoom the map to fit a clicked polygon feature
function fitBoundsToFeature(map, feature) {
  const geom = feature && feature.geometry;
  if (!geom || !geom.coordinates) return;
  const bounds = new mapboxgl.LngLatBounds();
  const walk = (c) => {
    if (typeof c[0] === 'number') bounds.extend([c[0], c[1]]);
    else c.forEach(walk);
  };
  walk(geom.coordinates);
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 900 });
}

// Hover tooltip + click-to-pin (stays open) + click-to-zoom for a polygon layer
function attachPolygonPopup(map, layerId, buildHtml) {
  const hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: 'basin-tooltip', maxWidth: '360px' });
  const pinnedPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, className: 'basin-tooltip', maxWidth: '360px' });
  let isPinned = false;
  pinnedPopup.on('close', () => { isPinned = false; });

  map.on('mousemove', layerId, (e) => {
    if (e.features && e.features.length > 0) {
      map.getCanvas().style.cursor = 'pointer';
      if (!isPinned) hoverPopup.setLngLat(e.lngLat).setHTML(buildHtml(e.features[0].properties)).addTo(map);
    }
  });
  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
    hoverPopup.remove();
  });
  // Click a polygon: pin its tooltip open and zoom to it
  map.on('click', layerId, (e) => {
    if (e.features && e.features.length > 0) {
      hoverPopup.remove();
      isPinned = true;
      pinnedPopup.setLngLat(e.lngLat).setHTML(buildHtml(e.features[0].properties)).addTo(map);
      fitBoundsToFeature(map, e.features[0]);
    }
  });
  // Clicking off the layer closes the pinned tooltip
  map.on('click', (e) => {
    if (!isPinned) return;
    const hits = map.queryRenderedFeatures(e.point, { layers: [layerId] });
    if (!hits.length) { pinnedPopup.remove(); isPinned = false; }
  });
}

const MapContainer = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const { setMapRef, mapStyle, layerVisibility, activeLayerOrder, reorderLayers, setIsLoading, mapFullscreen, setMapFullscreen } = useMapStore();
  const layerOrderDragControls = useDragControls();
  const tourTrigger = useMapStore((s) => s.tourTrigger);
  const tourCancelRef = useRef(false);

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

  // Setup Sub-Basins layer (multiple local GeoJSON polygons from /umairdata)
  const setupSubBasins = useCallback(async (map) => {
    if (map.getSource('sub-basins')) return;
    const SUB_BASINS = [
      { file: 'astore', label: 'Astore', color: '#f97316' },
      { file: 'gilgit', label: 'Gilgit', color: '#22d3ee' },
      { file: 'indus', label: 'Indus', color: '#3b82f6' },
      { file: 'indus2', label: 'Indus (Lower)', color: '#6366f1' },
      { file: 'shigar', label: 'Shigar', color: '#a855f7' },
      { file: 'shyok', label: 'Shyok', color: '#10b981' },
    ];
    try {
      const features = [];
      await Promise.all(SUB_BASINS.map(async (b) => {
        const resp = await fetch(`/umairdata/${b.file}.geojson`);
        if (!resp.ok) {
          console.warn(`Could not load sub-basin ${b.file}: ${resp.status}`);
          return;
        }
        const geojson = await resp.json();
        (geojson.features || []).forEach((f) => {
          features.push({
            ...f,
            properties: { ...f.properties, subBasin: b.label, subBasinColor: b.color },
          });
        });
      }));

      map.addSource('sub-basins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      map.addLayer({
        id: 'sub-basins-fill',
        type: 'fill',
        source: 'sub-basins',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['get', 'subBasinColor'],
          'fill-opacity': 0.45,
        },
      });

      map.addLayer({
        id: 'sub-basins-outline',
        type: 'line',
        source: 'sub-basins',
        layout: { visibility: 'none' },
        paint: { 'line-color': ['get', 'subBasinColor'], 'line-width': 1.5 },
      });

      // Basin name labels placed at each polygon's centroid
      map.addLayer({
        id: 'sub-basins-labels',
        type: 'symbol',
        source: 'sub-basins',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'subBasin'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-allow-overlap': false,
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        },
      });

      // Tooltip on hover
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'basin-tooltip',
      });

      map.on('mousemove', 'sub-basins-fill', (e) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          const props = e.features[0].properties;
          const color = props.subBasinColor || '#00e5ff';
          // c_area is the catchment area in km²
          const catchment = props.c_area != null
            ? `${Math.round(Number(props.c_area)).toLocaleString('en-US')} km²`
            : null;
          const glacier = props.g_area != null
            ? `${Math.round(Number(props.g_area)).toLocaleString('en-US')} km²`
            : null;
          const html = `
            <div style="padding:12px 18px;font-family:sans-serif;font-size:16px;background:#1e1e2e;color:#f0f0f0;border-radius:8px;">
              <strong style="font-size:17px;color:${color};">${props.subBasin} Sub-Basin</strong>
              ${catchment ? `<div style="margin-top:5px;font-size:15px;color:#aaa;">Catchment area: <span style="color:${color};font-weight:700;">${catchment}</span></div>` : ''}
              ${glacier ? `<div style="margin-top:2px;font-size:15px;color:#aaa;">Glacier area: <span style="color:${color};font-weight:700;">${glacier}</span></div>` : ''}
            </div>
          `;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        }
      });

      map.on('mouseleave', 'sub-basins-fill', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      console.log(`✓ Sub-Basins loaded (${features.length} features from /umairdata)`);
    } catch (e) {
      console.warn('Could not load Sub-Basins:', e.message);
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
            'line-color': '#00008B',
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

  // Setup Temperature layers (Vector data from GeoJSON - shapefiles converted)
  const setupTemperatureLayers = useCallback(async (map) => {
    console.log('Starting temperature layer setup...');
    const monthMap = {
      jan: 'vjan', feb: 'vfeb', mar: 'vmar', apr: 'vapr',
      may: 'vmay', jun: 'vjun', jul: 'vjul', aug: 'vaug',
      sep: 'vsep', oct: 'voct', nov: 'vnov', dec: 'vdec'
    };

    for (const month of TIME_SERIES.temperature) {
      const sourceId = `temperature-${month.id}`;
      const layerId = `temperature-${month.id}`;
      const shapefileName = monthMap[month.id];

      if (!map.getSource(sourceId)) {
        try {
          const url = `/temp_2027/${shapefileName}.geojson`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${shapefileName}.geojson`);
          const geojson = await resp.json();

          // Filter out NoData features (DN = -2147483648 is Int32.MinValue, used for nodata)
          const validFeatures = geojson.features.filter(f => {
            const dn = f.properties?.DN;
            return dn != null && dn > -1000 && dn < 1000;
          });

          const cleanGeojson = {
            type: 'FeatureCollection',
            features: validFeatures
          };

          console.log(`✓ ${month.label}: ${validFeatures.length}/${geojson.features.length} valid features`);

          map.addSource(sourceId, { type: 'geojson', data: cleanGeojson });

          // Use step expression for clearer classification
          const colorExpr = [
            'step',
            ['get', 'DN'],
            '#2166ac', // < 0
            0, '#4575b4',
            5, '#74add1',
            10, '#abd9e9',
            15, '#fee090',
            20, '#fdae61',
            25, '#f46d43',
            30, '#d73027', // >= 30
          ];

          map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            layout: { visibility: 'none' },
            paint: {
              'fill-color': colorExpr,
              'fill-opacity': 0.75,
              'fill-outline-color': 'rgba(0,0,0,0)',
            },
          });
          console.log(`✓ Temperature layer created: ${month.label}`);
        } catch (e) {
          console.error(`❌ Could not load temperature data for ${month.label}:`, e);
        }
      }
    }
    console.log('✓ All temperature layers loaded');
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
              'text-size': 14,
              'text-allow-overlap': false,
              'text-padding': 5,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom',
            },
            paint: {
              'text-color': '#0f172a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 3,
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
              'text-size': 14,
              'text-allow-overlap': false,
              'text-padding': 5,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom',
            },
            paint: {
              'text-color': '#0f172a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 3,
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
              'text-size': 14,
              'text-allow-overlap': false,
              'text-padding': 5,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom',
            },
            paint: {
              'text-color': '#0f172a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 3,
            },
          });

          console.log('\u2713 Distributary Canals layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load Distributary Canals:', e.message);
    }
  }, []);

  // Setup Monsoon Basin layer (local GeoJSON - points, classified by Priority)
  const setupMonsoonBasin = useCallback(async (map) => {
    try {
      const resp = await fetch('/Final%20sites%20along%20the%20river.geojson');
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('monsoon-basin-source')) {
          map.addSource('monsoon-basin-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'monsoon-basin-layer',
            type: 'circle',
            source: 'monsoon-basin-source',
            layout: { visibility: 'none' },
            paint: {
              // Classify colour on the "Priority" column
              'circle-color': [
                'match',
                ['to-number', ['get', 'Priority']],
                1, '#ef4444', // Priority 1 (high)
                2, '#3b82f6', // Priority 2 (blue)
                '#38bdf8',    // fallback
              ],
              'circle-radius': [
                'match',
                ['to-number', ['get', 'Priority']],
                1, 8,
                2, 6,
                6,
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-opacity': 0.9,
            },
          });

          // Build tooltip HTML from the feature attributes
          const buildHtml = (p) => {
            const row = (label, value) =>
              (value !== undefined && value !== null && value !== '')
                ? `<div><span style="color:#8899aa;">${label}:</span> ${value}</div>`
                : '';
            const priority = (p.Priority !== undefined && p.Priority !== null)
              ? Number(p.Priority)
              : null;
            const lat = (p.Lattitude !== undefined && p.Lattitude !== null)
              ? Number(p.Lattitude).toFixed(4) : null;
            const lng = (p.Longitude !== undefined && p.Longitude !== null)
              ? Number(p.Longitude).toFixed(4) : null;
            return `
              <div style="padding:8px 12px;font-family:sans-serif;font-size:13px;background:#1e1e2e;color:#f0f0f0;border-radius:8px;line-height:1.5;">
                <div style="font-weight:700;color:#38bdf8;font-size:14px;margin-bottom:4px;">Point ${p.OBJECTID_1 ?? ''}</div>
                ${row('Priority', priority)}
                ${row('Tehsil', p.ADM3_EN)}
                ${row('District', p.ADM2_EN)}
                ${row('Province', p.ADM1_EN)}
                ${row('Country', p.ADM0_EN)}
                ${(lat && lng) ? `<div><span style="color:#8899aa;">Lat, Lng:</span> ${lat}, ${lng}</div>` : ''}
              </div>
            `;
          };

          // Temporary hover tooltip
          const hoverPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'basin-tooltip',
            maxWidth: '260px',
          });
          // Pinned tooltip that stays until closed / clicked out
          const pinnedPopup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'basin-tooltip',
            maxWidth: '260px',
          });
          let isPinned = false;
          pinnedPopup.on('close', () => { isPinned = false; });

          map.on('mousemove', 'monsoon-basin-layer', (e) => {
            if (e.features && e.features.length > 0) {
              map.getCanvas().style.cursor = 'pointer';
              if (!isPinned) {
                hoverPopup.setLngLat(e.lngLat).setHTML(buildHtml(e.features[0].properties)).addTo(map);
              }
            }
          });
          map.on('mouseleave', 'monsoon-basin-layer', () => {
            map.getCanvas().style.cursor = '';
            hoverPopup.remove();
          });

          // Click a point to pin its tooltip open
          map.on('click', 'monsoon-basin-layer', (e) => {
            if (e.features && e.features.length > 0) {
              hoverPopup.remove();
              isPinned = true;
              pinnedPopup
                .setLngLat(e.lngLat)
                .setHTML(buildHtml(e.features[0].properties))
                .addTo(map);
            }
          });

          // Clicking anywhere that is not a monsoon-basin point closes the pinned tooltip
          map.on('click', (e) => {
            if (!isPinned) return;
            const hits = map.queryRenderedFeatures(e.point, { layers: ['monsoon-basin-layer'] });
            if (!hits.length) {
              pinnedPopup.remove();
              isPinned = false;
            }
          });

          console.log('\u2713 Monsoon Basin (Final sites along the river) layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load Monsoon Basin:', e.message);
    }
  }, []);

  // Setup Monsoon Basin 2 layer (local GeoJSON - points)
  const setupMonsoonBasin2 = useCallback(async (map) => {
    try {
      const resp = await fetch('/all%20sites%20final.geojson');
      if (resp.ok) {
        const geojson = await resp.json();
        if (!map.getSource('monsoon-basin2-source')) {
          map.addSource('monsoon-basin2-source', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'monsoon-basin2-layer',
            type: 'circle',
            source: 'monsoon-basin2-source',
            layout: { visibility: 'none' },
            paint: {
              'circle-radius': 4,
              'circle-color': '#a78bfa',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
              'circle-opacity': 0.9,
            },
          });

          // Reverse-geocode a place name from lat/long via the Mapbox Geocoding API.
          const geocodeCache = new Map();
          const reverseGeocode = async (lng, lat) => {
            const key = `${lng.toFixed(4)},${lat.toFixed(4)}`;
            if (geocodeCache.has(key)) return geocodeCache.get(key);
            try {
              const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
                + `?types=place,locality,district,region&limit=1&access_token=${MAP_CONFIG.accessToken}`;
              const r = await fetch(url);
              if (!r.ok) return null;
              const data = await r.json();
              const name = data.features && data.features.length ? data.features[0].place_name : null;
              geocodeCache.set(key, name);
              return name;
            } catch {
              return null;
            }
          };

          const buildHtml = (p, lat, lng, place) => {
            const rain = (p.Annual_Rai !== undefined && p.Annual_Rai !== null)
              ? `${Number(p.Annual_Rai).toFixed(1)} mm`
              : 'N/A';
            return `
              <div style="padding:8px 12px;font-family:sans-serif;font-size:13px;background:#1e1e2e;color:#f0f0f0;border-radius:8px;line-height:1.5;">
                <div style="font-weight:700;color:#a78bfa;font-size:14px;margin-bottom:4px;">Point ${p.No_ ?? ''}</div>
                <div><span style="color:#8899aa;">Place:</span> ${place || 'Locating…'}</div>
                <div><span style="color:#8899aa;">Annual Rainfall:</span> ${rain}</div>
                <div><span style="color:#8899aa;">Lat, Lng:</span> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
              </div>
            `;
          };

          // Click popup showing point details
          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            className: 'basin-tooltip',
            maxWidth: '260px',
          });

          map.on('click', 'monsoon-basin2-layer', (e) => {
            if (e.features && e.features.length > 0) {
              const p = e.features[0].properties;
              const lng = p.Longitude !== undefined ? Number(p.Longitude) : e.lngLat.lng;
              const lat = p.Latitude !== undefined ? Number(p.Latitude) : e.lngLat.lat;

              // Show immediately with a placeholder, then fill in the place name.
              popup.setLngLat(e.lngLat).setHTML(buildHtml(p, lat, lng, null)).addTo(map);

              reverseGeocode(lng, lat).then((place) => {
                // Only update if this popup is still the one open for this point
                if (popup.isOpen()) {
                  popup.setHTML(buildHtml(p, lat, lng, place || 'Unknown'));
                }
              });
            }
          });

          map.on('mouseenter', 'monsoon-basin2-layer', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'monsoon-basin2-layer', () => {
            map.getCanvas().style.cursor = '';
          });

          console.log('✓ Monsoon Basin 2 layer loaded');
        }
      }
    } catch (e) {
      console.warn('Could not load Monsoon Basin 2:', e.message);
    }
  }, []);

  // Setup Site Locations layer (local GeoJSON - polygons)
  const setupSiteLocations = useCallback(async (map) => {
    if (map.getSource('site-locations-source')) return;
    try {
      const resp = await fetch('/polygon_sites_monsoon_basin.geojson');
      if (!resp.ok) throw new Error(`Failed to fetch polygon_sites_monsoon_basin.geojson: ${resp.status}`);
      const geojson = await resp.json();

      map.addSource('site-locations-source', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'site-locations-fill',
        type: 'fill',
        source: 'site-locations-source',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#f43f5e', 'fill-opacity': 0.35 },
      });

      map.addLayer({
        id: 'site-locations-outline',
        type: 'line',
        source: 'site-locations-source',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#f43f5e', 'line-width': 2 },
      });

      const row = (label, value) =>
        (value !== undefined && value !== null && value !== '')
          ? `<div><span style="color:#8899aa;">${label}:</span> ${value}</div>`
          : '';

      const buildHtml = (p) => `
        <div style="padding:14px 18px;font-family:sans-serif;font-size:20px;background:#1e1e2e;color:#f0f0f0;border-radius:10px;line-height:1.6;">
          <div style="font-weight:700;color:#fb7185;font-size:24px;margin-bottom:7px;">${p.Name ?? 'Site'}</div>
          ${row('River', p.River)}
          ${row('District', p.district)}
          ${row('Province', p.province)}
          ${row('Area', p.area_km2 != null ? `${Number(p.area_km2).toFixed(2)} km²` : null)}
          ${row('Volume', p.volume_MAF != null ? `${Number(p.volume_MAF).toFixed(4)} MAF` : null)}
        </div>
      `;

      attachPolygonPopup(map, 'site-locations-fill', buildHtml);

      console.log(`✓ Site Locations loaded (${(geojson.features || []).length} polygons)`);
    } catch (e) {
      console.warn('Could not load Site Locations:', e.message);
    }
  }, []);

  // Setup Priority Site Locations layer (local GeoJSON - polygons)
  const setupPrioritySites = useCallback(async (map) => {
    if (map.getSource('priority-sites-source')) return;
    try {
      const resp = await fetch('/priority_sites_monsoon_basin.geojson');
      if (!resp.ok) throw new Error(`Failed to fetch priority_sites_monsoon_basin.geojson: ${resp.status}`);
      const geojson = await resp.json();

      map.addSource('priority-sites-source', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'priority-sites-fill',
        type: 'fill',
        source: 'priority-sites-source',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#fbbf24', 'fill-opacity': 0.45 },
      });

      map.addLayer({
        id: 'priority-sites-outline',
        type: 'line',
        source: 'priority-sites-source',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#f59e0b', 'line-width': 2.5 },
      });

      const buildHtml = (p) => `
        <div style="padding:14px 18px;font-family:sans-serif;font-size:20px;background:#1e1e2e;color:#f0f0f0;border-radius:10px;line-height:1.6;">
          <div style="font-weight:700;color:#fbbf24;font-size:24px;margin-bottom:7px;">${p.Name ?? 'Priority Site'}</div>
          ${p.Area_km2 != null ? `<div><span style="color:#8899aa;">Area:</span> ${Number(p.Area_km2).toFixed(2)} km²</div>` : ''}
        </div>
      `;

      attachPolygonPopup(map, 'priority-sites-fill', buildHtml);

      console.log(`✓ Priority Site Locations loaded (${(geojson.features || []).length} polygons)`);
    } catch (e) {
      console.warn('Could not load Priority Site Locations:', e.message);
    }
  }, []);

  // Setup Glacial Basins layer (local GeoJSON - polygons)
  const setupGlacialBasins = useCallback(async (map) => {
    if (map.getSource('glacial-basins-source')) return;
    try {
      const resp = await fetch('/glacial_basins.geojson');
      if (!resp.ok) throw new Error(`Failed to fetch glacial_basins.geojson: ${resp.status}`);
      const geojson = await resp.json();

      map.addSource('glacial-basins-source', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'glacial-basins-fill',
        type: 'fill',
        source: 'glacial-basins-source',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#67e8f9', 'fill-opacity': 0.45 },
      });

      map.addLayer({
        id: 'glacial-basins-outline',
        type: 'line',
        source: 'glacial-basins-source',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#22d3ee', 'line-width': 1.5 },
      });

      const row = (label, value) =>
        (value !== undefined && value !== null && value !== '')
          ? `<div><span style="color:#8899aa;">${label}:</span> ${value}</div>`
          : '';

      const buildHtml = (p) => `
        <div style="padding:14px 18px;font-family:sans-serif;font-size:20px;background:#1e1e2e;color:#f0f0f0;border-radius:10px;line-height:1.6;">
          <div style="font-weight:700;color:#67e8f9;font-size:24px;margin-bottom:7px;">Glacial Basin</div>
          ${row('Layer', p.layer)}
          ${row('Elevation', p.elevation_ != null ? `${Math.round(Number(p.elevation_))} m` : null)}
          ${row('Area', p.Area_m2 != null ? `${Number(p.Area_m2).toLocaleString('en-US', { maximumFractionDigits: 0 })} m²` : null)}
          ${row('Volume', p.Volume_m3 != null ? `${Number(p.Volume_m3).toLocaleString('en-US', { maximumFractionDigits: 0 })} m³` : null)}
        </div>
      `;

      attachPolygonPopup(map, 'glacial-basins-fill', buildHtml);

      console.log(`✓ Glacial Basins loaded (${(geojson.features || []).length} polygons)`);
    } catch (e) {
      console.warn('Could not load Glacial Basins:', e.message);
    }
  }, []);

  // Setup Hill Torrents layer (multiple local GeoJSON polygons)
  // Names/colours must stay in sync with HillTorrentsLegend.jsx
  const setupHillTorrents = useCallback(async (map) => {
    if (map.getSource('hill-torrents-source')) return;
    const TORRENTS = [
      { file: 'DI_Khan1_torrent', name: 'D.I. Khan 1',   color: '#f97316' },
      { file: 'DI_Khan2_torrent', name: 'D.I. Khan 2',   color: '#eab308' },
      { file: 'Kirther_range',    name: 'Kirthar Range', color: '#a855f7' },
      { file: 'Sindh_Torrent',    name: 'Sindh Torrent', color: '#ec4899' },
    ];
    try {
      const features = [];
      await Promise.all(TORRENTS.map(async (t) => {
        const resp = await fetch(`/hill_torrents/${t.file}.geojson`);
        if (!resp.ok) {
          console.warn(`Could not load hill torrent ${t.file}: ${resp.status}`);
          return;
        }
        const geojson = await resp.json();
        (geojson.features || []).forEach((f) => {
          features.push({
            ...f,
            properties: { ...f.properties, htName: t.name, htColor: t.color },
          });
        });
      }));

      map.addSource('hill-torrents-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      map.addLayer({
        id: 'hill-torrents-fill',
        type: 'fill',
        source: 'hill-torrents-source',
        layout: { visibility: 'none' },
        paint: { 'fill-color': ['get', 'htColor'], 'fill-opacity': 0.4 },
      });

      map.addLayer({
        id: 'hill-torrents-outline',
        type: 'line',
        source: 'hill-torrents-source',
        layout: { visibility: 'none' },
        paint: { 'line-color': ['get', 'htColor'], 'line-width': 1.5 },
      });

      const buildHtml = (p) => {
        const color = p.htColor || '#38bdf8';
        return `
          <div style="padding:8px 12px;font-family:sans-serif;font-size:13px;background:#1e1e2e;color:#f0f0f0;border-radius:8px;">
            <strong style="font-size:14px;color:${color};">${p.htName || 'Hill Torrent'}</strong>
          </div>
        `;
      };

      // Temporary hover tooltip
      const hoverPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'basin-tooltip',
        maxWidth: '220px',
      });
      // Pinned tooltip that stays until closed / clicked out
      const pinnedPopup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'basin-tooltip',
        maxWidth: '220px',
      });
      let isPinned = false;
      pinnedPopup.on('close', () => { isPinned = false; });

      map.on('mousemove', 'hill-torrents-fill', (e) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          if (!isPinned) {
            hoverPopup.setLngLat(e.lngLat).setHTML(buildHtml(e.features[0].properties)).addTo(map);
          }
        }
      });
      map.on('mouseleave', 'hill-torrents-fill', () => {
        map.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Click a polygon to pin its tooltip open
      map.on('click', 'hill-torrents-fill', (e) => {
        if (e.features && e.features.length > 0) {
          hoverPopup.remove();
          isPinned = true;
          pinnedPopup.setLngLat(e.lngLat).setHTML(buildHtml(e.features[0].properties)).addTo(map);
        }
      });

      // Clicking anywhere that is not a hill-torrent polygon closes the pinned tooltip
      map.on('click', (e) => {
        if (!isPinned) return;
        const hits = map.queryRenderedFeatures(e.point, { layers: ['hill-torrents-fill'] });
        if (!hits.length) {
          pinnedPopup.remove();
          isPinned = false;
        }
      });

      console.log(`✓ Hill Torrents loaded (${features.length} polygons)`);
    } catch (e) {
      console.warn('Could not load Hill Torrents:', e.message);
    }
  }, []);

  // Setup Wapda Proposed layer (single fixed point - Sindh Barrage)
  const setupWapdaProposed = useCallback((map) => {
    const coordinates = [67.80059265, 24.358980]; // [lng, lat]
    if (!map.getSource('wapda-proposed-source')) {
      map.addSource('wapda-proposed-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Sindh Barrage' },
              geometry: { type: 'Point', coordinates },
            },
          ],
        },
      });
      map.addLayer({
        id: 'wapda-proposed-layer',
        type: 'circle',
        source: 'wapda-proposed-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 9,
          'circle-color': '#22c55e',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      });

      // Tooltip showing the barrage name
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'basin-tooltip',
        maxWidth: '220px',
      });
      const html = `
        <div style="padding:8px 12px;font-family:sans-serif;font-size:13px;background:#1e1e2e;color:#f0f0f0;border-radius:8px;line-height:1.5;">
          <div style="font-weight:700;color:#22c55e;font-size:14px;margin-bottom:4px;">Wapda Proposed</div>
          <div><span style="color:#8899aa;">Name:</span> Sindh Barrage Project</div>
          <div><span style="color:#8899aa;">Height:</span> 39.37000000000</div>
          <div><span style="color:#8899aa;">G_Storage:</span> 2.00000000000</div>
        </div>
      `;
      map.on('mouseenter', 'wapda-proposed-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
        popup.setLngLat(coordinates).setHTML(html).addTo(map);
      });
      map.on('mouseleave', 'wapda-proposed-layer', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      console.log('✓ Wapda Proposed (Sindh Barrage) layer loaded');
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
      'subBasins': ['sub-basins-fill', 'sub-basins-outline', 'sub-basins-labels'],
      'floodExtent': ['floodextend-layer', 'floodextend-outline'],
      'mainCanals': ['main-canals-layer', 'main-canals-labels'],
      'branchCanals': ['branch-canals-layer', 'branch-canals-labels'],
      'distributaryCanals': ['distributary-canals-layer', 'distributary-canals-labels'],
      'monsoonBasin': 'monsoon-basin-layer',
      'monsoonBasin2': 'monsoon-basin2-layer',
      'siteLocations': ['site-locations-fill', 'site-locations-outline'],
      'prioritySites': ['priority-sites-fill', 'priority-sites-outline'],
      'glacialBasins': ['glacial-basins-fill', 'glacial-basins-outline'],
      'hillTorrents': ['hill-torrents-fill', 'hill-torrents-outline'],
      'wapdaProposed': 'wapda-proposed-layer',
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
      'temperature': { prefix: 'temperature-', items: TIME_SERIES.temperature.map(t => t.id) },
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

      // Sub-Basins layer
      if (layerId === 'subBasins') {
        await setupSubBasins(map);
        loadedLayersCache.add('subBasins');
      }

      // Monsoon Basin layer
      if (layerId === 'monsoonBasin') {
        await setupMonsoonBasin(map);
        loadedLayersCache.add('monsoonBasin');
      }

      // Monsoon Basin 2 layer
      if (layerId === 'monsoonBasin2') {
        await setupMonsoonBasin2(map);
        loadedLayersCache.add('monsoonBasin2');
      }

      // Site Locations layer (polygons)
      if (layerId === 'siteLocations') {
        await setupSiteLocations(map);
        loadedLayersCache.add('siteLocations');
      }

      // Priority Site Locations layer (polygons)
      if (layerId === 'prioritySites') {
        await setupPrioritySites(map);
        loadedLayersCache.add('prioritySites');
      }

      // Glacial Basins layer (polygons)
      if (layerId === 'glacialBasins') {
        await setupGlacialBasins(map);
        loadedLayersCache.add('glacialBasins');
      }

      // Hill Torrents layer (polygons)
      if (layerId === 'hillTorrents') {
        await setupHillTorrents(map);
        loadedLayersCache.add('hillTorrents');
      }

      // Wapda Proposed layer (single point)
      if (layerId === 'wapdaProposed') {
        setupWapdaProposed(map);
        loadedLayersCache.add('wapdaProposed');
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
      if (layerId === 'temperature') {
        await setupTemperatureLayers(map);
        loadedLayersCache.add('temperature');
        // Immediately show the selected layer after setup
        const { timeSeriesSelections } = useMapStore.getState();
        const selectedMonth = timeSeriesSelections.temperature || TIME_SERIES.temperature[0].id;
        const tempLayerId = `temperature-${selectedMonth}`;
        if (map.getLayer(tempLayerId)) {
          map.setLayoutProperty(tempLayerId, 'visibility', 'visible');
          console.log(`✓ Showing Temperature layer: ${tempLayerId}`);
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

    // Zoom in on the Wapda Proposed point (Sindh Barrage) when enabled
    if (layerId === 'wapdaProposed' && visible) {
      map.flyTo({ center: [67.80059265, 24.358980], zoom: 13, essential: true });
    }
  }, [setupWfsLayers, setupMajorRivers, setupRiverLayers, setupRiverTributaries, setupMainCanals, setupBranchCanals, setupDistributaryCanals, setupSubBasins, setupMonsoonBasin, setupMonsoonBasin2, setupSiteLocations, setupPrioritySites, setupGlacialBasins, setupHillTorrents, setupWapdaProposed, setupIndustries, setupETLayers, setupPrecipitationLayers, setupSnowCoverLayers, setupTemperatureLayers, setupCoastalLayers]);

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
      'subBasins': ['sub-basins-fill', 'sub-basins-outline', 'sub-basins-labels'],
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

  // Resize map when CSS fullscreen changes so Mapbox redraws at new size
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.resize();
    }
  }, [mapFullscreen]);

  // Escape key exits CSS fullscreen
  useEffect(() => {
    if (!mapFullscreen) return;
    const handler = (e) => {
      if (e.key === 'Escape') setMapFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mapFullscreen, setMapFullscreen]);

  const moveLayer = (idx, direction) => {
    const newOrder = [...activeLayerOrder];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    reorderLayers(newOrder);
  };

  // Label lookup (recurses into nested sub-groups)
  const getLayerLabel = (id) => {
    const search = (layers) => {
      for (const l of layers) {
        if (l.isGroup && Array.isArray(l.layers)) {
          const nested = search(l.layers);
          if (nested) return nested;
        } else if (l.id === id) {
          return l.label;
        }
      }
      return null;
    };
    for (const group of Object.values(LAYER_GROUPS)) {
      const found = search(group.layers);
      if (found) return found;
    }
    return id;
  };

  // Cinematic tour: animate from Karachi to Gilgit on satellite, popping
  // tooltips of the currently-visible target layers as the camera passes over
  // their features. The user's own pitch/bearing/zoom are preserved.
  const runMapTour = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const { isTouring, setIsTouring } = useMapStore.getState();

    // Second trigger stops the tour
    if (isTouring) {
      tourCancelRef.current = true;
      setIsTouring(false);
      return;
    }

    const KARACHI = [67.05, 24.90];
    const GILGIT = [74.35, 35.92];
    const DURATION = 40000;

    // Move the camera Karachi -> Gilgit while keeping the user's angle/zoom.
    const flyThrough = () => {
      // Ease to the Karachi starting point without touching pitch/bearing/zoom
      map.flyTo({ center: KARACHI, duration: 1200, essential: true });
      map.once('moveend', () => {
        if (tourCancelRef.current) return;
        const startT = performance.now();
        const step = (now) => {
          if (tourCancelRef.current) return;
          const t = Math.min(1, (now - startT) / DURATION);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
          const lng = KARACHI[0] + (GILGIT[0] - KARACHI[0]) * e;
          const lat = KARACHI[1] + (GILGIT[1] - KARACHI[1]) * e;
          map.setCenter([lng, lat]);
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            tourCancelRef.current = false;
            setIsTouring(false);
          }
        };
        requestAnimationFrame(step);
      });
    };

    tourCancelRef.current = false;
    setIsTouring(true);

    // Start immediately at the user's current basemap / zoom / angle
    flyThrough();
  }, []);

  // Start/stop the tour whenever the sidebar Play button is pressed
  const tourTriggerRef = useRef(tourTrigger);
  useEffect(() => {
    if (tourTrigger === tourTriggerRef.current) return;
    tourTriggerRef.current = tourTrigger;
    runMapTour();
  }, [tourTrigger, runMapTour]);

  return (
    <div className="map-container">
      <div ref={mapContainerRef} className="map-canvas" />
      <MapControls />
      <PriorityLegend />
      <HillTorrentsLegend />
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
      <TimeSeriesController
        type="temperature"
        visible={layerVisibility.temperature}
      />

      <CatchmentInflowsModal />
      <LossesModal />
      <InflowsCompModal />
      <MonthlyInflowsModal />
      <ProjectionsModal />
      <IndDomModal />
      <AgriDemandModal />
      <SubBasinsModal />
      <DamLevelsModal />
      <div id="map-modal-portal" />

      {activeLayerOrder.length >= 2 && (
        <motion.div
          className="layer-order-panel"
          drag
          dragControls={layerOrderDragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
        >
          <div
            className="layer-order-panel-header"
            onPointerDown={(e) => layerOrderDragControls.start(e)}
            style={{ cursor: 'grab', touchAction: 'none' }}
          >
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
        </motion.div>
      )}
    </div>
  );
};

export default MapContainer;
