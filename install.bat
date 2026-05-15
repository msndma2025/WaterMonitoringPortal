@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Water Monitoring Portal - Installation
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please download and install Node.js 18 or higher from:
    echo https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node --version') do set NODE_VER=%%a
echo [OK] Node.js found: %NODE_VER%

REM Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please reinstall Node.js.
    pause
    exit /b 1
)
echo [OK] npm found.

REM Create .env if it doesn't exist
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Created .env from .env.example
        echo        Please open .env and set your VITE_MAPBOX_TOKEN before starting.
    ) else (
        echo [WARN] No .env or .env.example found. Create a .env file manually.
    )
) else (
    echo [OK] .env file already exists.
)

REM Create server/uploads directory
if not exist "server\uploads" (
    mkdir "server\uploads"
    echo [OK] Created server\uploads directory.
)

REM Install dependencies
echo.
echo Installing npm dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Installation complete!
echo ============================================
echo.
echo Next steps:
echo  1. Make sure your .env file has a valid VITE_MAPBOX_TOKEN
echo  2. Run start.bat to launch the application
echo.
echo Note: PDF and PPTX slide uploads require WSL or a Linux
echo environment with poppler-utils and LibreOffice installed.
echo.
pause
