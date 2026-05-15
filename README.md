# Water Monitoring Portal

A real-time water resources monitoring dashboard for Pakistan built with React, Mapbox GL, Recharts, and an Express backend. It visualises river inflows, catchment basins, dam storage, precipitation, snow cover, irrigation networks, and water projection scenarios on an interactive map.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [GeoServer Setup](#geoserver-setup)
- [Platform Notes](#platform-notes)

---

## Features

- Interactive Mapbox map centred on Pakistan with multiple basemap styles
- Catchment basin overlays with per-basin inflow statistics
- Dam infrastructure markers (ongoing, under construction, future, Indian dams)
- Time-series charts: RCP Scenarios, Water Projection, and Monthly Inflow Comparison
- Stat cards for river inflows, snow cover, precipitation, dam storage, and industrial demand
- Slide gallery with image/video upload support
- News ticker with current water situation updates
- Layer control panel with boundary, river, dam, and water variable layers

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 18 | [nodejs.org](https://nodejs.org/) |
| npm | >= 9 | Bundled with Node.js |
| Mapbox account | — | Free tier works; get token at [mapbox.com](https://mapbox.com/) |
| GeoServer | 2.x | Required for WMS/WFS layers (internal network) |

### Optional (for PDF/PPTX slide uploads — Linux/WSL only)

```bash
sudo apt install poppler-utils libreoffice
```

---

## Quick Start

### Windows (CMD / PowerShell)

```bat
git clone <your-repo-url>
cd WaterMonitoringPortal
install.bat
```

Then edit `.env` and add your Mapbox token, then:

```bat
start.bat
```

### Linux / WSL / macOS

```bash
git clone <your-repo-url>
cd WaterMonitoringPortal
chmod +x install.sh start.sh
./install.sh
```

Then edit `.env` and add your Mapbox token, then:

```bash
./start.sh
```

---

## Configuration

Copy `.env.example` to `.env` (the install scripts do this automatically):

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
VITE_MAPBOX_TOKEN=your_mapbox_public_token_here
```

> The `VITE_` prefix is required — Vite exposes only variables with this prefix to the browser.

**Never commit `.env` to Git.** It is already listed in `.gitignore`.

### GeoServer Proxy

The Vite dev server proxies `/geoserver` requests to your GeoServer instance. The default target is configured in `vite.config.js`:

```js
'/geoserver': {
  target: 'http://172.18.1.107:8080',
  changeOrigin: true,
}
```

Update this IP to match your GeoServer host before running.

---

## Running the App

| Command | What it does |
|---------|-------------|
| `start.bat` | Windows: starts backend + frontend |
| `./start.sh` | Linux/WSL: starts backend + frontend |
| `npm run dev:all` | Starts both manually via concurrently |

Once running:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/slides

Both are also accessible on the local network IP shown in the startup banner.

---

## Available Scripts

```bash
npm run dev          # Vite frontend dev server only
npm run server       # Express backend only (port 3001)
npm run dev:all      # Both concurrently (recommended)
npm run build        # Production build → dist/
npm run preview      # Preview the production build
npm run lint         # ESLint check
```

---

## Project Structure

```
WaterMonitoringPortal/
├── public/                  # Static assets & CSV data files
│   ├── Water_RCP_Scenarios.csv
│   ├── Water_Projection_data.csv
│   └── Comparison_Graph.csv
├── server/                  # Express backend
│   ├── index.js             # API server (port 3001)
│   ├── slides.json          # Slide metadata store
│   └── uploads/             # Uploaded media files
├── src/
│   ├── components/
│   │   ├── Charts/          # Stat cards, time-series chart, legend cards
│   │   ├── Layout/          # App layout and CSS grid
│   │   ├── Map/             # Mapbox container, controls, legend
│   │   └── MediaPanel/      # Charts panel, gallery, right panel
│   ├── config/
│   │   └── mapConfig.js     # Map token, styles, layer config, GeoServer URLs
│   ├── data/                # Dam and river GeoJSON/JS data
│   ├── store/
│   │   └── mapStore.js      # Zustand global state (map style, layers, etc.)
│   └── utils/
│       └── csv.js           # CSV fetch and parse utility
├── .env                     # Your local env vars (not committed)
├── .env.example             # Template — commit this
├── install.bat              # Windows installation script
├── install.sh               # Linux/WSL installation script
├── start.bat                # Windows startup script
├── start.sh                 # Linux/WSL startup script
└── vite.config.js           # Vite config with proxy rules
```

---

## GeoServer Setup

The following GeoServer layers are expected on the internal network:

| Layer | Workspace | Type |
|-------|-----------|------|
| National/Provincial/District/Tehsil Boundary | `abdul_sattar` | Vector Tile (TMS/PBF) |
| Rivers, Headworks, Flood Extent, Irrigation | `water_monitoring` | WFS/WMS |
| Snow Cover, ET, Precipitation | `WaterPortal_WS` | WMS |
| Karachi Coastal layers | `Costal` | WMS/Vector |

If GeoServer is unavailable the base map and CSV charts still work; only the overlay layers will fail silently.

---

## Platform Notes

### Windows (CMD / PowerShell)

- Run `install.bat` then `start.bat`
- PDF and PPTX slide uploads **will not work** natively — they require `pdftoppm` and `soffice` (Linux tools)
- All other features (map, charts, image/video uploads) work normally

### WSL (Windows Subsystem for Linux)

- Use `install.sh` and `start.sh`
- Install `poppler-utils` and `libreoffice` for full slide upload support
- The app binds to `0.0.0.0` so it is accessible from the Windows host at `http://localhost:5173`

### macOS / Linux

- Use `install.sh` and `start.sh`
- Install poppler: `brew install poppler` (macOS) or `apt install poppler-utils` (Debian/Ubuntu)
