import { useEffect, useMemo, useRef, useState } from 'react';
import './WaterDemandChartV2.css';

const CSV_URL = '/For_Graph_333_Updated_With_Population.csv';

const COL = {
  agri: '#00ffa3',
  domestic: '#ff2d95',
  industrial: '#22d3ff',
  requirement: '#ffd60a',
  available: '#f8fafc',
  gap: '#ff8a5c',
};

// per-year population line colors (cycles if more years are added)
const YEAR_COLORS = ['#00ffc8', '#ffe500', '#ff3d9a', '#39ff14', '#b026ff'];
const yearColor = (i) => YEAR_COLORS[i % YEAR_COLORS.length];

const fmt = (v) => Number(v).toFixed(2);

function parseCSV(text) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((r) => r.split(','));
  return rows
    .slice(1)
    .filter((r) => r[0] && r[0].trim() !== '')
    .map((r) => ({
      year: Number(r[0]),
      population: Number(r[10]),
      agriAvail: Number(r[4]),
      domAvail: Number(r[6]),
      indAvail: Number(r[5]),
      agriDemand: Number(r[1]),
      domDemand: Number(r[3]),
      indDemand: Number(r[2]),
      netDemand: Number(r[7]),
    }))
    .map((d) => ({ ...d, netAvail: d.agriAvail + d.domAvail + d.indAvail }));
}

function WaterDemandChartV2({ scale = 1 }) {
  const [data, setData] = useState([]);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState(null);
  const stageRef = useRef(null);
  const svgRef = useRef(null);

  // Font scales with the chart width so labels stay proportional. Calibrated
  // to the maximized stage width (~1360px) — at/above that it equals `scale`
  // (the current maximized look); narrower views shrink proportionally.
  const fontMult = scale * Math.min(1, width / 1360);
  const fs = (n) => n * fontMult;

  useEffect(() => {
    fetch(CSV_URL)
      .then((r) => r.text())
      .then((t) => setData(parseCSV(t)))
      .catch((e) => console.warn('Could not load V2 chart CSV:', e.message));
  }, []);

  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const ro = new ResizeObserver(() => {
      const w = Math.max(280, Math.floor(el.getBoundingClientRect().width) || 900);
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.length]);

  const g = useMemo(() => {
    if (!data.length) return null;
    const compact = width < 560;
    const left = compact ? 66 : 100;
    const right = compact ? 26 : 40;
    const plotW = width - left - right;
    const popBand = compact ? 66 : 84;
    const top = 40 + popBand;
    const plotH = compact ? 360 : 450;
    const bottom = top + plotH;
    const chartH = bottom + 72;
    const step = plotW / data.length;
    const xFor = (i) => left + (i + 0.5) * step;
    const yMax = Math.max(20, Math.ceil(Math.max(...data.map((d) => d.netDemand)) / 20) * 20 + 20);
    const y = (v) => top + ((yMax - v) / yMax) * plotH;

    const popMin = Math.min(...data.map((d) => d.population));
    const popMax = Math.max(...data.map((d) => d.population));
    const popRange = popMax - popMin || 1;
    const popVariation = compact ? 18 : 30;
    const yPopBarTop = (v) => top - 12 - ((v - popMin) / popRange) * popVariation;

    return { compact, left, right, plotW, top, plotH, bottom, chartH, step, xFor, yMax, y, yPopBarTop, popBand };
  }, [width, data]);

  if (!data.length || !g) {
    return (
      <section className="wdg"><p className="loading">Loading data…</p></section>
    );
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * g.yMax));

  const sectors = [
    { key: 'agriAvail', reqKey: 'agriDemand', label: 'Agri Availability', name: 'Agri', color: COL.agri },
    { key: 'domAvail', reqKey: 'domDemand', label: 'Domestic Availability', name: 'Domestic', color: COL.domestic },
    { key: 'indAvail', reqKey: 'indDemand', label: 'Industrial Availability', name: 'Industrial', color: COL.industrial },
  ];

  const hd = hover != null ? data[hover] : null;
  const hx = hover != null ? g.xFor(hover) : 0;
  const ttW = 240;
  const placeRight = hover != null && width - (hx + g.step / 2 + 16) >= ttW;
  const ttLeft = hover != null ? (placeRight ? hx + g.step / 2 + 16 : hx - g.step / 2 - 16) : 0;
  const ttTransform = placeRight ? 'translate(0,0)' : 'translate(-100%,0)';

  return (
    <section className="wdg" style={{ '--font-size-base': `${18 * fontMult}px` }} aria-label="Sector availability proportion with net requirement and gap">
      <div className="wdg-legend">
        <div className="wdg-legend-group">
          {sectors.map((s) => (
            <span className="wdg-legend-item" key={s.key}>
              <span className="wdg-swatch" style={{ background: s.color }} aria-hidden="true" />
              <span>{s.label}</span>
            </span>
          ))}
          <span className="wdg-legend-item"><span className="wdg-line-key wdg-demand-key" style={{ borderTopColor: COL.requirement }} aria-hidden="true" /><span>Net Requirement</span></span>
          <span className="wdg-legend-item"><span className="wdg-line-key" style={{ borderTopColor: COL.available }} aria-hidden="true" /><span>Net Available</span></span>
          <span className="wdg-legend-item"><span className="wdg-swatch" style={{ background: 'rgba(255,138,92,0.4)' }} aria-hidden="true" /><span>Gap</span></span>
          <span className="wdg-legend-item"><span className="wdg-line-key" style={{ borderTopColor: YEAR_COLORS[0] }} aria-hidden="true" /><span>Population</span></span>
        </div>
      </div>

      <div className="wdg-stage" ref={stageRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${g.chartH}`}
          role="img"
          aria-label="Sector availability proportion per year with net requirement and gap"
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <pattern id="v2-gap-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="9" height="9" fill={COL.gap} fillOpacity="0.12" />
              <line x1="0" y1="0" x2="0" y2="9" stroke={COL.gap} strokeWidth="1.8" opacity="0.75" />
            </pattern>
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

          <g>
            <text x={g.left + 10} y={g.top - g.popBand + (g.compact ? 10 : 12)} fontSize={fs(20)} fontWeight="800" textAnchor="start" dominantBaseline="middle" style={{ fill: '#ffffff', paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }}>Population (Million)</text>
            {(() => {
              const pts = [
                { x: g.left, y: g.yPopBarTop(data[0].population), col: yearColor(0) },
                ...data.map((d, i) => ({ x: g.xFor(i), y: g.yPopBarTop(d.population), col: yearColor(i) })),
                { x: g.left + g.plotW, y: g.yPopBarTop(data[data.length - 1].population), col: yearColor(data.length - 1) },
              ];
              return pts.slice(0, -1).map((p, i) => {
                const n = pts[i + 1];
                return (
                  <line key={`popseg-${i}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={n.col} strokeWidth="2.6" opacity="0.9" style={{ filter: `drop-shadow(0 0 6px ${n.col})` }} />
                );
              });
            })()}
            {data.map((d, i) => {
              const col = yearColor(i);
              const px = g.xFor(i);
              const py = g.yPopBarTop(d.population);
              return (
                <g key={`pop-${i}`}>
                  <circle cx={px} cy={py} r="5.5" fill={col} stroke="#04121f" strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
                  <text x={px} y={py - 24} fontSize={fs(22)} fontWeight="900" textAnchor="middle" dominantBaseline="middle" style={{ fill: col, paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5, filter: `drop-shadow(0 0 6px ${col})` }}>{fmt(d.population)}</text>
                </g>
              );
            })}
          </g>

          {data.map((d, i) => {
            const topY = g.y(d.netAvail);
            const h = g.bottom - topY;
            const boxW = g.step * 0.82;
            const boxLeft = g.left + i * g.step + (g.step - boxW) / 2;
            const cy = topY + h / 2;
            const greenCx = boxLeft + ((d.agriAvail / d.netAvail) * boxW) / 2;
            const reqTop = g.y(d.netDemand);
            const reqH = g.bottom - reqTop;
            let cx = boxLeft;
            return (
              <g key={`box-${i}`}>
                <g>
                  <rect x={boxLeft} y={reqTop} width={boxW} height={reqH} fill={COL.requirement} fillOpacity="0.12" stroke={COL.requirement} strokeOpacity="0.85" strokeWidth="1.8" strokeDasharray="6 4" style={{ filter: `drop-shadow(0 0 6px ${COL.requirement})` }} />
                  <rect x={boxLeft} y={reqTop} width={boxW} height={topY - reqTop} fill="url(#v2-gap-hatch)" />
                  <text x={boxLeft + boxW / 2} y={reqTop - 10} fill={COL.requirement} fontSize={fs(21)} fontWeight="800" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5, filter: `drop-shadow(0 0 6px ${COL.requirement})` }}>Req: {Math.round(d.netDemand)}</text>
                  <text x={boxLeft + boxW / 2} y={(reqTop + topY) / 2} fill={COL.gap} fontSize={fs(21)} fontWeight="800" textAnchor="middle" dominantBaseline="middle" style={{ paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 4, filter: `drop-shadow(0 0 8px ${COL.gap})` }}>Gap: {Math.round(d.netDemand - d.netAvail)}</text>
                </g>
                {sectors.map((s) => {
                  const w = (d[s.key] / d.netAvail) * boxW;
                  const x0 = cx;
                  const segCx = cx + w / 2;
                  cx += w;
                  const wide = w >= 20;
                  const isDom = s.key === 'domAvail';
                  const lblColor = isDom ? '#8b0000' : '#00008b';
                  return (
                    <g key={s.key}>
                      <rect x={x0} y={topY} width={w} height={h} fill={s.color} fillOpacity="0.55" stroke={s.color} strokeWidth="1.4" style={{ filter: `drop-shadow(0 0 6px ${s.color})` }} />
                      {wide ? (
                        <text x={segCx} y={cy + fs(15)} fontWeight="900" fontSize={fs(26)} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${segCx} ${cy + fs(15)})`} style={{ fill: '#000000' }}>{s.name}: {Number(d[s.key]).toFixed(1)}</text>
                      ) : isDom ? (
                        <g>
                          <line x1={greenCx + 58} y1={topY + fs(50)} x2={segCx} y2={topY + fs(50)} stroke={lblColor} strokeWidth="1.6" />
                          <text x={greenCx} y={topY + fs(50)} fontWeight="900" fontSize={fs(20)} textAnchor="middle" dominantBaseline="central" style={{ fill: lblColor, paintOrder: 'stroke', stroke: '#eaf6ff', strokeWidth: 3 }}>{s.name}: {Number(d[s.key]).toFixed(1)}</text>
                        </g>
                      ) : (
                        <g>
                          <line x1={greenCx + 58} y1={topY + h - 30} x2={segCx} y2={topY + h - 30} stroke={lblColor} strokeWidth="1.6" />
                          <text x={greenCx} y={topY + h - 30} fontWeight="900" fontSize={fs(20)} textAnchor="middle" dominantBaseline="central" style={{ fill: lblColor, paintOrder: 'stroke', stroke: '#eaf6ff', strokeWidth: 3 }}>{s.name}: {Number(d[s.key]).toFixed(1)}</text>
                        </g>
                      )}
                    </g>
                  );
                })}
                {/* Total (agri + domestic + industrial) box, stacked flush below the Gap box */}
                {(() => {
                  const label = `Aval: ${Math.round(d.netAvail)}`;
                  const tH = fs(30);
                  const bW = label.length * fs(11.5) + fs(18);
                  const bX = boxLeft + boxW / 2 - bW / 2;
                  const tY = topY; // flush at the top of the availability column, right below the gap box
                  return (
                    <g>
                      <rect x={bX} y={tY} width={bW} height={tH} fill="none" stroke="#000000" strokeWidth="2" strokeDasharray="6 4" />
                      <text x={boxLeft + boxW / 2} y={tY + tH / 2} fill="#ffffff" fontSize={fs(20)} fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5, filter: 'drop-shadow(0 0 7px rgba(255,255,255,0.9))' }}>{label}</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          <text x={20} y={(g.top + g.bottom) / 2} className="wdg-secondary" fontSize="42" fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 20 ${(g.top + g.bottom) / 2})`}>WATER (MAF)</text>

          {data.map((d, i) => {
            const col = yearColor(i);
            return (
              <text key={`yl-${i}`} x={g.xFor(i)} y={g.bottom + 42} textAnchor="middle" dominantBaseline="middle" fontWeight="900" style={{ fontSize: `${fs(22)}px`, fill: col, paintOrder: 'stroke', stroke: '#04121f', strokeWidth: 3.5, filter: `drop-shadow(0 0 6px ${col})` }}>{d.year}</text>
            );
          })}

          {data.map((_, i) => (
            <rect key={`hit-${i}`} x={g.left + i * g.step} y={g.top} width={g.step} height={g.bottom - g.top} fill="transparent" onPointerEnter={() => setHover(i)} />
          ))}
        </svg>

        {hd && (
          <div className="wdg-tooltip is-visible" style={{ left: `${ttLeft}px`, top: `${g.top + 6}px`, transform: ttTransform }} role="status">
            <div className="wdg-tt-head">
              <strong>{hd.year}</strong>
              <span className="wdg-tt-sub">Availability by sector</span>
            </div>
            {sectors.map((s) => (
              <div className="wdg-tt-row" key={s.key}>
                <span className="wdg-tt-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <span className="wdg-tt-label">{s.label}</span>
                <span className="wdg-tt-val">{fmt(hd[s.key])} MAF</span>
              </div>
            ))}
            <div className="wdg-tt-row">
              <span className="wdg-tt-dot" style={{ borderRadius: 0, background: 'transparent', height: 0, borderTop: `3px solid ${COL.available}` }} />
              <span className="wdg-tt-label">Net Available</span>
              <span className="wdg-tt-val">{fmt(hd.netAvail)} MAF</span>
            </div>
            <div className="wdg-tt-row">
              <span className="wdg-tt-dot" style={{ borderRadius: 0, background: 'transparent', height: 0, borderTop: `3px dashed ${COL.requirement}` }} />
              <span className="wdg-tt-label">Net Requirement</span>
              <span className="wdg-tt-val">{fmt(hd.netDemand)} MAF</span>
            </div>
            <div className="wdg-tt-row">
              <span className="wdg-tt-dot" style={{ borderRadius: '2px', background: 'rgba(255,138,92,0.6)' }} />
              <span className="wdg-tt-label">Gap</span>
              <span className="wdg-tt-val">{fmt(hd.netDemand - hd.netAvail)} MAF</span>
            </div>
            <div className="wdg-tt-row">
              <span className="wdg-tt-dot" style={{ background: yearColor(hover), boxShadow: `0 0 8px ${yearColor(hover)}` }} />
              <span className="wdg-tt-label">Population</span>
              <span className="wdg-tt-val">{fmt(hd.population)}M</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default WaterDemandChartV2;
