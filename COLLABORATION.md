# Wayang Collaboration Setup

This document explains how to set up real-time collaboration between Dalang (editor) and View tabs using y-websocket.

## Quick Start

### Option 1: Basic WebSocket Server (No Persistence)
```bash
npm run ws-server
```
This starts a y-websocket server on `localhost:1234` without persistence.

### Option 2: WebSocket Server with Persistence (Recommended)
```bash
npm run ws-server-persist
```
This starts a y-websocket server with LevelDB persistence in `./yjs-db` directory.

### Option 3: Run Everything Together
```bash
# Install concurrently first (optional)
npm install --save-dev concurrently

# Then run both servers
npm run dev-full
```

## Manual Setup

### 1. Start the WebSocket Server
```bash
# Basic server
HOST=localhost PORT=1234 npx y-websocket

# With persistence
HOST=localhost PORT=1234 YPERSISTENCE=./yjs-db npx y-websocket
```

### 2. Start the Next.js App
```bash
npm run dev
```

### 3. Open Multiple Tabs
- **Dalang (Editor)**: http://localhost:3000/dalang
- **View (Read-only)**: http://localhost:3000/view

## How It Works

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dalang Tab    │◄──►│  WebSocket       │◄──►│   View Tab      │
│  (Full Editor)  │    │  Server :1234    │    │  (Read-only)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   IndexedDB     │    │    LevelDB       │    │   IndexedDB     │
│ (Local Cache)   │    │ (Server Persist) │    │ (Local Cache)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow
1. **Create/Edit** in Dalang → Syncs to WebSocket Server → Updates View tab
2. **Offline Mode**: Changes stored locally in IndexedDB, sync when reconnected
3. **Persistence**: Server optionally saves to LevelDB for recovery

### Connection Status
- 🟢 **Green**: Connected to WebSocket server (real-time sync)
- 🟠 **Orange**: Offline mode (local-only, will sync when reconnected)

## Features

### Layer Ordering
- Use up/down arrows in layer panel to reorder layers
- Changes sync instantly between tabs
- Works offline and syncs when reconnected

### Cross-Tab Collaboration
- Real-time canvas updates between dalang and view
- Automatic conflict resolution using CRDTs
- Graceful offline fallback

### Data Persistence
- **Local**: IndexedDB for offline storage
- **Server**: Optional LevelDB persistence
- **Recovery**: Automatic data restoration on restart

## Troubleshooting

### WebSocket Connection Issues
1. Make sure WebSocket server is running on port 1234
2. Check firewall settings
3. Verify no other service is using port 1234

### Data Not Syncing
1. Check connection status indicator (green/orange dot)
2. Refresh both tabs
3. Clear browser cache and restart WebSocket server

### Performance
- WebSocket server handles multiple rooms automatically
- Each canvas uses room ID for isolation
- IndexedDB provides fast local caching

## Environment Variables

```bash
# WebSocket server configuration
HOST=localhost          # Server host (default: localhost)
PORT=1234               # Server port (default: 1234)
YPERSISTENCE=./yjs-db   # Persistence directory (optional)

# Advanced options
CALLBACK_URL=http://localhost:3000/api/sync  # HTTP callback on updates
CALLBACK_DEBOUNCE_WAIT=2000                  # Debounce time (ms)
CALLBACK_TIMEOUT=5000                        # HTTP timeout (ms)
```

## Development

### Testing Collaboration
1. Start WebSocket server: `npm run ws-server-persist`
2. Start Next.js: `npm run dev`
3. Open dalang: http://localhost:3000/dalang
4. Open view: http://localhost:3000/view
5. Create canvas in dalang → Should appear in view
6. Add layers in dalang → Should sync to view
7. Test offline: Stop WebSocket server → Should continue working locally

### Production Deployment
1. Deploy WebSocket server on your infrastructure
2. Update `websocketUrl` in collaboration config
3. Consider using authentication/authorization middleware
4. Set up monitoring for WebSocket connections
