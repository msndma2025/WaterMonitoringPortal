import { useState, useEffect } from 'react';
import { TimeSeriesChart } from '../Charts';
import { fetchAndParseCSV } from '../../utils/csv';
import './MediaPanel.css';

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const ChartsPanel = () => {
  const [activeChartTab, setActiveChartTab] = useState('rcp');
  const [rcpData, setRcpData] = useState(null);
  const [projectionData, setProjectionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rcp, proj] = await Promise.all([
        fetchAndParseCSV('/Water_RCP_Scenarios.csv'),
        fetchAndParseCSV('/Water_Projection_data.csv'),
      ]);
      setRcpData(rcp);
      setProjectionData(proj);
      setLoading(false);
    })();
  }, []);

  function getRcpChartData() {
    if (!rcpData) return null;
    return {
      years: rcpData.map((r) => Number(r['Years'])),
      series: [
        {
          id: 'population',
          name: 'Population (millions)',
          color: '#818cf8',
          data: rcpData.map((r) => num(r['Population (millions)'])),
        },
        {
          id: 'waterAvailability',
          name: 'Water Availability – IRSA (MAF)',
          color: '#f472b6',
          data: rcpData.map((r) => num(r['Water Availability-IRSA'])),
        },
        {
          id: 'precipAnomaly',
          name: 'RCP 4.5 Precipitation Anomaly (mm)',
          color: '#22d3ee',
          defaultHidden: true,
          data: rcpData.map((r) =>
            r['RCP 4.5 Precipitation Anomaly (mm)']
              ? num(r['RCP 4.5 Precipitation Anomaly (mm)'])
              : null,
          ),
        },
        {
          id: 'tempAnomaly',
          name: 'RCP 4.5 Temp Anomaly (°C)',
          color: '#fb923c',
          defaultHidden: true,
          data: rcpData.map((r) =>
            r['RCP 4.5 Temperature Anomaly (C)']
              ? num(r['RCP 4.5 Temperature Anomaly (C)'])
              : null,
          ),
        },
        {
          id: 'perCapitaSurface',
          name: 'Per Capita Surface Water (m³/yr)',
          color: '#a78bfa',
          data: rcpData.map((r) =>
            r['Per Capita Surface Water Availability (m³/person/year)']
              ? num(r['Per Capita Surface Water Availability (m³/person/year)'])
              : null,
          ),
        },
        {
          id: 'perCapitaGW',
          name: 'Per Capita Water S+GW (m³)',
          color: '#34d399',
          data: rcpData.map((r) =>
            r['Per Capita Water (S+GW) Availability (m³/person)']
              ? num(r['Per Capita Water (S+GW) Availability (m³/person)'])
              : null,
          ),
        },
      ],
    };
  }

  function getProjectionChartData() {
    if (!projectionData) return null;
    return {
      years: projectionData.map((r) => Number(r['Year'])),
      series: [
        {
          id: 'supply',
          name: 'Domestic & Industrial Supply (MAF)',
          color: '#22d3ee',
          data: projectionData.map((r) => num(r['Domestic&Industrial_Supply(MAF)'])),
        },
        {
          id: 'demand',
          name: 'Domestic & Industrial Demand (MAF)',
          color: '#f472b6',
          data: projectionData.map((r) => num(r['Domestic&Industrial_Demand(MAF)'])),
        },
        {
          id: 'irrigSupply',
          name: 'Irrigation Supply (MAF)',
          color: '#34d399',
          data: projectionData.map((r) => num(r['Irrigation_Supply(MAF)'])),
        },
        {
          id: 'irrigDemand',
          name: 'Irrigation Demand (MAF)',
          color: '#fb923c',
          data: projectionData.map((r) => num(r['Irrigation_Demand(MAF)'])),
        },
      ],
    };
  }

  if (loading) {
    return (
      <div className="charts-panel-wrap">
        <div className="ts-loading">
          <div className="ts-loading-spinner" />
          <span>Loading chart data…</span>
        </div>
      </div>
    );
  }

  const isRcp = activeChartTab === 'rcp';

  return (
    <div className="charts-panel-wrap">
      <TimeSeriesChart
        key={activeChartTab}
        data={isRcp ? getRcpChartData() : getProjectionChartData()}
        title={isRcp ? 'Water Resources – RCP Scenarios' : 'Water Projection 2025–2050'}
        subtitle={isRcp ? '1970 – 2050 · Normalized per-series comparison' : 'Supply vs Demand Forecast'}
        onTabChange={setActiveChartTab}
        activeTab={activeChartTab}
      />
    </div>
  );
};

export default ChartsPanel;
