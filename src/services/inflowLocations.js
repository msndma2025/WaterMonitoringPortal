/*
 * Live inflow locations — dam / headwork positions + current status from the
 * upstream "hydro situation" snapshot, refreshed hourly.
 *
 * Each location is mapped (where possible) to a Hydro Analytics station name so
 * its historical monthly-MAF inflow/outflow series can be charted.
 */
import { HYDRO_STATIONS } from './hydroApi';

export const INFLOW_LOCATIONS_URL = 'https://cdn.jsdelivr.net/gh/Ibrahom1/hydrosituation@main/latest.json';

// Snapshot names that don't match the Hydro Analytics station list 1:1.
const API_NAME_OVERRIDES = {
  'Mangla Dam': 'Mangla',
  'Tarbela Dam': 'Tarbela',
  'Ganda Singh Wala': 'G.S. Wala',
  'Q.Abad': 'Qadirabad',
  'Chiniot Bridge': 'Chiniot',
  'Chattar Kallas': 'Chattar Kalas',
  'Partab Bridge (Bunji)': 'Partab Bridge',
  'KABUL': 'Nowshera', // Kabul-river gauge at Nowshera (34.01, 71.98)
};

// Key stations to highlight on the map: the five RIM Stations + Tarbela + Nowshera.
// Matched on the resolved Hydro-API station name.
export const HIGHLIGHT_STATIONS = new Set([
  'Kalabagh', 'Mangla', 'Marala', 'Jassar', 'G.S. Wala', 'Tarbela', 'Nowshera',
]);

const STATIONS_LOWER = new Map(HYDRO_STATIONS.map((s) => [s.toLowerCase(), s]));

// Resolve a snapshot location name to a Hydro-API station name (or null if none).
export function resolveApiName(name) {
  const n = String(name || '').trim();
  if (API_NAME_OVERRIDES[n]) return API_NAME_OVERRIDES[n];
  if (HYDRO_STATIONS.includes(n)) return n;
  const lc = STATIONS_LOWER.get(n.toLowerCase());
  if (lc) return lc;
  // Try stripping a trailing " Dam"/" Bridge" qualifier.
  const stripped = n.replace(/\s+(dam|bridge)\b.*$/i, '').trim();
  if (stripped && stripped !== n) return resolveApiName(stripped);
  return null;
}

// Flatten the snapshot JSON into a list of { id, kind, name, apiName, lat, lng, ... }.
export function parseInflowLocations(json) {
  const out = [];
  const push = (arr, kind) => {
    (arr || []).forEach((d) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return;
      const apiName = resolveApiName(d.name);
      out.push({
        id: `${kind}-${d.id ?? d.name}`,
        kind,
        name: String(d.name || '').trim(),
        apiName: apiName || '',
        highlight: !!apiName && HIGHLIGHT_STATIONS.has(apiName),
        lat,
        lng,
        river: d.area_name && d.area_name !== 'N/A' ? d.area_name : '',
        status: d.status || '',
        recordingTime: d.recording_time || d.inflow_time || '',
        inflowDischarge: d.inflow_discharge || '',
        inflowTrend: d.inflow_trend || '',
        outflowDischarge: d.outflow_discharge || '',
        outflowTrend: d.outflow_trend || '',
      });
    });
  };
  push(json?.dams?.dams, 'Dam');
  push(json?.headworks?.headworks, 'Headwork');
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Fetch + parse the snapshot into location objects.
export async function fetchInflowLocations() {
  const res = await fetch(INFLOW_LOCATIONS_URL);
  if (!res.ok) throw new Error(`Failed to load inflow locations (HTTP ${res.status})`);
  const json = await res.json();
  const list = parseInflowLocations(json);
  if (!list.length) throw new Error('No inflow locations in snapshot');
  return list;
}

// Build a GeoJSON FeatureCollection (point per location) for a Mapbox source.
export function locationsToGeoJSON(locations) {
  return {
    type: 'FeatureCollection',
    features: locations.map((loc) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      properties: { ...loc },
    })),
  };
}
