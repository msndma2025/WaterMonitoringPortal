#!/bin/bash
set -e

echo "============================================"
echo " Water Monitoring Portal - Installation"
echo "============================================"
echo

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Install it via your package manager, e.g.:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Or use nvm:    https://github.com/nvm-sh/nvm"
    exit 1
fi

NODE_VER=$(node --version)
echo "[OK] Node.js found: $NODE_VER"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not found. Please install npm."
    exit 1
fi
echo "[OK] npm found."

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[INFO] Created .env from .env.example"
        echo "       Please edit .env and set your VITE_MAPBOX_TOKEN before starting."
    else
        echo "[WARN] No .env or .env.example found. Create a .env file manually."
    fi
else
    echo "[OK] .env file already exists."
fi

# Create server/uploads directory
if [ ! -d "server/uploads" ]; then
    mkdir -p server/uploads
    echo "[OK] Created server/uploads directory."
fi

# Optional: check for poppler-utils (needed for PDF slide uploads)
if ! command -v pdftoppm &> /dev/null; then
    echo "[WARN] pdftoppm not found. PDF slide uploads will not work."
    echo "       Install with: sudo apt install poppler-utils"
fi

# Optional: check for LibreOffice (needed for PPTX slide uploads)
if ! command -v soffice &> /dev/null; then
    echo "[WARN] LibreOffice not found. PPTX slide uploads will not work."
    echo "       Install with: sudo apt install libreoffice"
fi

# Install dependencies
echo
echo "Installing npm dependencies..."
npm install

echo
echo "============================================"
echo " Installation complete!"
echo "============================================"
echo
echo "Next steps:"
echo "  1. Make sure your .env file has a valid VITE_MAPBOX_TOKEN"
echo "  2. Run ./start.sh to launch the application"
echo
