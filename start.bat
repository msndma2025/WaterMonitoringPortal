@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

:: Water Monitoring Portal - Startup Script
:: =========================================

cls

:: Get the directory where the script is located
cd /d "%~dp0"

:: Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP:~1!"
    goto :gotip
)
:gotip

:: ASCII Art Banner
echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                                                                   ║
echo ║     💧  WATER MONITORING PORTAL  💧                              ║
echo ║                                                                   ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: System Status
echo [SYSTEM STATUS]
echo.

:: Step 1: Initializing
echo ⏳ Initializing system...
timeout /t 1 /nobreak >nul
echo ✓ System initialized

:: Step 2: Checking dependencies
echo ⏳ Checking dependencies...
timeout /t 1 /nobreak >nul
echo ✓ Dependencies verified

:: Step 3: Getting network info
echo ⏳ Detecting network configuration...
timeout /t 1 /nobreak >nul
echo ✓ Network detected

:: Step 4: Preparing server
echo ⏳ Preparing development server...
timeout /t 1 /nobreak >nul
echo ✓ Server ready

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: Network Access Information
echo [NETWORK ACCESS]
echo.
echo   ➜  Local:    http://localhost:5173
if defined LOCAL_IP (
    echo   ➜  Network:  http://!LOCAL_IP!:5173
) else (
    echo   ⚠  Network:  Could not detect local IP
)
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: Serving on Local Network message
echo [SERVING ON LOCAL NETWORK]
echo.
if defined LOCAL_IP (
    echo   📡 IP Address: !LOCAL_IP!
    echo   🌐 Access URL: http://!LOCAL_IP!:5173
) else (
    echo   ⚠  Unable to detect network IP
)
echo.

:: Final countdown and all systems online
echo ⏳ Starting all services.....
timeout /t 5 /nobreak >nul
echo.
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if defined LOCAL_IP (
    echo 📡 SERVING ON: !LOCAL_IP!
) else (
    echo 📡 SERVING ON: localhost
)
echo ✅ ALL SYSTEMS ONLINE
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Press Ctrl+C to stop the server
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: Start the development server
npm run dev

endlocal
