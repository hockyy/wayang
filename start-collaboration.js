#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import path from 'path';
import os from 'os';

console.log('🎭 Starting Wayang Collaboration Environment...\n');

// Use exec for better Windows compatibility
const isWindows = os.platform() === 'win32';

// Start y-websocket server with persistence
console.log('📡 Starting WebSocket server on localhost:1234...');

const wsCommand = isWindows 
  ? 'set HOST=localhost && set PORT=1234 && set YPERSISTENCE=./yjs-db && npx y-websocket'
  : 'HOST=localhost PORT=1234 YPERSISTENCE=./yjs-db npx y-websocket';

const wsServer = exec(wsCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ WebSocket server error:', error.message);
    return;
  }
  if (stderr) {
    console.error('WebSocket stderr:', stderr);
  }
  if (stdout) {
    console.log('WebSocket stdout:', stdout);
  }
});

wsServer.stdout?.on('data', (data) => {
  console.log(`WS: ${data}`);
});

wsServer.stderr?.on('data', (data) => {
  console.error(`WS Error: ${data}`);
});

// Wait a moment for WebSocket server to start
setTimeout(() => {
  console.log('🚀 Starting Next.js development server...');
  
  // Start Next.js dev server
  const nextCommand = isWindows ? 'npm.cmd run dev' : 'npm run dev';
  const nextServer = exec(nextCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Next.js server error:', error.message);
      return;
    }
  });

  nextServer.stdout?.on('data', (data) => {
    console.log(`Next: ${data}`);
  });

  nextServer.stderr?.on('data', (data) => {
    console.error(`Next Error: ${data}`);
  });

  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    wsServer.kill();
    nextServer.kill();
    process.exit(0);
  });

  nextServer.on('close', (code) => {
    console.log(`Next.js server exited with code ${code}`);
    wsServer.kill();
  });

  wsServer.on('close', (code) => {
    console.log(`WebSocket server exited with code ${code}`);
    nextServer.kill();
  });

}, 3000);

console.log('\n📋 Instructions:');
console.log('  1. Wait for both servers to start');
console.log('  2. Open Dalang: http://localhost:3000/dalang');
console.log('  3. Open View: http://localhost:3000/view');
console.log('  4. Create canvases in Dalang and watch them sync to View!');
console.log('  5. Press Ctrl+C to stop both servers\n');

wsServer.on('error', (err) => {
  console.error('❌ Failed to start WebSocket server:', err.message);
  process.exit(1);
});
