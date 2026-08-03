import { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '../../store/mapStore';
import './LocationSearch.css';

const LocationSearch = () => {
  const map = useMapStore((s) => s.mapRef);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const markerRef = useRef(null);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  // Debounced search against the backend proxy (Google Places, service account)
  useEffect(() => {
    const q = query.trim();
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selectResult = async (res) => {
    if (!map) return;
    setQuery(res.name);
    setOpen(false);

    // Autocomplete predictions carry no coordinates — resolve via Place Details
    let { lat, lng, address, name } = res;
    if (lat == null || lng == null) {
      if (!res.placeId) return;
      try {
        const r = await fetch(`/api/place/${encodeURIComponent(res.placeId)}`);
        const d = await r.json();
        lat = d.lat; lng = d.lng;
        address = d.address || address;
        name = d.name || name;
      } catch {
        return;
      }
    }
    if (lat == null || lng == null) return;

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new mapboxgl.Marker({ color: '#38bdf8' })
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 24 }).setHTML(
          `<div style="font-family:sans-serif;font-size:13px;color:#0f172a;"><strong>${name}</strong>${address ? `<div style="color:#475569;margin-top:2px;">${address}</div>` : ''}</div>`
        )
      )
      .addTo(map);
    markerRef.current.togglePopup();
    map.flyTo({ center: [lng, lat], zoom: 12, essential: true });
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
  };

  return (
    <div className="loc-search" ref={boxRef}>
      <div className="loc-search-box">
        <i className="fas fa-search loc-search-icon"></i>
        <input
          className="loc-search-input"
          type="text"
          placeholder="Search location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        {loading && <i className="fas fa-spinner fa-spin loc-search-spin"></i>}
        {query && !loading && (
          <button className="loc-search-clear" onClick={clear} title="Clear">
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="loc-search-results">
          {results.map((r, i) => (
            <li key={i} className="loc-search-item" onClick={() => selectResult(r)}>
              <i className="fas fa-location-dot loc-search-item-icon"></i>
              <div className="loc-search-item-text">
                <div className="loc-search-item-name">{r.name}</div>
                {r.address && <div className="loc-search-item-addr">{r.address}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="loc-search-empty">No results found</div>
      )}
    </div>
  );
};

export default LocationSearch;
