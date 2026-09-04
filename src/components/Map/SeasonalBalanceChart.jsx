import { useEffect, useMemo, useRef, useState } from 'react';
import './SeasonalBalanceChart.css';

// Conceptual monthly water-balance trend for Pakistan's Rabi–Kharif cycle.
// `balance` > 0 = water deficit (below the balance line); < 0 = excess water
// (above it). `scenario` is the dams + monsoon-basins trend, which captures the
// monsoon excess and releases it later to ease the deficit months.
const MONTHS = [
  { name: 'January',   short: 'Jan', season: 'Rabi',   balance: 0.82,  scenario: 0.43,  state: 'Water deficit', intensity: 'Higher deficit',        hazard: 'Avalanche' },
  { name: 'February',  short: 'Feb', season: 'Rabi',   balance: 0.80,  scenario: 0.42,  state: 'Water deficit', intensity: 'Higher deficit',        hazard: 'Avalanche' },
  { name: 'March',     short: 'Mar', season: 'Rabi',   balance: 0.72,  scenario: 0.38,  state: 'Water deficit', intensity: 'High deficit',          hazard: 'Avalanche' },
  { name: 'April',     short: 'Apr', season: 'Kharif', balance: 0.61,  scenario: 0.33,  state: 'Water deficit', intensity: 'Elevated deficit',      hazard: 'Heatwave' },
  { name: 'May',       short: 'May', season: 'Kharif', balance: 0.44,  scenario: 0.24,  state: 'Water deficit', intensity: 'Deficit easing',        hazard: 'Forest fires' },
  { name: 'June',      short: 'Jun', season: 'Kharif', balance: -0.28, scenario: -0.13, state: 'Excess water',  intensity: 'Excess begins',         hazard: 'Cyclones' },
  { name: 'July',      short: 'Jul', season: 'Kharif', balance: -0.54, scenario: -0.22, state: 'Excess water',  intensity: 'Strong excess',         hazard: 'GLOF' },
  { name: 'August',    short: 'Aug', season: 'Kharif', balance: -0.48, scenario: -0.20, state: 'Excess water',  intensity: 'High excess',           hazard: 'Landslides' },
  { name: 'September', short: 'Sep', season: 'Kharif', balance: -0.31, scenario: -0.12, state: 'Excess water',  intensity: 'Excess easing',         hazard: 'Floods' },
  { name: 'October',   short: 'Oct', season: 'Rabi',   balance: 0.70,  scenario: 0.36,  state: 'Water deficit', intensity: 'High deficit returns',  hazard: 'Smog' },
  { name: 'November',  short: 'Nov', season: 'Rabi',   balance: 0.88,  scenario: 0.47,  state: 'Water deficit', intensity: 'Very high deficit',     hazard: 'Smog' },
  { name: 'December',  short: 'Dec', season: 'Rabi',   balance: 0.92,  scenario: 0.50,  state: 'Water deficit', intensity: 'Very high deficit',     hazard: 'Blizzards' },
];

// Month-wise dominant hazard windows, each with a distinct neon colour.
const HAZARDS = [
  { start: 0,  span: 3, label: 'Avalanche',    color: '#7dd3ff' },
  { start: 3,  span: 1, label: 'Heatwave',     color: '#ffb020' },
  { start: 4,  span: 1, label: 'Forest Fires', color: '#ff6b3d' },
  { start: 5,  span: 1, label: 'Cyclones',     color: '#22d3ff' },
  { start: 6,  span: 1, label: 'GLOF',         color: '#6ee7ff' },
  { start: 7,  span: 1, label: 'Landslides',   color: '#ffd166' },
  { start: 8,  span: 1, label: 'Floods',       color: '#4d9dff' },
  { start: 9,  span: 2, label: 'Smog',         color: '#c874ff' },
  { start: 11, span: 1, label: 'Blizzards',    color: '#a5f3ff' },
];

// Smooth (Catmull-Rom → Bézier) path through a set of points.
function smoothPath(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function SeasonalBalanceChart({ scale = 1, full = false }) {
  const [selected, setSelected] = useState(() => Math.max(0, Math.min(11, new Date().getMonth())));
  const [width, setWidth] = useState(900);
  const [tip, setTip] = useState(null); // active hover/click month index, or null
  // Series isolation via the legend. Empty set = show everything.
  const [active, setActive] = useState(() => new Set());
  const stageRef = useRef(null);

  const toggleSeries = (key) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const resetSeries = () => setActive(new Set());
  const show = (key) => active.size === 0 || active.has(key);
  // Changing the visible set replays the draw/pop animations via React keys.
  const animKey = active.size === 0 ? 'all' : [...active].sort().join('-');

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(Math.max(320, Math.floor(el.getBoundingClientRect().width) || 900));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    const W = width;
    const left = W < 480 ? 14 : 30;
    const right = left;
    const plotW = W - left - right;
    const column = plotW / 12;
    const monthY = 14;
    const monthH = 44;
    const seasonY = 74;
    const seasonH = 78;
    const plotY = 178;
    const plotH = full ? 300 : 244;
    const baseline = plotY + plotH * 0.62;
    // Asymmetric swing: taller blue (excess, above) and shorter red (deficit, below).
    const excessAmp = plotH * 0.85;
    const deficitAmp = plotH * 0.34;
    const hazardLabelY = plotY + plotH + 30;
    const hazardY = hazardLabelY + 14;
    const rotate = W < 900;
    const hazardH = rotate ? 112 : 60;
    const chartH = hazardY + hazardH + 30;
    const yFor = (b) => baseline + b * (b >= 0 ? deficitAmp : excessAmp);
    const xFor = (i) => left + (i + 0.5) * column;

    const balancePts = [
      { x: left, y: yFor(MONTHS[0].balance) },
      ...MONTHS.map((m, i) => ({ x: xFor(i), y: yFor(m.balance) })),
      { x: left + plotW, y: yFor(MONTHS[11].balance) },
    ];
    const scenarioPts = [
      { x: left, y: yFor(MONTHS[0].scenario) },
      ...MONTHS.map((m, i) => ({ x: xFor(i), y: yFor(m.scenario) })),
      { x: left + plotW, y: yFor(MONTHS[11].scenario) },
    ];
    const linePath = smoothPath(balancePts);
    const scenarioPath = smoothPath(scenarioPts);
    const areaPath = `${linePath} L ${(left + plotW).toFixed(2)} ${baseline.toFixed(2)} L ${left.toFixed(2)} ${baseline.toFixed(2)} Z`;

    return {
      W, left, right, plotW, column, monthY, monthH, seasonY, seasonH,
      plotY, plotH, baseline, hazardLabelY, hazardY, hazardH, rotate,
      chartH, yFor, xFor, linePath, scenarioPath, areaPath,
      // rough length estimate to seed the draw-in animation
      lineLen: Math.round(plotW * 1.6),
    };
  }, [width, full]);

  const fs = (n) => n * scale;

  const seasonSegments = [
    { start: 0, span: 3, name: 'RABI',   detail: 'Jan–Mar', color: 'var(--sbc-rabi)' },
    { start: 3, span: 6, name: 'KHARIF', detail: 'Apr–Sep', color: 'var(--sbc-kharif)' },
    { start: 9, span: 3, name: 'RABI',   detail: 'Oct–Dec', color: 'var(--sbc-rabi)' },
  ];

  const m = MONTHS[selected];
  const scenarioEffect = m.balance > 0
    ? 'Stored-water releases reduce deficit'
    : 'Water capture lowers flood intensity';

  // Tooltip pixel position (viewBox == measured px, so 1:1 with the stage box).
  const tipMonth = tip != null ? MONTHS[tip] : null;
  const tipX = tip != null ? g.xFor(tip) : 0;
  const tipY = tip != null ? g.yFor(tipMonth.balance) : 0;
  const tipEffect = tipMonth && tipMonth.balance > 0
    ? 'Stored-water releases reduce deficit'
    : 'Water capture lowers flood intensity';

  return (
    <section className="sbc" aria-label="Seasonal water balance and hazard timeline">
      <div className="sbc-legend">
        <div className="sbc-legend-group">
          {[
            { key: 'current',  label: 'Current storage',           shape: 'sbc-line-key sbc-line-key-current' },
            { key: 'scenario', label: 'With dams + monsoon basins', shape: 'sbc-line-key sbc-line-key-scenario' },
            { key: 'deficit',  label: 'Water deficit',              shape: 'sbc-key-deficit' },
            { key: 'excess',   label: 'Excess water',               shape: 'sbc-key-excess' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sbc-legend-item${active.size > 0 && !active.has(item.key) ? ' is-off' : ''}`}
              aria-pressed={active.has(item.key)}
              onClick={() => toggleSeries(item.key)}
            >
              <span className={`sbc-key-shape ${item.shape}`} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
          {active.size > 0 && (
            <button type="button" className="sbc-reset-btn" onClick={resetSeries}>
              <i className="fas fa-rotate-left" /> Reset
            </button>
          )}
        </div>
        <span className="sbc-hint">Click a legend item to isolate it · hover the timeline</span>
      </div>

      <div className="sbc-stage" ref={stageRef}>
        <svg
          viewBox={`0 0 ${g.W} ${g.chartH}`}
          role="img"
          aria-label="Pakistan seasonal water balance, crop seasons and hazard timeline"
          onPointerLeave={() => setTip(null)}
        >
          <defs>
            {/* Vertical split at the balance line: excess (blue) above, deficit (red) below. */}
            <linearGradient id="sbc-balance-grad" gradientUnits="userSpaceOnUse" x1="0" y1={g.plotY} x2="0" y2={g.plotY + g.plotH}>
              <stop offset="0%" stopColor="var(--sbc-excess)" />
              <stop offset={`${(((g.baseline - g.plotY) / g.plotH) * 100).toFixed(2)}%`} stopColor="var(--sbc-excess)" />
              <stop offset={`${(((g.baseline - g.plotY) / g.plotH) * 100).toFixed(2)}%`} stopColor="var(--sbc-deficit)" />
              <stop offset="100%" stopColor="var(--sbc-deficit)" />
            </linearGradient>
            <pattern id="sbc-rabi-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
              <rect width="16" height="16" fill="color-mix(in srgb, var(--sbc-rabi) 24%, transparent)" />
              <path d="M0 0 V16" stroke="var(--sbc-rabi)" strokeWidth="7" opacity="0.55" />
            </pattern>
            <pattern id="sbc-kharif-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
              <rect width="16" height="16" fill="color-mix(in srgb, var(--sbc-kharif) 24%, transparent)" />
              <path d="M0 0 V16" stroke="var(--sbc-kharif)" strokeWidth="7" opacity="0.55" />
            </pattern>
            <pattern id="sbc-area-cross" width="11" height="11" patternUnits="userSpaceOnUse">
              <path d="M0 0 H11 M0 0 V11" stroke="#ffffff" strokeWidth="0.9" opacity="0.22" />
            </pattern>
            <clipPath id="sbc-plot-clip">
              <rect x={g.left} y={g.plotY} width={g.plotW} height={g.plotH} rx="12" />
            </clipPath>
          </defs>

          {/* selected column highlight (spans month row → hazard row) */}
          <rect
            x={g.left + selected * g.column + 1}
            y={g.monthY - 4}
            width={Math.max(1, g.column - 2)}
            height={g.hazardY + g.hazardH - g.monthY + 8}
            rx="9"
            fill="var(--sbc-selected)"
          />

          {/* month cells */}
          {MONTHS.map((month, i) => {
            const x = g.left + i * g.column + 1;
            const w = Math.max(1, g.column - 2);
            const accent = month.season === 'Rabi' ? 'var(--sbc-rabi)' : 'var(--sbc-kharif)';
            return (
              <g key={month.short} className="sbc-cell" style={{ animationDelay: `${i * 40}ms` }}>
                <rect x={x} y={g.monthY} width={w} height={g.monthH} rx="7" fill="color-mix(in srgb, var(--sbc-plot) 82%, transparent)" stroke="var(--sbc-grid)" strokeWidth="1" />
                <rect x={x} y={g.monthY} width={w} height={5} rx="2" fill={accent} />
                <text x={x + w / 2} y={g.monthY + g.monthH / 2 + 2} fontSize={fs(18)} fontWeight="600" textAnchor="middle" dominantBaseline="middle">{month.short}</text>
              </g>
            );
          })}

          {/* season bands */}
          {seasonSegments.map((seg, i) => {
            const x = g.left + seg.start * g.column + 1;
            const w = seg.span * g.column - 2;
            const fill = seg.name === 'RABI' ? 'url(#sbc-rabi-hatch)' : 'url(#sbc-kharif-hatch)';
            return (
              <g key={`season-${i}`}>
                <rect x={x} y={g.seasonY} width={w} height={g.seasonH} rx="10" fill={fill} stroke={seg.color} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 7px color-mix(in srgb, ${seg.color} 45%, transparent))` }} />
                <text x={x + w / 2} y={g.seasonY + g.seasonH / 2} fontSize={fs(21)} fontWeight="700" letterSpacing="0.06em" textAnchor="middle" dominantBaseline="middle">{seg.name}</text>
              </g>
            );
          })}

          {/* plot frame */}
          <rect x={g.left} y={g.plotY} width={g.plotW} height={g.plotH} rx="12" fill="var(--sbc-plot)" stroke="var(--sbc-grid)" strokeWidth="1" />

          <g clipPath="url(#sbc-plot-clip)">
            {/* excess / deficit zone tints */}
            {show('excess') && <rect x={g.left} y={g.plotY} width={g.plotW} height={g.baseline - g.plotY} fill="color-mix(in srgb, var(--sbc-excess) 8%, transparent)" />}
            {show('deficit') && <rect x={g.left} y={g.baseline} width={g.plotW} height={g.plotY + g.plotH - g.baseline} fill="color-mix(in srgb, var(--sbc-deficit) 8%, transparent)" />}

            {/* vertical gridlines */}
            {Array.from({ length: 13 }, (_, i) => {
              const x = g.left + i * g.column;
              return <line key={`grid-${i}`} x1={x} y1={g.plotY} x2={x} y2={g.plotY + g.plotH} stroke="var(--sbc-grid)" strokeWidth="1" />;
            })}

            {/* baseline */}
            <line x1={g.left} y1={g.baseline} x2={g.left + g.plotW} y2={g.baseline} stroke="var(--sbc-fg)" strokeWidth="1.5" opacity="0.5" strokeDasharray="2 5" />

            {/* selected column highlight inside plot */}
            <rect x={g.left + selected * g.column} y={g.plotY} width={g.column} height={g.plotH} fill="var(--sbc-selected)" />

            {/* current storage: area + criss-cross overlay + glow line + core line */}
            {show('current') && (
              <g key={`current-${animKey}`}>
                <path d={g.areaPath} fill="url(#sbc-balance-grad)" opacity="0.30" />
                <path d={g.areaPath} fill="url(#sbc-area-cross)" />
                <path d={g.linePath} fill="none" stroke="url(#sbc-balance-grad)" strokeWidth="16" opacity="0.28" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'blur(2px)' }} />
                <path
                  className="sbc-line-draw"
                  style={{ '--sbc-len': g.lineLen }}
                  d={g.linePath}
                  fill="none"
                  stroke="url(#sbc-balance-grad)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {/* deficit markers (diamonds, below balance) */}
            {show('deficit') && (
              <g key={`deficit-${animKey}`}>
                {MONTHS.map((month, i) => {
                  if (month.balance <= 0) return null;
                  const px = g.xFor(i);
                  const py = g.yFor(month.balance);
                  return (
                    <rect
                      key={`dm-${i}`}
                      className="sbc-node"
                      style={{ animationDelay: `${300 + i * 45}ms` }}
                      x={px - 4.5} y={py - 4.5} width={9} height={9} rx="1"
                      fill="var(--sbc-deficit)" stroke="#0b0f1a" strokeWidth="1.2"
                      transform={`rotate(45 ${px} ${py})`}
                    />
                  );
                })}
              </g>
            )}

            {/* excess markers (circles, above balance) */}
            {show('excess') && (
              <g key={`excess-${animKey}`}>
                {MONTHS.map((month, i) => {
                  if (month.balance > 0) return null;
                  const px = g.xFor(i);
                  const py = g.yFor(month.balance);
                  return (
                    <circle
                      key={`em-${i}`}
                      className="sbc-node"
                      style={{ animationDelay: `${300 + i * 45}ms` }}
                      cx={px} cy={py} r="5.5"
                      fill="var(--sbc-excess)" stroke="#0b0f1a" strokeWidth="1.2"
                    />
                  );
                })}
              </g>
            )}

            {/* scenario dashed line + hollow markers */}
            {show('scenario') && (
              <g key={`scenario-${animKey}`} className="sbc-fade">
                <path d={g.scenarioPath} fill="none" stroke="var(--sbc-scenario)" strokeWidth="13" opacity="0.18" strokeDasharray="10 8" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'blur(1.5px)' }} />
                <path
                  d={g.scenarioPath}
                  fill="none" stroke="var(--sbc-scenario)" strokeWidth="3.6"
                  strokeDasharray="10 8" strokeLinecap="round" strokeLinejoin="round"
                />
                {MONTHS.map((month, i) => {
                  const px = g.xFor(i);
                  const py = g.yFor(month.scenario);
                  return <circle key={`sm-${i}`} cx={px} cy={py} r="4.4" fill="var(--sbc-plot)" stroke="var(--sbc-scenario)" strokeWidth="2.2" />;
                })}
              </g>
            )}
          </g>

          {/* zone labels */}
          <text x={g.left + 10} y={g.plotY + 19} className="sbc-secondary" fontSize={fs(14)} fontWeight="600" letterSpacing="0.05em" textAnchor="start">EXCESS WATER · ABOVE BALANCE</text>
          <text x={g.left + 10} y={g.plotY + g.plotH - 14} className="sbc-secondary" fontSize={fs(14)} fontWeight="600" letterSpacing="0.05em" textAnchor="start">WATER DEFICIT · BELOW BALANCE</text>
          <text x={g.left + g.plotW - 10} y={g.baseline - 11} className="sbc-secondary" fontSize={fs(14)} fontWeight="600" letterSpacing="0.05em" textAnchor="end">BALANCE LINE</text>

          {/* hazard windows */}
          <text x={g.left} y={g.hazardLabelY} className="sbc-secondary" fontSize={fs(15)} fontWeight="600" textAnchor="start">MONTH-WISE HAZARD WINDOW</text>
          {HAZARDS.map((h, i) => {
            const x = g.left + h.start * g.column + 1;
            const w = h.span * g.column - 2;
            const lx = x + w / 2;
            const ly = g.hazardY + g.hazardH / 2 + 2;
            const rot = g.rotate && h.span === 1;
            return (
              <g key={`hz-${i}`}>
                <rect x={x} y={g.hazardY} width={w} height={g.hazardH} rx="8" fill={`color-mix(in srgb, ${h.color} 22%, var(--sbc-plot))`} stroke={h.color} strokeWidth="1.2" style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${h.color} 40%, transparent))` }} />
                <rect x={x} y={g.hazardY} width={w} height={6} rx="2" fill={h.color} />
                <text x={lx} y={ly} fontSize={fs(rot ? 15 : 17)} fontWeight="600" textAnchor="middle" dominantBaseline="middle" transform={rot ? `rotate(-90 ${lx} ${ly})` : undefined}>{h.label}</text>
              </g>
            );
          })}

          {/* pulsing selection outline */}
          <rect
            className="sbc-outline"
            x={g.left + selected * g.column + 1}
            y={g.monthY - 2}
            width={Math.max(1, g.column - 2)}
            height={g.hazardY + g.hazardH - g.monthY + 4}
            rx="9"
            fill="none"
            stroke="var(--sbc-excess)"
            strokeWidth="2.5"
          />

          {/* hit targets */}
          {MONTHS.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={g.left + i * g.column}
              y={g.monthY - 4}
              width={g.column}
              height={g.hazardY + g.hazardH - g.monthY + 8}
              fill="transparent"
              onPointerEnter={() => { setSelected(i); setTip(i); }}
              onClick={() => { setSelected(i); setTip(i); }}
            />
          ))}
        </svg>

        {tipMonth && (
          <div
            className="sbc-tooltip is-visible"
            style={{
              left: `${(tipX / g.W) * 100}%`,
              top: `${(tipY / g.chartH) * 100}%`,
            }}
            role="status"
          >
            <div className="sbc-tt-head">
              <strong>{tipMonth.name}</strong>
              <span className="sbc-tt-sub">{tipMonth.season} season</span>
            </div>
            <div className="sbc-tt-row">
              <span className="sbc-tt-dot" style={{ background: tipMonth.balance > 0 ? 'var(--sbc-deficit)' : 'var(--sbc-excess)' }} />
              <span>Current storage: {tipMonth.state}</span>
            </div>
            <div className="sbc-tt-row">
              <span className="sbc-tt-dot" style={{ background: 'var(--sbc-scenario)' }} />
              <span>Dams + basins: {tipEffect}</span>
            </div>
            <div className="sbc-tt-row">
              <span className="sbc-tt-dot" style={{ background: '#ffb020' }} />
              <span>Hazard: {tipMonth.hazard}</span>
            </div>
          </div>
        )}
      </div>

      <div className="sbc-controls">
        <label className="sbc-range-wrap">
          <span>Explore month: <strong>{m.name}</strong></span>
          <input
            className="sbc-range"
            type="range"
            min="0" max="11" step="1"
            value={selected}
            onChange={(e) => { setSelected(Number(e.target.value)); setTip(null); }}
            aria-label="Select month"
          />
        </label>
      </div>

      <div className="sbc-detail" aria-live="polite">
        <span className="sbc-badge">{m.name}</span>
        <strong>{m.season} season</strong>
        <span className="sbc-dot-sep">•</span>
        <span>{m.intensity}</span>
        <span className="sbc-dot-sep">•</span>
        <span>{scenarioEffect}</span>
        <span className="sbc-dot-sep">•</span>
        <span>Hazard: {m.hazard}</span>
      </div>

      <p className="sbc-note">
        Both lines are conceptual relative trends, not modelled MAF values. The scenario illustrates
        capturing excess monsoon water in dams and monsoon basins, then releasing it later to ease
        deficit pressure.
      </p>
    </section>
  );
}

export default SeasonalBalanceChart;
