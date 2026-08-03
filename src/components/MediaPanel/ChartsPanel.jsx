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
  const [activeChartTab, setActiveChartTab] = useState('comparison');
  const [rcpData, setRcpData] = useState(null);
  const [projectionData, setProjectionData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rcp, proj, comp] = await Promise.all([
        fetchAndParseCSV('/Water_RCP_Scenarios.csv'),
        fetchAndParseCSV('/Water_Projection_data.csv'),
        fetchAndParseCSV('/Comparison_Graph.csv'),
      ]);
      setRcpData(rcp);
      setProjectionData(proj);
      setComparisonData(comp);
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

  function getComparisonChartData() {
    if (!comparisonData) return null;
    const rows = comparisonData.filter(
      (r) => r['Month'] && r['Month'] !== 'Total Inflow at RIMs',
    );
    const projected2027 = {
      January: 4.0, February: 4.8, March: 7.0, April: 12.0,
      May: 11.5, June: 15.7, July: 25.0, August: 21.0,
      September: 18.0, October: 5.4, November: 4.5, December: 4.1,
    };
    return {
      years: rows.map((r) => r['Month']),
      series: [
        {
          id: 'inflow2025',
          name: '2025 Inflow (MAF)',
          color: '#4d90ff',
          data: rows.map((r) => num(r['2025 Inflow (MAF)'])),
        },
        {
          id: 'inflow2026',
          name: '2026 Inflow (MAF)',
          color: '#22e06a',
          data: rows.map((r) => num(r['2026 Inflow (MAF)'])),
        },
        {
          id: 'inflow2027',
          name: '2027 Projected Inflow (MAF)',
          color: '#ff3d9a',
          data: rows.map((r) => projected2027[r['Month']] ?? null),
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

  const chartConfig = {
    rcp: {
      data: getRcpChartData(),
      title: 'Water Resources – RCP Scenarios',
      subtitle: '1970 – 2050 · Normalized per-series comparison',
    },
    projection: {
      data: getProjectionChartData(),
      title: 'Water Projection 2025–2050',
      subtitle: 'Supply vs Demand Forecast',
    },
    comparison: {
      data: getComparisonChartData(),
      title: 'Monthly Inflow Comparison',
      subtitle: '2025 vs 2026 vs 2027 Projected · Inflow at RIMs (MAF)',
    },
  };

  const current = chartConfig[activeChartTab] || chartConfig.rcp;

  return (
    <div className="charts-panel-wrap">
      <TimeSeriesChart
        data={current.data}
        title={current.title}
        subtitle={current.subtitle}
        onTabChange={setActiveChartTab}
        activeTab={activeChartTab}
      />
    </div>
  );
};

export default ChartsPanel;
