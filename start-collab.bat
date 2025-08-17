@echo off
echo 🎭 Starting Wayang Collaboration Environment...
echo.

echo 📡 Starting WebSocket server on localhost:1234...
set HOST=localhost
set PORT=1234
set YPERSISTENCE=./yjs-db

start "WebSocket Server" cmd /c "npx y-websocket"

echo ⏳ Waiting for WebSocket server to start...
timeout /t 3 /nobreak > nul

echo 🚀 Starting Next.js development server...
start "Next.js Server" cmd /c "npm run dev"

echo.
echo 📋 Instructions:
echo   1. Wait for both servers to start
echo   2. Open Dalang: http://localhost:3000/dalang
echo   3. Open View: http://localhost:3000/view
echo   4. Create canvases in Dalang and watch them sync to View!
echo   5. Close the command windows to stop the servers
echo.
echo ✅ Both servers are starting in separate windows...
pause
