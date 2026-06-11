#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { open } from 'shapefile';

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const tempDir = './public/temp_2027';

async function convertShapefilesToGeoJSON() {
  console.log('Converting temperature shapefiles to GeoJSON...\n');

  for (const month of months) {
    const shapefilePath = path.join(tempDir, `v${month}.shp`);
    const geojsonPath = path.join(tempDir, `v${month}.geojson`);

    try {
      if (!fs.existsSync(shapefilePath)) {
        console.warn(`⚠️  ${shapefilePath} not found, skipping...`);
        continue;
      }

      console.log(`Converting v${month}.shp...`);
      const source = await open(shapefilePath);
      const features = [];
      let result = await source.read();

      while (!result.done) {
        features.push(result.value);
        result = await source.read();
      }

      const geojson = {
        type: 'FeatureCollection',
        features: features
      };

      fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));
      console.log(`✅ Created ${path.basename(geojsonPath)} (${features.length} features)\n`);
    } catch (error) {
      console.error(`❌ Error converting ${month}:`, error.message, '\n');
    }
  }

  console.log('✓ Conversion complete!');
}

convertShapefilesToGeoJSON().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
