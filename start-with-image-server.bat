@echo off
echo Starting Wayang with Image Server...

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

:: Install image server dependencies if needed
if not exist node_modules_image_server (
    echo Installing image server dependencies...
    mkdir node_modules_image_server
    copy image-server-package.json package_temp.json
    npm install --prefix . express multer cors nodemon
    del package_temp.json
)

:: Start image server in background
echo Starting image server on port 3001...
start /B node image-server.js

:: Wait a moment for server to start
timeout /t 2 /nobreak >nul

:: Start Next.js app
echo Starting Next.js app on port 3000...
npm run dev

:: Cleanup on exit
echo.
echo Shutting down servers...
taskkill /f /im node.exe >nul 2>&1
