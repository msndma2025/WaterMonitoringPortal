/*
 * Hydro Analytics — Historical Data (MAF) API client.
 *
 * Reference: "For mudassir regarding api.pdf"
 * Upstream base URL: http://172.18.7.35:8000/proxy_api_daily
 *
 * In the browser we hit the relative "/hydro_api" path, which Vite (dev) or a
 * reverse proxy (prod) forwards to the upstream "/proxy_api_daily" base. This
 * keeps us same-origin and sidesteps CORS / mixed-content restrictions.
 *
 * Data model:
 *   - CSV archives cover 2014-01-01 -> 2025-08-18
 *   - SQLite (live FFD PMD ingest) covers 2025-08-19 -> present
 *   The API merges both and returns { inflow, outflow } series as
 *   [{ x: ISO-timestamp, y: cusecs }].
 */

// Configurable base; defaults to the Vite/reverse-proxy path.
export const HYDRO_API_BASE = import.meta.env.VITE_HYDRO_API_BASE || '/hydro_api';

// Earliest date the CSV archive covers (per the API docs).
export const HYDRO_DATA_START = '2014-01-01';

/* ── Accepted station names, grouped by river (Section 2 of the docs) ── */
export const HYDRO_STATION_GROUPS = [
  { river: 'Indus',      stations: ['Tarbela', 'Attock', 'Kalabagh', 'Chashma', 'Taunsa', 'Guddu', 'Sukkur', 'Kotri'] },
  { river: 'Jhelum',     stations: ['Kohala', 'Mangla', 'Rasul', 'Kotli'] },
  { river: 'Chenab',     stations: ['Marala', 'Khanki', 'Qadirabad', 'Chiniot', 'Trimmu', 'Panjnad', 'Jammu Tawi', 'Akhnur'] },
  { river: 'Ravi',       stations: ['Jassar', 'Shahdara', 'Balloki', 'Sidhnai'] },
  { river: 'Sutlej',     stations: ['Sulemanki', 'Islam', 'G.S. Wala', 'Bhakra'] },
  { river: 'Kabul',      stations: ['Nowshera'] },
  { river: 'Other',      stations: ['Chattar Kalas', 'Ravi Syphon', 'Partab Bridge'] },
];

// Flat list of every accepted station name.
export const HYDRO_STATIONS = HYDRO_STATION_GROUPS.flatMap((g) => g.stations);

/* ── Helpers ── */

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function getJSON(path) {
  const res = await fetch(`${HYDRO_API_BASE}${path}`);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error || body?.message || '';
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail || `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/history — combined CSV + DB inflow/outflow for a station (or all).
 *
 * @param {Object} opts
 * @param {string} [opts.name]       Station name, or "all" for every station.
 * @param {number} [opts.days]       Last N days from now (ignored if a date range is given).
 * @param {string} [opts.startDate]  YYYY-MM-DD (takes priority over `days`).
 * @param {string} [opts.endDate]    YYYY-MM-DD.
 * @param {AbortSignal} [opts.signal]
 */
export function getHistory({ name = 'all', days, startDate, endDate } = {}) {
  const query = buildQuery({ name, days, start_date: startDate, end_date: endDate });
  return getJSON(`/api/history${query}`);
}

/** GET /api/history-all — every station at once (identical to name=all). */
export function getHistoryAll({ days, startDate, endDate } = {}) {
  const query = buildQuery({ days, start_date: startDate, end_date: endDate });
  return getJSON(`/api/history-all${query}`);
}

/** GET /api/history-csv — CSV-only data (2014-01-01 .. 2025-08-18), for verification. */
export function getHistoryCsv({ name, startDate, endDate } = {}) {
  if (!name || !startDate || !endDate) {
    throw new Error('history-csv requires name, startDate and endDate');
  }
  const query = buildQuery({ name, start_date: startDate, end_date: endDate });
  return getJSON(`/api/history-csv${query}`);
}

/* ── Timestamp parsing ──
 * The API returns two timestamp shapes across its sources:
 *   - Live DB:  "05-Sep-2026 00:00 PKT"       (DD-Mon-YYYY HH:MM tz)
 *   - Docs/CSV: "2026-06-01T06:00:00" / "2024-06-15 06:00" (ISO-ish)
 * parseTimestamp normalises both to epoch-ms (or NaN if unparseable).
 */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

export function parseTimestamp(x) {
  if (x == null) return NaN;
  const s = String(x).trim();
  // Live format: DD-Mon-YYYY [HH:MM] (ignore the trailing tz label)
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon != null) {
      return new Date(+m[3], mon, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime();
    }
  }
  // ISO-ish format (docs / CSV verification endpoint)
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d) ? NaN : d.getTime();
}

/* ── MAF conversion ──
 * The docs give MAF_daily = Q_avg × T / D. In practical hydrology, a flow of
 * 1 cusec (cubic foot/second) sustained for one day equals 1.983471 acre-feet.
 *   1 acre-foot = 43,560 ft³, so volume(AF) = Σ flow(cfs) × dt(s) / 43560.
 */
export const CUSEC_SEC_TO_AF = 1 / 43560;
export const CUSEC_DAY_TO_AF = 86400 / 43560; // ≈ 1.983471 acre-feet
export const CUSEC_DAY_TO_MAF = CUSEC_DAY_TO_AF / 1e6;

/** Convert a single daily-average discharge (cusecs) to million acre-feet. */
export function cusecsToDailyMAF(cusecs) {
  if (cusecs == null || isNaN(cusecs)) return 0;
  return cusecs * CUSEC_DAY_TO_MAF;
}

/**
 * Total volume (MAF) of a flow series ([{ x, y(cusecs) }]) over its period.
 *
 * Points may be daily (CSV) or 6-hourly (live DB), so we integrate over the
 * actual time between consecutive samples (trapezoidal rule) rather than
 * assuming a fixed step. Falls back to treating each `y` as a daily average
 * when timestamps can't be parsed.
 */
export function seriesTotalMAF(series) {
  if (!Array.isArray(series) || series.length === 0) return 0;

  const pts = series
    .map((pt) => ({ t: parseTimestamp(pt?.x), y: Number(pt?.y) }))
    .filter((pt) => !isNaN(pt.y))
    .sort((a, b) => a.t - b.t);

  const timed = pts.filter((pt) => !isNaN(pt.t));
  if (timed.length < 2) {
    // Not enough timestamps to integrate — treat each sample as a daily mean.
    return pts.reduce((sum, pt) => sum + cusecsToDailyMAF(pt.y), 0);
  }

  let af = 0;
  for (let i = 1; i < timed.length; i++) {
    const dt = (timed[i].t - timed[i - 1].t) / 1000; // seconds
    if (dt <= 0) continue;
    const avgFlow = (timed[i].y + timed[i - 1].y) / 2; // cusecs
    af += avgFlow * dt * CUSEC_SEC_TO_AF;
  }
  return af / 1e6; // acre-feet → MAF
}

/**
 * Aggregate a flow series ([{ x, y(cusecs) }]) into per-calendar-month volume
 * in MAF. Each consecutive-sample volume (trapezoidal) is credited to the month
 * of the earlier sample, so all flow is accounted for.
 *
 * Returns an ascending array of { month: "YYYY-MM", maf: number }.
 */
export function seriesToMonthlyMAF(series) {
  if (!Array.isArray(series) || series.length === 0) return [];

  const pts = series
    .map((pt) => ({ t: parseTimestamp(pt?.x), y: Number(pt?.y) }))
    .filter((pt) => !isNaN(pt.y) && !isNaN(pt.t))
    .sort((a, b) => a.t - b.t);

  const monthKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const buckets = new Map(); // "YYYY-MM" -> acre-feet

  if (pts.length === 1) {
    buckets.set(monthKey(pts[0].t), cusecsToDailyMAF(pts[0].y) * 1e6);
  }

  for (let i = 1; i < pts.length; i++) {
    const dt = (pts[i].t - pts[i - 1].t) / 1000; // seconds
    if (dt <= 0) continue;
    const af = ((pts[i].y + pts[i - 1].y) / 2) * dt * CUSEC_SEC_TO_AF;
    const key = monthKey(pts[i - 1].t);
    buckets.set(key, (buckets.get(key) || 0) + af);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, af]) => ({ month, maf: af / 1e6 }));
}
