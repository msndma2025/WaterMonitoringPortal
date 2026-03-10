// River Basins GeoJSON Data - Simplified version (main catchments)
export const riverBasins = {
  type: "FeatureCollection",
  name: "River_Basins",
  features: [
    {
      type: "Feature",
      properties: { id: 1, name: "Chenab Catchment", side: "Western" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [73.5, 32.5], [74.5, 32.5], [75.5, 33.0], [76.0, 33.5], 
          [76.5, 34.0], [76.0, 34.5], [75.0, 34.0], [74.0, 33.5], 
          [73.5, 33.0], [73.5, 32.5]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { id: 2, name: "Indus upper Catchment", side: "Western" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [72.0, 34.0], [73.0, 34.5], [74.0, 35.0], [75.0, 35.5],
          [76.0, 36.0], [77.0, 35.5], [77.5, 35.0], [77.0, 34.5],
          [76.0, 34.0], [75.0, 33.5], [74.0, 33.0], [73.0, 33.5],
          [72.0, 34.0]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { id: 3, name: "Jhelum Catchment", side: "Western" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [73.0, 33.0], [73.5, 33.5], [74.5, 34.0], [75.0, 34.5],
          [75.5, 34.0], [75.0, 33.5], [74.5, 33.0], [74.0, 32.5],
          [73.5, 32.5], [73.0, 33.0]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { id: 4, name: "Ravi Catchment", side: "Eastern" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [74.0, 31.5], [74.5, 32.0], [75.5, 32.5], [76.0, 32.5],
          [76.5, 32.0], [76.0, 31.5], [75.5, 31.0], [75.0, 31.0],
          [74.5, 31.5], [74.0, 31.5]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { id: 5, name: "Sutlej Catchment", side: "Eastern" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [74.0, 30.5], [75.0, 31.0], [76.0, 31.5], [77.0, 32.0],
          [78.0, 31.5], [77.5, 31.0], [77.0, 30.5], [76.0, 30.0],
          [75.0, 30.0], [74.0, 30.5]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { id: 6, name: "Kabul Catchment", side: "Western" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [69.5, 33.5], [70.0, 34.0], [71.0, 34.5], [72.0, 35.0],
          [72.5, 35.5], [72.0, 36.0], [71.0, 36.0], [70.0, 35.5],
          [69.5, 35.0], [69.0, 34.5], [69.5, 33.5]
        ]]
      }
    }
  ]
};

// Color mapping for river basins
export const BASIN_COLORS = {
  'Chenab Catchment': '#3399FF',
  'Indus upper Catchment': '#FF9933',
  'Jhelum Catchment': '#66CC66',
  'Ravi Catchment': '#FF66B2',
  'Sutlej Catchment': '#9933CC',
  'Kabul Catchment': '#FF3366',
};
