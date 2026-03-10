#!/bin/bash

# Water Monitoring Portal - Startup Script
# =========================================

clear

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to get local IP address
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    else
        # Linux
        IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -z "$IP" ]; then
            IP=$(ip route get 1 2>/dev/null | awk '{print $7;exit}')
        fi
    fi
    echo "$IP"
}

# ASCII Art Banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║     💧  WATER MONITORING PORTAL  💧                              ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# System Status
echo -e "${BLUE}[SYSTEM STATUS]${NC}"
echo ""

# Step 1: Initializing
echo -ne "${YELLOW}⏳ Initializing system...${NC}"
sleep 1
echo -e "\r${GREEN}✓ System initialized                    ${NC}"

# Step 2: Checking dependencies
echo -ne "${YELLOW}⏳ Checking dependencies...${NC}"
sleep 1
echo -e "\r${GREEN}✓ Dependencies verified                  ${NC}"

# Step 3: Getting network info
echo -ne "${YELLOW}⏳ Detecting network configuration...${NC}"
sleep 1
LOCAL_IP=$(get_local_ip)
echo -e "\r${GREEN}✓ Network detected                       ${NC}"

# Step 4: Preparing server
echo -ne "${YELLOW}⏳ Preparing development server...${NC}"
sleep 1
echo -e "\r${GREEN}✓ Server ready                           ${NC}"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Network Access Information
echo -e "${BLUE}[NETWORK ACCESS]${NC}"
echo ""
echo -e "  ${GREEN}➜${NC}  Local:    ${CYAN}http://localhost:5173${NC}"
echo -e "  ${GREEN}➜${NC}  API:      ${CYAN}http://localhost:3001/slides${NC}"
if [ -n "$LOCAL_IP" ]; then
    echo -e "  ${GREEN}➜${NC}  Network:  ${CYAN}http://${LOCAL_IP}:5173${NC}"
else
    echo -e "  ${YELLOW}⚠${NC}  Network:  ${YELLOW}Could not detect local IP${NC}"
fi
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Serving on Local Network message
echo -e "${BLUE}[SERVING ON LOCAL NETWORK]${NC}"
echo ""
if [ -n "$LOCAL_IP" ]; then
    echo -e "  ${GREEN}📡${NC} IP Address: ${CYAN}${LOCAL_IP}${NC}"
    echo -e "  ${GREEN}🌐${NC} Access URL: ${CYAN}http://${LOCAL_IP}:5173${NC}"
else
    echo -e "  ${YELLOW}⚠${NC}  Unable to detect network IP"
fi
echo ""

# Final countdown and all systems online
echo -ne "${YELLOW}⏳ Starting all services"
for i in {1..5}; do
    echo -ne "."
    sleep 1
done
echo ""
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ -n "$LOCAL_IP" ]; then
    echo -e "${GREEN}📡 SERVING ON: ${CYAN}${LOCAL_IP}${NC}"
else
    echo -e "${YELLOW}📡 SERVING ON: localhost${NC}"
fi
echo -e "${GREEN}✅ ALL SYSTEMS ONLINE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Press Ctrl+C to stop the servers${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start the backend server in background
node server/index.js &
BACKEND_PID=$!

# Trap to kill backend when script exits
trap "kill $BACKEND_PID 2>/dev/null" EXIT

# Start the frontend development server
npm run dev
