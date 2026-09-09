import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useMapStore } from '../../store/mapStore';
import { getHistory, seriesTotalMAF } from '../../services/hydroApi';
import {
  Chart,
  SERIES,
  RANGES,
  CHART_TYPES,
  TODAY,
  mergeMonthly,
} from './LiveInflowsModal';
import './InflowsCompModal.css';
import './LiveInflowsModal.css';
import './LocationInflowsModal.css';

const LocationInflowsModal = () => {
  const { showLocationInflowsModal, setShowLocationInflowsModal, inflowStation } = useMapStore();

  const [rangeId, setRangeId] = useState('1y');
  const [customStart, setCustomStart] = useState('2026-06-01');
  const [customEnd, setCustomEnd] = useState(TODAY);
  const [chartType, setChartType] = useState('area');
  const [filter, setFilter] = useState('both');
  const [resp, setResp] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [error, setError] = useState('');
  const [isMaximized, setIsMaximized] = useState(false); // float by default so the map stays visible
  const dragControls = useDragControls();

  const isCustom = rangeId === 'custom';
  const station = inflowStation;
  const hasApi = !!station?.apiName;

  const close = () => { setShowLocationInflowsModal(false); setIsMaximized(false); };

  /* ── Fetch monthly-MAF history for the selected station ── */
  const buildParams = useCallback(() => {
    if (isCustom) {
      if (!customStart || !customEnd) return null;
      return { startDate: customStart, endDate: customEnd };
    }
    const r = RANGES.find((x) => x.id === rangeId) || RANGES[0];
    return r.build();
  }, [isCustom, rangeId, customStart, customEnd]);

  const load = useCallback(() => {
    if (!hasApi) { setResp(null); setStatus('idle'); return; }
    const params = buildParams();
    if (!params) { setStatus('idle'); return; }
    setStatus('loading');
    setError('');
    getHistory({ name: station.apiName, ...params })
      .then((data) => {
        if (data && data.success === false) throw new Error(data.error || 'Request failed');
        setResp(data);
        setStatus('ok');
      })
      .catch((e) => {
        setError(e.message || 'Failed to load data');
        setStatus('error');
      });
  }, [hasApi, station, buildParams]);

  useEffect(() => {
    if (!showLocationInflowsModal) return;
    load();
  }, [showLocationInflowsModal, load]);

  // Escape restores from maximized.
  useEffect(() => {
    if (!isMaximized) return;
    const handler = (e) => { if (e.key === 'Escape') setIsMaximized(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMaximized]);

  const chartData = useMemo(() => mergeMonthly(resp?.inflow, resp?.outflow), [resp]);
  const hasData = status === 'ok' && chartData.length > 0;
  const visibleKeys = useMemo(
    () => (filter === 'both' ? SERIES.map((s) => s.key) : [filter]),
    [filter],
  );
  const totals = useMemo(() => ({
    inflowMAF: seriesTotalMAF(resp?.inflow),
    outflowMAF: seriesTotalMAF(resp?.outflow),
    months: chartData.length,
  }), [resp, chartData]);

  const filterOptions = [{ id: 'both', label: 'Both' }, ...SERIES.map((s) => ({ id: s.key, label: s.name }))];

  /* ── Render pieces ── */
  const controls = (
    <motion.div className="li-controls">
      <label className="li-field">
        <span className="li-field-label">Range</span>
        <select className="li-select" value={rangeId} onChange={(e) => setRangeId(e.target.value)} disabled={!hasApi}>
          {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>

      {isCustom && (
        <>
          <label className="li-field">
            <span className="li-field-label">From</span>
            <input type="date" className="li-select li-date" value={customStart} max={customEnd || TODAY}
              onChange={(e) => setCustomStart(e.target.value)} />
          </label>
          <label className="li-field">
            <span className="li-field-label">To</span>
            <input type="date" className="li-select li-date" value={customEnd} min={customStart} max={TODAY}
              onChange={(e) => setCustomEnd(e.target.value)} />
          </label>
        </>
      )}

      <label className="li-field">
        <span className="li-field-label">Chart type</span>
        <select className="li-select li-select-type" value={chartType} onChange={(e) => setChartType(e.target.value)} disabled={!hasApi}>
          {CHART_TYPES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>

      <button className="li-refresh" onClick={load} disabled={status === 'loading' || !hasApi} title="Refresh">
        <i className={`fas fa-rotate-right${status === 'loading' ? ' li-spin' : ''}`} />
      </button>
    </motion.div>
  );

  const switches = hasApi && (
    <motion.div className="li-switches">
      <div className="li-seg" role="group" aria-label="Series filter">
        {filterOptions.map((f) => {
          const s = SERIES.find((x) => x.key === f.id);
          return (
            <button key={f.id} className={`li-seg-btn${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
              {s && <span className="li-seg-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />}
              {f.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  const snapshot = station && (
    <div className="lim-snapshot">
      <span className="lim-snap-kind">{station.kind}</span>
      {station.river && <span className="lim-snap-item">{station.river}</span>}
      {station.status && (
        <span className={`lim-badge lim-badge-${String(station.status).toLowerCase().replace(/\s+/g, '-')}`}>
          {station.status}
        </span>
      )}
      {station.inflowDischarge && (
        <span className="lim-snap-item"><i className="fas fa-arrow-right-to-bracket" /> In <b>{station.inflowDischarge}</b> cs{station.inflowTrend ? ` · ${station.inflowTrend}` : ''}</span>
      )}
      {station.outflowDischarge && (
        <span className="lim-snap-item"><i className="fas fa-arrow-right-from-bracket" /> Out <b>{station.outflowDischarge}</b> cs{station.outflowTrend ? ` · ${station.outflowTrend}` : ''}</span>
      )}
      {station.recordingTime && <span className="lim-snap-item lim-snap-time">{station.recordingTime}</span>}
    </div>
  );

  const summary = hasData && (
    <div className="li-summary">
      {(filter === 'both' || filter === 'inflow') && (
        <div className="li-stat">
          <span className="li-stat-label">Total inflow</span>
          <span className="li-stat-val" style={{ color: SERIES[0].color, textShadow: `0 0 12px ${SERIES[0].color}` }}>
            {totals.inflowMAF.toFixed(2)} MAF
          </span>
        </div>
      )}
      {(filter === 'both' || filter === 'outflow') && (
        <div className="li-stat">
          <span className="li-stat-label">Total outflow</span>
          <span className="li-stat-val" style={{ color: SERIES[1].color, textShadow: `0 0 12px ${SERIES[1].color}` }}>
            {totals.outflowMAF.toFixed(2)} MAF
          </span>
        </div>
      )}
      <div className="li-stat">
        <span className="li-stat-label">Months</span>
        <span className="li-stat-val">{totals.months}</span>
      </div>
    </div>
  );

  const body = ({ fill = false, height = 340 } = {}) => (
    <div className="li-body">
      <div className="li-subtitle">
        {station ? `Monthly inflow & outflow (MAF) — ${station.name}` : 'Select a station'}
        {hasData && resp?.start_date && resp?.end_date ? ` · ${resp.start_date} → ${resp.end_date}` : ''}
      </div>
      {snapshot}
      {controls}
      {switches}
      {summary}
      <div className="li-chart-wrap" style={fill ? undefined : { height }}>
        {!hasApi && (
          <div className="li-state"><i className="fas fa-circle-info" /> No monthly-MAF history is published for this location.</div>
        )}
        {hasApi && status === 'loading' && (
          <div className="li-state"><i className="fas fa-spinner li-spin" /> Loading gauge data…</div>
        )}
        {hasApi && status === 'idle' && isCustom && (
          <div className="li-state"><i className="fas fa-calendar-days" /> Pick a start and end date.</div>
        )}
        {hasApi && status === 'error' && (
          <div className="li-state li-state-error">
            <i className="fas fa-triangle-exclamation" /> {error}
            <button className="li-retry" onClick={load}>Retry</button>
          </div>
        )}
        {hasApi && status === 'ok' && chartData.length === 0 && (
          <div className="li-state"><i className="fas fa-wave-square" /> No data for this selection.</div>
        )}
        <AnimatePresence mode="wait">
          {hasData && (
            <motion.div
              key={`${station?.id}-${chartType}-${filter}`}
              className="li-chart-inner"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Chart
                data={chartData}
                height={fill ? '100%' : height}
                type={chartType}
                keys={visibleKeys}
                series={SERIES}
                yLabel="MAF / MONTH"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const header = (maximized) => (
    <div
      className="ic-header li-header"
      onPointerDown={!maximized ? (e) => dragControls.start(e) : undefined}
      style={{ cursor: maximized ? 'default' : 'grab' }}
    >
      <span className="ic-title li-title">
        Live Inflows{station ? ` — ${station.name}` : ''}
      </span>
      <div className="ic-header-btns">
        <button className="ic-icon-btn" onClick={() => setIsMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
          <i className={`fas fa-${maximized ? 'compress' : 'expand'}`} />
        </button>
        <button className="ic-icon-btn" onClick={close}><i className="fas fa-times" /></button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showLocationInflowsModal && !isMaximized && (
            <motion.div
              className="ic-modal li-modal lim-modal"
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {header(false)}
              {body({ height: 320 })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {showLocationInflowsModal && isMaximized && (
            <motion.div
              className="ic-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="ic-fullscreen-inner li-fullscreen-inner"
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {header(true)}
                {body({ fill: true })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default LocationInflowsModal;
