// Under Construction Dams Pakistan GeoJSON Data
export const underConstructionDams = {
  type: "FeatureCollection",
  name: "underconstructiondamspakistan",
  features: [
    // Under Construction Dams
    { 
      type: "Feature", 
      properties: { 
        id: 0, 
        status: "Under Construction", 
        name: "Mohmand Dam", 
        location: "Munda Head Works, KPK", 
        latitude: 34.35002, 
        longitude: 71.53263, 
        type: "Concrete Faced Rockfill", 
        height: "213m", 
        installedCapacity: "800 MW", 
        annualEnergy: "2,862 GWh", 
        grossStorage: "1.239 MAF", 
        liveStorage: "0.676 MAF",
        cultivableArea: "16,737 Acres"
      }, 
      geometry: { type: "Point", coordinates: [71.53263, 34.35002] } 
    },
    { 
      type: "Feature", 
      properties: { 
        id: 1, 
        status: "Under Construction", 
        name: "Diamer Basha Dam", 
        location: "Indus River near Chilas, Gilgit", 
        latitude: 35.52047, 
        longitude: 73.73712, 
        type: "Roller Compacted Concrete (RCC)", 
        height: "272m", 
        installedCapacity: "4,500 MW", 
        annualEnergy: "18,097 GWh", 
        grossStorage: "8.1 MAF", 
        liveStorage: "6.4 MAF",
        spillways: "14 (11.5m x 16.24m)"
      }, 
      geometry: { type: "Point", coordinates: [73.73712, 35.52047] } 
    },
    { 
      type: "Feature", 
      properties: { 
        id: 2, 
        status: "Under Construction", 
        name: "Dasu Hydro Power Project", 
        location: "Upper Kohistan, KPK", 
        latitude: 35.30011, 
        longitude: 73.2024, 
        type: "RCC Gravity Dam", 
        height: "242m", 
        installedCapacity: "4,320 MW (Stage-1: 2,160 MW)", 
        annualEnergy: "21,485 GWh",
        turbines: "12 Francis Turbines",
        designDischarge: "2,600 m³/sec"
      }, 
      geometry: { type: "Point", coordinates: [73.2024, 35.30011] } 
    },
    { 
      type: "Feature", 
      properties: { 
        id: 3, 
        status: "Under Construction", 
        name: "Tarbela 5th Extension", 
        location: "Swabi, KPK", 
        latitude: 34.07725, 
        longitude: 72.72121, 
        type: "Concrete/steel lined tunnel", 
        installedCapacity: "1,530 MW", 
        annualEnergy: "1,347 GWh",
        tunnelLength: "3,675 ft"
      }, 
      geometry: { type: "Point", coordinates: [72.72121, 34.07725] } 
    },
    { 
      type: "Feature", 
      properties: { 
        id: 4, 
        status: "Under Construction", 
        name: "Keyal Khwar HydroPower", 
        location: "Lower Kohistan, KPK", 
        latitude: 35.11173, 
        longitude: 73.01208, 
        height: "732m", 
        installedCapacity: "128 MW", 
        annualEnergy: "418 GWh",
        designDischarge: "20 m³/sec"
      }, 
      geometry: { type: "Point", coordinates: [73.01208, 35.11173] } 
    },
    
    // Ready for Construction Dams
    { 
      type: "Feature", 
      properties: { 
        id: 5, 
        status: "Ready for Construction", 
        name: "Naulong Dam Project", 
        location: "Jhal Magsi, Balochistan", 
        latitude: 28.48974, 
        longitude: 67.44163, 
        type: "Zone Earth fill", 
        height: "186 ft", 
        installedCapacity: "4.4 MW",
        grossStorage: "0.242 MAF",
        liveStorage: "0.200 MAF"
      }, 
      geometry: { type: "Point", coordinates: [67.44163, 28.48974] } 
    },
    { 
      type: "Feature", 
      properties: { 
        id: 6, 
        status: "Ready for Construction", 
        name: "Lower Spat Gah", 
        location: "Dasu town, KP", 
        latitude: 35.26536, 
        longitude: 73.22476, 
        installedCapacity: "496 MW", 
        annualEnergy: "2007 GWh"
      }, 
      geometry: { type: "Point", coordinates: [73.22476, 35.26536] } 
    },
    { 
      type: "Feature", 
      properties: { 
        id: 7, 
        status: "Ready for Construction", 
        name: "Bunji", 
        location: "Gilgit-Baltistan", 
        latitude: 35.73584, 
        longitude: 74.6224, 
        installedCapacity: "7100 MW", 
        annualEnergy: "24760 GWh",
        grossStorage: "0.25 MAF"
      }, 
      geometry: { type: "Point", coordinates: [74.6224, 35.73584] } 
    },
    { 
      type: "Feature", 
      properties: { 
        id: 8, 
        status: "Ready for Construction", 
        name: "Lower Palas Valley Hydropower", 
        location: "Patan Town, KP", 
        latitude: 35.09816, 
        longitude: 73.0027, 
        installedCapacity: "665 MW", 
        annualEnergy: "2590 GWh"
      }, 
      geometry: { type: "Point", coordinates: [73.0027, 35.09816] } 
    }
  ]
};
