import { useEffect, useMemo, useRef, useState } from 'react';
import './WaterDemandChartV2.css';

// Spine source: Population + total Projected Water Availability (all years).
const CSV_URL = '/Updated_With_Population%202047.csv';

// Demand/availability sources, merged over the spine by year (field-level,
// first non-null wins). Add more here as data arrives; the parser is
// header-driven so column order/naming is flexible.
//   - For_Graph_333: full demand + sector availability, 2026–2030
//   - Updated_WATER 2047: per-sector availability only (no demand), 2031–2047
const ACTUALS_URLS = [
  '/Updated_Agri_total_Requirment_final.csv',
  '/For_Graph_333_Updated_With_Population.csv',
  '/Updated_WATER%202047.csv',
];

const COL = {
  agri: '#22d3ff',
  domestic: '#ff2d95',
  industrial: '#e9d700',
  requirement: '#ffd60a',
  available: '#f8fafc',
  gap: '#ff8a5c',
  s: '#ffffff',
  pending: '#7f95ad',
};

const DOTS = '...';

// Storage chart: each column's bar is split into dam sub-columns and its height
// reflects the total live storage. 2026–2031 has three dams; from 2032 two more
// come online (Diamer Basha, Mohmand). The Net Available box shows the total.
// Diverging palette (blue → yellow → red) across the five dams.
const STORAGE_DAMS_BASE = [
  { name: 'Mangla', value: 7.2, color: '#1565c0' },
  { name: 'Tarbela', value: 5.4, color: '#4fc3f7' },
  { name: 'Chashma', value: 0.82, color: '#7cfc00' },
];
const STORAGE_DAMS_EXTRA = [
  { name: 'Diamer Basha', value: 6, color: '#ff8f00' },
  { name: 'Mohmand', value: 1, color: '#d50000' },
];
const isDamYear = (y) => y >= 2026;
const damsFor = (y) => (y >= 2032 ? [...STORAGE_DAMS_BASE, ...STORAGE_DAMS_EXTRA] : STORAGE_DAMS_BASE);
const damTotalFor = (y) => damsFor(y).reduce((s, d) => s + d.value, 0);

// Manual overrides for displayed gap figures (year → gap value).
const GAP_OVERRIDE = { 2027: 26, 2029: 31, 2046: 44, 2047: 43 };

// Per-year manual bumps for the pink line (year → amount added to its number,
// which also lifts that point up the chart).
const PINK_EXTRA = { 2031: 6, 2040: 11, 2047: 16 };

// Draw the informal-storage (basins) boxes AND the pink line on the main WATER
// (MAF) axis (g.y), so each box is stacked directly on top of its formal-storage
// column — from g.y(damTotal) up to g.y(damTotal + MAF) — and the line rides the
// true cumulative tops (b.value). Set to false to revert to the old behaviour,
// where boxes/line floated above the columns on their own incremental
// ("difference") scale (pxPerMaf / b.topY).
const STORAGE_ORIGINAL_SCALE = true;

// Placeholder "S" segment values (year → value). Random for now — replace with
// real data when it arrives.
const S_VALUES = {
  2028: 5, 2029: 6, 2030: 6, 2031: 7, 2032: 7,
  2033: 8, 2034: 8, 2035: 9, 2036: 9, 2037: 10, 2038: 10, 2039: 11,
  2040: 11, 2041: 12, 2042: 12, 2043: 13, 2044: 13, 2045: 14,
  2046: 14, 2047: 15,
};

// Population gradient: blue → green → yellow → orange → red, spread across the
// full year range so the line reads as a rising blue-to-red trend.
const POP_STOPS = ['#2f80ff', '#39ff14', '#ffe500', '#ff8c00', '#ff2d2d'];
const hex2rgb = (h) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
const rgb2hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
function gradientColor(t, stops = POP_STOPS) {
  const c = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(c));
  const f = c - i;
  const a = hex2rgb(stops[i]);
  const b = hex2rgb(stops[i + 1]);
  return rgb2hex(a.map((v, k) => v + (b[k] - v) * f));
}

// Insert a sinusoidal trough between each pair of points (passes through both
// endpoints) so the connecting line reads as a wave, not a straight segment.
function wavyPoints(pts, amp, samples = 18) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const last = i === pts.length - 2;
    const n = samples + (last ? 1 : 0);
    // Alternate trough / crest each gap so the line reads as a sine wave
    // (down, up, down, ...) rather than a row of identical U dips.
    const dir = i % 2 === 0 ? 1 : -1;
    for (let s = 0; s < n; s++) {
      const t = s / samples;
      out.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t + dir * amp * Math.sin(Math.PI * t),
      });
    }
  }
  return out;
}

// Smooth (Catmull-Rom → Bézier) path through a set of points for a wavy line.
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// Linear interpolation of a { year: value } anchor map at a given year. Values
// before the first / after the last anchor clamp to that anchor.
function lerpMap(map, year) {
  const years = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (year <= years[0]) return map[years[0]];
  if (year >= years[years.length - 1]) return map[years[years.length - 1]];
  for (let j = 0; j < years.length - 1; j++) {
    const y0 = years[j];
    const y1 = years[j + 1];
    if (year >= y0 && year <= y1) {
      const f = (year - y0) / (y1 - y0);
      return map[y0] + (map[y1] - map[y0]) * f;
    }
  }
  return 0;
}

// Five-point star path centered at (cx, cy) with the given outer/inner radii.
function starPath(cx, cy, outer, inner) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
  }
  return d + 'Z';
}

// Extra MAF added on top of availability by the dams programme: 2 MAF per
// 2-year box from 2027, plus a further 7 MAF ("2 x Dams") from 2032.
function damAdd(year) {
  if (year < 2027) return 0;
  const maf = 2 * (Math.floor((year - 2027) / 2) + 1);
  const dams = year >= 2032 ? 7 : 0;
  return maf + dams;
}

// fixed per-year column width (px in viewBox units) so sizing stays constant
// and the chart scrolls horizontally instead of squeezing more years in.
const STEP = 150;

const fmt = (v) => Number(v).toFixed(2);
const num = (r, i) => (i >= 0 && r[i] !== undefined && r[i].trim() !== '' ? Number(r[i]) : null);

function parseSpine(text) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((r) => r.split(','));
  return rows
    .slice(1)
    .filter((r) => r[0] && r[0].trim() !== '')
    .map((r) => ({
      year: Number(r[0]),
      population: Number(r[1]),
      projAvail: Number(r[2]),
      agriAvail: null,
      domAvail: null,
      indAvail: null,
      agriDemand: null,
      domDemand: null,
      indDemand: null,
      netDemand: null,
      totalAvail: null,
    }));
}

// Header-driven parse of the availability/demand file → { [year]: {...} }.
function parseActuals(text) {
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  if (lines.length < 2) return {};
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (...names) => {
    for (const n of names) {
      const i = header.indexOf(n.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const col = {
    year: idx('year'),
    pop: idx('population (m)', 'population (million)', 'population'),
    totalA: idx('total availability', 'total_availability', 'projected water availability'),
    agriA: idx('agri availability', 'agriculture_availability', 'agri_availability', 'avil_agri'),
    domA: idx('domestic availability', 'domestic_availability', 'dom_availability'),
    indA: idx('industrial availability', 'industrial_availability', 'industry_availability'),
    agriD: idx('agriculture_demand', 'agri_demand', 'agri demand'),
    indD: idx('industial_demand', 'industrial_demand', 'industrial demand'),
    domD: idx('domestic_demand', 'dom_demand', 'domestic demand'),
    totalD: idx('total_requirement', 'total_demand', 'net_demand', 'total demand', 'total requirement'),
  };
  const map = {};
  for (const line of lines.slice(1)) {
    const r = line.split(',');
    const y = Number(r[col.year]);
    if (!y) continue;
    const agriD = num(r, col.agriD);
    const indD = num(r, col.indD);
    const domD = num(r, col.domD);
    map[y] = {
      totalAvail: num(r, col.totalA),
      agriAvail: num(r, col.agriA),
      domAvail: num(r, col.domA),
      indAvail: num(r, col.indA),
      agriDemand: agriD,
      indDemand: indD,
      domDemand: domD,
      netDemand:
        col.totalD >= 0
          ? num(r, col.totalD)
          : agriD != null && indD != null && domD != null
          ? agriD + indD + domD
          : null,
    };
  }
  return map;
}

// Merge several year-keyed actuals maps into one; first non-null value wins.
function mergeActualMaps(maps) {
  const out = {};
  for (const m of maps) {
    for (const [year, row] of Object.entries(m)) {
      const dst = out[year] || (out[year] = {});
      for (const [k, v] of Object.entries(row)) {
        if (v != null && dst[k] == null) dst[k] = v;
      }
    }
  }
  return out;
}

// Merge availability/demand into the spine; flag what each year actually has.
function buildData(spine, actuals) {
  return spine.map((d) => {
    const a = actuals[d.year] || {};
    const merged = { ...d, ...a };
    const hasSplit = merged.agriAvail != null && merged.domAvail != null && merged.indAvail != null;
    const hasDemand = merged.netDemand != null;
    // Storage chart: net available is the total live storage of the dams, so
    // each column's height varies with that total.
    const netAvail = isDamYear(d.year)
      ? damTotalFor(d.year)
      : merged.totalAvail != null
      ? merged.totalAvail
      : hasSplit
      ? merged.agriAvail + merged.domAvail + merged.indAvail
      : merged.projAvail;
    return { ...merged, hasSplit, hasDemand, netAvail };
  });
}

function WaterStorageChart({ scale = 1, full = false, fit = false, limited = false }) {
  const [allData, setData] = useState([]);
  const data = useMemo(
    () => (limited ? allData.filter((d) => d.year >= 2026 && d.year <= 2030) : allData),
    [allData, limited]
  );
  const [width, setWidth] = useState(900);
  const [stageH, setStageH] = useState(0);
  const [hover, setHover] = useState(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const stageRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const spineP = fetch(CSV_URL).then((r) => r.text()).then(parseSpine);
    const actualsP = Promise.all(
      ACTUALS_URLS.map((url) =>
        fetch(url)
          .then((r) => (r.ok ? r.text() : ''))
          .then((t) => (t ? parseActuals(t) : {}))
          .catch(() => ({}))
      )
    ).then(mergeActualMaps);
    Promise.all([spineP, actualsP])
      .then(([spine, actuals]) => setData(buildData(spine, actuals)))
      .catch((e) => console.warn('Could not load V2 chart data:', e.message));
  }, []);

  const updateScroll = () => {
    const el = stageRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollState({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
  };

  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setWidth(Math.max(280, Math.floor(rect.width) || 900));
      setStageH(Math.floor(rect.height) || 0);
      updateScroll();
    });
    ro.observe(el);
    updateScroll();
    return () => ro.disconnect();
  }, [data.length]);

  const scrollBy = (dir) => {
    const el = stageRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const g = useMemo(() => {
    if (!data.length) return null;
    const left = 100;
    const right = 40;
    const popBand = fit ? 195 : 185;
    const top = 40 + popBand;
    const bottomPad = 72;
    // Fit mode: squeeze every year into the visible width (no scrolling).
    const contentWidth = fit ? width : Math.max(width, left + right + data.length * STEP);
    // Windowed full-width fit fills the whole modal: match the viewBox aspect to
    // the measured stage box so the chart covers both width and height (no side
    // or top/bottom letterbox). Other modes use fixed proportions.
    const fillBox = fit && !full && stageH > 0;
    const plotH = fillBox
      ? Math.max(120, stageH * (contentWidth / width) - top - bottomPad)
      : fit
      ? 820
      : 560;
    const bottom = top + plotH;
    const chartH = bottom + bottomPad;
    const plotW = contentWidth - left - right;
    const step = plotW / data.length;
    const xFor = (i) => left + (i + 0.5) * step;
    // Keep a clear gap between columns, even when squeezed to fit.
    const colGap = Math.min(step * 0.4, Math.max(step * 0.28, 14));
    const boxW = step - colGap;
    const boxLeftFor = (i) => left + i * step + colGap / 2;
    // Storage chart: scale the y-axis to the dam-storage totals so the columns
    // fill roughly the lower half; the informal-storage boxes sit above with
    // their own height scale.
    const availMax = Math.max(...data.map((d) => d.netAvail));
    const yMax = Math.max(5, Math.ceil(availMax * 1.95));
    const y = (v) => top + ((yMax - v) / yMax) * plotH;

    const popMin = Math.min(...data.map((d) => d.population));
    const popMax = Math.max(...data.map((d) => d.population));
    const popRange = popMax - popMin || 1;
    // Big vertical sweep so the rising population reads as a clear wavy curve,
    // not a shallow near-flat diagonal. Capped so the top value label keeps
    // clearance inside the population band.
    const popVariation = 82;
    const yPopBarTop = (v) => top - 60 - ((v - popMin) / popRange) * popVariation;

    return { left, right, plotW, top, plotH, bottom, chartH, contentWidth, step, xFor, boxW, boxLeftFor, yMax, y, yPopBarTop, popBand };
  }, [width, data, fit, full, stageH]);

  if (!data.length || !g) {
    return (
      <section className="wdg"><p className="loading">Loading data…</p></section>
    );
  }

  // In scroll mode fonts stay full-size (the maximized look). In fit mode the
  // columns are squeezed, so shrink labels proportionally to keep them legible.
  const fontMult = fit ? scale * Math.min(1, g.contentWidth / 1360) : scale;
  const fs = (n) => n * fontMult;

  // Per-year color along the blue→red population gradient.
  const yc = (i) => gradientColor(data.length <= 1 ? 0 : i / (data.length - 1));

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * g.yMax));

  const sectors = [
    { key: 'agriAvail', label: 'Agri Water', name: 'Agri', short: 'A', color: COL.agri },
    { key: 'domAvail', label: 'Domestic Water', name: 'Domestic', short: 'D', color: COL.domestic },
    { key: 'indAvail', label: 'Industrial Water', name: 'Industrial', short: 'I', color: COL.industrial },
  ];

  const anyNoDemand = data.some((d) => !d.hasDemand);

  const hd = hover != null ? data[hover] : null;
  const ttW = 240;
  const hx = hover != null ? g.xFor(hover) : 0;
  const placeRight = hover != null && g.contentWidth - (hx + g.step / 2 + 16) >= ttW;
  const ttLeft = hover != null ? (placeRight ? hx + g.step / 2 + 16 : hx - g.step / 2 - 16) : 0;
  const ttTransform = placeRight ? 'translate(0,0)' : 'translate(-100%,0)';

  const renderColumn = (d, i) => {
    const availTop = g.y(d.netAvail);
    const h = g.bottom - availTop;
    const boxW = g.boxW;
    const boxLeft = g.boxLeftFor(i);
    const cxc = boxLeft + boxW / 2;
    const cyMid = availTop + h / 2;
    const greenCx = d.hasSplit ? boxLeft + ((d.agriAvail / d.netAvail) * boxW) / 2 : cxc;

    // Requirement box / gap region removed for the storage chart.
    const demandEls = null;

    // --- availability region ---
    let availEls;
    if (isDamYear(d.year)) {
      // Storage view: split the bar into vertical dam sub-columns (widths
      // proportional to each dam's storage).
      const dams = damsFor(d.year);
      const damTotal = damTotalFor(d.year);
      let cx = boxLeft;
      availEls = dams.map((dam, di) => {
        const w = (dam.value / damTotal) * boxW;
        const x0 = cx;
        cx += w;
        return (
          <rect key={dam.name} x={x0} y={availTop} width={w} height={h} fill={dam.color} stroke={dam.color} strokeWidth="1.4" />
        );
      });
    } else if (d.hasSplit) {
      let cx = boxLeft;
      availEls = sectors.map((s) => {
        const w = (d[s.key] / d.netAvail) * boxW;
        const x0 = cx;
        const segCx = cx + w / 2;
        cx += w;
        const wide = w >= 20;
        const isDom = s.key === 'domAvail';
        const isAgri = s.key === 'agriAvail';
        const lblColor = isDom ? COL.domestic : COL.industrial;
        const sName = isAgri ? 'Agri' : fit ? s.short : s.name;
        const lead = fit ? 30 : 58;
        const val = Number(d[s.key]).toFixed(1);
        const wideLabel = `${sName}: ${val}`;
        // Two-line label ("D" / number below) in fit mode; single line otherwise.
        const leaderLabel = (lx, ly) =>
          fit ? (
            <g>
              <circle cx={lx} cy={ly + fs(12)} r={fs(16)} fill="#000000" />
              <text x={lx} y={ly} fontWeight="bold" fontSize={fs(20)} textAnchor="middle" dominantBaseline="central" style={{ fill: lblColor, stroke: '#000000', strokeWidth: 0.9, paintOrder: 'stroke' }}>
                <tspan x={lx} dy={fs(-17)}>{sName}</tspan>
                <tspan x={lx} dy={fs(29)}>{val}</tspan>
              </text>
            </g>
          ) : (
            <text x={lx} y={ly} fontWeight="bold" fontSize={fs(20)} textAnchor="middle" dominantBaseline="central" style={{ fill: lblColor, stroke: '#000000', strokeWidth: 0.9, paintOrder: 'stroke' }}>
              <tspan fontSize={isDom ? fs(13) : fs(15)}>{sName}:</tspan> {val}
            </text>
          );
        return (
          <g key={s.key}>
            <rect x={x0} y={availTop} width={w} height={h} fill={s.color} fillOpacity={isAgri ? 0.92 : 0.55} stroke={s.color} strokeWidth="1.4" style={{ filter: `drop-shadow(0 0 6px ${s.color})` }} />
            {wide ? (
              <text x={segCx} y={cyMid + fs(15)} fontWeight="900" fontSize={fs(26)} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${segCx} ${cyMid + fs(15)})`} style={{ fill: '#000000' }}>{wideLabel}</text>
            ) : isDom ? (
              <g>
                <line x1={greenCx + lead} y1={availTop + fs(50) + 10} x2={segCx} y2={availTop + fs(50) + 10} stroke={lblColor} strokeWidth="1.6" />
                {leaderLabel(greenCx, availTop + fs(50) + 10)}
              </g>
            ) : (
              <g>
                <line x1={greenCx + lead} y1={availTop + h - 30 - 10} x2={segCx} y2={availTop + h - 30 - 10} stroke={lblColor} strokeWidth="1.6" />
                {leaderLabel(greenCx, availTop + h - 30 - 10)}
              </g>
            )}
          </g>
        );
      });
    } else {
      availEls = (
        <g>
          <rect x={boxLeft} y={availTop} width={boxW} height={h} fill="url(#v2-pending-hatch)" stroke={COL.available} strokeOpacity="0.55" strokeWidth="1.4" style={{ filter: 'drop-shadow(0 0 6px rgba(248,250,252,0.35))' }} />
          <text x={cxc} y={cyMid} fontWeight="900" fontSize={fs(40)} letterSpacing={fs(3)} textAnchor="middle" dominantBaseline="central" style={{ fill: '#dbe7f3', paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5 }}>{DOTS}</text>
        </g>
      );
    }

    // --- Net Available label box (real total; dam sum for storage years) ---
    const availTotal = isDamYear(d.year) ? damTotalFor(d.year).toFixed(2) : Math.round(d.netAvail);
    const label = fit ? `${availTotal}` : `Aval: ${availTotal}`;
    const tH = fs(30);
    const bW = Math.min(label.length * fs(11.5) + fs(18), boxW);
    const bX = cxc - bW / 2;

    return (
      <>
        {demandEls}
        {availEls}
        <g>
          <rect x={bX} y={availTop - tH} width={bW} height={tH} fill="rgba(4,18,31,0.55)" stroke="#000000" strokeWidth="2" strokeDasharray="6 4" />
          <text x={cxc} y={availTop - tH / 2} fill="#ffffff" fontSize={fs(20)} fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5, filter: 'drop-shadow(0 0 7px rgba(255,255,255,0.9))' }}>{label}</text>
        </g>
      </>
    );
  };

  return (
    <section className={`wdg${full || fit ? ' wdg-lg-legend' : ''}`} style={{ '--font-size-base': `${18 * fontMult}px` }} aria-label="Water demand vs availability with population per year">
      <div className="wdg-legend">
        <div className="wdg-legend-group">
          {[...STORAGE_DAMS_BASE, ...STORAGE_DAMS_EXTRA].map((dam) => (
            <span className="wdg-legend-item" key={dam.name}>
              <span className="wdg-swatch" style={{ background: dam.color }} aria-hidden="true" />
              <span>{dam.name}</span>
            </span>
          ))}
          <span className="wdg-legend-item"><span className="wdg-line-key" style={{ borderImage: `linear-gradient(90deg, ${POP_STOPS.join(',')}) 1`, borderTopStyle: 'solid' }} aria-hidden="true" /><span>Population</span></span>
        </div>
        {anyNoDemand && <span className="wdg-note">Demand &amp; gap ( {DOTS} ) — data pending</span>}
      </div>

      <div className="wdg-stage-wrap">
        {!fit && (
          <>
            <button
              type="button"
              className="wdg-scroll-btn left"
              onClick={() => scrollBy(-1)}
              disabled={!scrollState.left}
              aria-label="Scroll left"
            >
              <i className="fas fa-chevron-left" />
            </button>
            <button
              type="button"
              className="wdg-scroll-btn right"
              onClick={() => scrollBy(1)}
              disabled={!scrollState.right}
              aria-label="Scroll right"
            >
              <i className="fas fa-chevron-right" />
            </button>
          </>
        )}

        <div
          className={`wdg-stage${fit ? ' wdg-stage--fit' : ''}`}
          ref={stageRef}
          onScroll={updateScroll}
          style={{ '--wdg-svg-h': full ? 'min(80vh, 900px)' : 'min(58vh, 560px)' }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${g.contentWidth} ${g.chartH}`}
            role="img"
            aria-label="Water demand vs availability per year with population"
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <pattern id="v2-gap-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="9" height="9" fill={COL.gap} fillOpacity="0.12" />
                <line x1="0" y1="0" x2="0" y2="9" stroke={COL.gap} strokeWidth="1.8" opacity="0.75" />
              </pattern>
              <pattern id="v2-basins-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#ffd60a" />
                <path d="M8,0 l-8,8" stroke="#1e63ff" strokeWidth="0.35" opacity="0.85" />
              </pattern>
              <pattern id="v2-dam-crosshatch" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#7CFC00" fillOpacity="0.55" />
                <path d="M0,0 l8,8 M8,0 l-8,8" stroke="#0b6623" strokeWidth="1.1" opacity="0.85" />
              </pattern>
              <pattern id="v2-pending-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="10" height="10" fill={COL.pending} fillOpacity="0.14" />
                <line x1="0" y1="0" x2="0" y2="10" stroke={COL.pending} strokeWidth="1.6" opacity="0.5" />
              </pattern>
              <linearGradient id="v2-pop-grad" gradientUnits="userSpaceOnUse" x1={g.left} y1="0" x2={g.left + g.plotW} y2="0">
                {POP_STOPS.map((c, i) => (
                  <stop key={c} offset={`${(i / (POP_STOPS.length - 1)) * 100}%`} stopColor={c} />
                ))}
              </linearGradient>
            </defs>

            <rect x={g.left} y={g.top} width={g.plotW} height={g.bottom - g.top} rx="12" fill="var(--wdg-plot)" stroke="var(--wdg-grid)" strokeWidth="1" />

            {ticks.map((v) => {
              const y = g.y(v);
              return (
                <g key={`t-${v}`}>
                  <line x1={g.left} y1={y} x2={g.left + g.plotW} y2={y} stroke="var(--wdg-grid)" strokeWidth="1" />
                  <text x={g.left - 9} y={y} className="wdg-secondary" fontSize="42" fontWeight="700" textAnchor="end" dominantBaseline="middle">{v}</text>
                </g>
              );
            })}

            {data.map((_, i) => (
              <line key={`sep-${i}`} x1={g.left + i * g.step} y1={g.top} x2={g.left + i * g.step} y2={g.bottom} stroke="var(--wdg-grid)" strokeWidth="1" opacity="0.6" />
            ))}

            {hover != null && (
              <rect x={g.left + hover * g.step + 1} y={g.top} width={g.step - 2} height={g.bottom - g.top} rx="8" fill="var(--wdg-selected)" />
            )}

            <rect x={g.left} y={g.top - g.popBand} width={g.plotW} height={g.popBand} rx="12" fill="var(--wdg-plot)" stroke="var(--wdg-grid)" strokeWidth="1" />

            <g className="wdg-pop-anim">
              <text x={g.left + g.plotW / 2} y={g.top - g.popBand + 12} fontSize={fs(20)} fontWeight="800" textAnchor="middle" dominantBaseline="middle" style={{ fill: '#ffffff', paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5 }}>Population (Million)</text>
              {(() => {
                const pts = data.map((d, i) => ({ x: g.xFor(i), y: g.yPopBarTop(d.population) }));
                const linePath = 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ');
                return (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#v2-pop-grad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })()}
              {data.map((d, i) => {
                const col = yc(i);
                const px = g.xFor(i);
                const py = g.yPopBarTop(d.population);
                return (
                  <g key={`pop-${i}`}>
                    <circle cx={px} cy={py} r="5.5" fill={col} stroke="#04121f" strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
                    <text x={px} y={py - 24} fontSize={fs(fit ? 19 : 28)} fontWeight="900" textAnchor="middle" dominantBaseline="middle" style={{ fill: col, paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5 }}>{fit ? Math.round(d.population) : fmt(d.population)}</text>
                  </g>
                );
              })}
            </g>

            {data.map((d, i) => (
              <g key={`box-${i}`} className="wdg-col" style={{ animationDelay: `${i * 45}ms` }}>
                {renderColumn(d, i)}
              </g>
            ))}

            {/* Informal-storage (basins) boxes stacked on top of each column:
                height = the box's MAF, yellow-hatched, with the white line on top. */}
            {(() => {
              const tHbox = fs(30); // total box height on top of each column
              const boxes = [];
              const years = data.map((d) => d.year);
              const lastYear = years[years.length - 1];
              // Common baseline for every box, floating above the tallest column.
              const maxTotal = Math.max(...data.map((d) => d.netAvail));
              const baseY = g.y(maxTotal) - tHbox - fs(40);
              // Box heights use their own scale so the columns keep the lower half.
              const nBoxes = Math.floor((lastYear - 2027) / 2) + 1;
              const maxMaf = 2 * nBoxes;
              const pxPerMaf = (baseY - (g.top + fs(34))) / maxMaf;
              const span = (y0, y1, k) => {
                const a = years.indexOf(y0);
                const b = years.indexOf(y1);
                if (a < 0 || b < 0) return;
                const left = g.xFor(a) - g.boxW / 2;
                const right = g.xFor(b) + g.boxW / 2;
                const total = damTotalFor(y0);
                const maf = 2 * (k + 1);
                // Original scale: top stays true (g.y(total + maf), so it rides the
                // pink line / printed value); the bottom floats just above the
                // column's net-available label (g.y(total) minus the label height +
                // a small gap) so the dam bars and their values below stay visible.
                // A minimum height keeps the smallest box (2 MAF) from collapsing.
                // Difference scale: all boxes share baseY, height scaled by MAF.
                const labelClear = fs(30) + fs(8);
                // The first few boxes (small MAF) are too short for the two-line
                // label, so give them a taller minimum height.
                const minH = k < 3 ? fs(72) : fs(28);
                const topY = STORAGE_ORIGINAL_SCALE ? g.y(total + maf) : baseY - maf * pxPerMaf;
                const bottomY = STORAGE_ORIGINAL_SCALE
                  ? Math.max(g.y(total) - labelClear, topY + minH)
                  : baseY;
                boxes.push({ key: `basins-${y0}`, x: left, w: right - left, cx: (left + right) / 2, k, maf, value: total + maf, topY, bottomY });
              };
              let k = 0;
              for (let y = 2027; y <= lastYear; y += 2) span(y, Math.min(y + 1, lastYear), k++);
              const amp = Math.min(g.step * 0.05, 4);
              const linePts = boxes.map((b) => ({
                x: b.cx,
                y: STORAGE_ORIGINAL_SCALE ? g.y(b.value) : b.topY - fs(10),
              }));
              const linePath = smoothPath(wavyPoints(linePts, amp));
              return (
                <>
                  {boxes.map((b) => (
                    <g key={b.key}>
                      <rect x={b.x} y={b.topY} width={b.w} height={b.bottomY - b.topY} fill="url(#v2-basins-hatch)" stroke="#b38f00" strokeWidth="1.4" />
                      {(() => {
                        const cy = (b.topY + b.bottomY) / 2;
                        const mafText = `${2 * (b.k + 1)} MAF`;
                        return (
                          <>
                            <text x={b.cx} y={cy - fs(15)} fontSize={fs(19)} fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ fill: '#ffffff', paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3 }}>{`${9 * (b.k + 1)} Basins`}</text>
                            <ellipse cx={b.cx} cy={cy + fs(15)} rx={fs(mafText.length * 6.2 + 9)} ry={fs(18)} fill="#000000" stroke="#ff0000" strokeWidth={fs(4.5)} />
                            <text x={b.cx} y={cy + fs(15)} fontSize={fs(19)} fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ fill: '#ffffff', paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3 }}>{mafText}</text>
                          </>
                        );
                      })()}
                    </g>
                  ))}
                  <path d={linePath} fill="none" stroke="#ff2d95" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {boxes.map((b, idx) => (
                    <g key={`line-${b.key}`}>
                      <circle cx={b.cx} cy={linePts[idx].y} r={fs(4)} fill="#ff2d95" stroke="#04121f" strokeWidth="1.2" />
                      <text x={b.cx} y={linePts[idx].y - fs(idx === 0 ? 42 : idx % 2 === 0 ? 22 : 34)} fontSize={fs(22)} fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ fill: '#ffffff', paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3 }}>{b.value.toFixed(2)}</text>
                    </g>
                  ))}
                </>
              );
            })()}

            <text x={20} y={(g.top + g.bottom) / 2} className="wdg-secondary" fontSize="42" fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 20 ${(g.top + g.bottom) / 2})`}>WATER (MAF)</text>
            {(() => {
              const xR = g.contentWidth - 20;
              const availTopTallest = g.y(Math.max(...data.map((d) => d.netAvail)));
              const yInf = g.top + (availTopTallest - g.top) * 0.35; // against the line + boxes (upper)
              const yFor = (availTopTallest + g.bottom) / 2; // against the columns (lower)
              return (
                <>
                  <text x={xR} y={yInf} className="wdg-secondary" fontSize="30" fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 ${xR} ${yInf})`}>Informal Storage</text>
                  <text x={xR} y={yFor} className="wdg-secondary" fontSize="30" fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 ${xR} ${yFor})`}>Formal Storage</text>
                </>
              );
            })()}

            {data.map((d, i) => {
              const col = yc(i);
              return (
                <text key={`yl-${i}`} x={g.xFor(i)} y={g.bottom + 42} textAnchor="middle" dominantBaseline="middle" fontWeight="900" style={{ fontSize: `${fs(22)}px`, fill: col, paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5, filter: `drop-shadow(0 0 6px ${col})` }}>{d.year}</text>
              );
            })}

            {data.map((_, i) => (
              <rect key={`hit-${i}`} x={g.left + i * g.step} y={g.top} width={g.step} height={g.bottom - g.top} fill="transparent" onPointerEnter={() => setHover(i)} />
            ))}

            {hd && (
              <foreignObject x={ttLeft} y={g.top + 6} width={ttW} height={340} style={{ overflow: 'visible', pointerEvents: 'none' }}>
                <div className="wdg-tooltip is-visible" style={{ width: `${ttW}px`, transform: ttTransform, position: 'static' }} role="status">
                  <div className="wdg-tt-head">
                    <strong>{hd.year}</strong>
                    <span className="wdg-tt-sub">Live storage by dam</span>
                  </div>
                  {damsFor(hd.year).map((dam) => (
                    <div className="wdg-tt-row" key={dam.name}>
                      <span className="wdg-tt-dot" style={{ background: dam.color, boxShadow: `0 0 8px ${dam.color}` }} />
                      <span className="wdg-tt-label">{dam.name}</span>
                      <span className="wdg-tt-val">{dam.value.toFixed(2)} MAF</span>
                    </div>
                  ))}
                  <div className="wdg-tt-row">
                    <span className="wdg-tt-dot" style={{ borderRadius: 0, background: 'transparent', height: 0, borderTop: `3px solid ${COL.available}` }} />
                    <span className="wdg-tt-label">Total</span>
                    <span className="wdg-tt-val">{damTotalFor(hd.year).toFixed(2)} MAF</span>
                  </div>
                  <div className="wdg-tt-row">
                    <span className="wdg-tt-dot" style={{ background: yc(hover), boxShadow: `0 0 8px ${yc(hover)}` }} />
                    <span className="wdg-tt-label">Population</span>
                    <span className="wdg-tt-val">{fmt(hd.population)}M</span>
                  </div>
                </div>
              </foreignObject>
            )}
          </svg>
        </div>
      </div>
    </section>
  );
}

export default WaterStorageChart;
