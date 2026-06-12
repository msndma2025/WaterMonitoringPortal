#!/usr/bin/env python3
import os
import json
import fiona
from pathlib import Path

# Temperature directory
temp_dir = Path('public/temp_2027')
months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

print("Converting temperature shapefiles to GeoJSON...\n")

for month in months:
    shp_file = temp_dir / f'v{month}.shp'
    geojson_file = temp_dir / f'v{month}.geojson'

    if not shp_file.exists():
        print(f"⚠️  {shp_file} not found, skipping...")
        continue

    try:
        print(f"Converting v{month}.shp...")

        # Read shapefile using fiona
        with fiona.open(shp_file) as src:
            features = []
            for feature in src:
                features.append(feature)

            geojson = {
                "type": "FeatureCollection",
                "features": features
            }

        # Write GeoJSON
        with open(geojson_file, 'w') as f:
            json.dump(geojson, f)

        print(f"✅ Created {geojson_file.name} ({len(features)} features)\n")

    except Exception as e:
        print(f"❌ Error converting {month}: {str(e)}\n")

print("✓ Conversion complete!")
