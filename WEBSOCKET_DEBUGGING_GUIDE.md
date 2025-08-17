# WebSocket Connection Debugging Guide

This guide will help you diagnose and fix WebSocket connection issues in your Wayang collaboration system.

## 🔍 Quick Diagnosis Steps

### Step 1: Test WebSocket Server
First, let's check if your WebSocket server is running and accessible:

```bash
# Start the WebSocket server with persistence
npm run ws-server-persist

# Or manually:
HOST=localhost PORT=1234 YPERSISTENCE=./yjs-db npx y-websocket
```

### Step 2: Test Basic Connectivity
Run the connection test script:

```bash
node test-websocket-connection.js
```

### Step 3: Use the WebSocket Tester Page
1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Open the WebSocket tester page:
   ```
   http://localhost:3000/test-websocket
   ```

3. Click "Connect" and watch the logs for connection status

### Step 4: Test Multi-Client Messaging
1. Open the WebSocket tester in multiple browser tabs/windows
2. Connect all clients to the same room
3. Send messages from one tab and verify they appear in others

## 🛠️ Common Issues and Solutions

### Issue 1: "Connection failed" or "ECONNREFUSED"
**Cause**: WebSocket server is not running
**Solution**: 
```bash
# Make sure the server is running
npm run ws-server-persist

# Check if port 1234 is in use (Windows):
netstat -an | findstr 1234

# Check if port 1234 is in use (Linux/Mac):
lsof -i :1234
```

### Issue 2: "Connection timeout"
**Cause**: Server is running but not responding
**Solutions**:
- Check firewall settings
- Try a different port
- Verify server logs for errors

### Issue 3: "Connected but not syncing"
**Cause**: Y.js document sync issues
**Solutions**:
- Check browser console for Y.js errors
- Verify IndexedDB is working
- Clear browser storage and try again

### Issue 4: "Cross-tab sync not working"
**Cause**: BroadcastChannel issues
**Solutions**:
- Ensure `disableBc: false` in WebsocketProvider options
- Check browser support for BroadcastChannel
- Test in different browsers

## 🔧 Advanced Debugging

### Enable Verbose Logging
The collaboration provider now includes enhanced logging. Open browser console to see detailed connection info.

### Check Y.js Document State
```javascript
// In browser console:
console.log('Y.Doc state:', doc.toJSON());
console.log('Provider status:', provider.wsconnected, provider.synced);
```

### Monitor Network Traffic
1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Watch for connection attempts and messages

## 📊 Expected Behavior

### Successful Connection Sequence:
1. `🔄 Initializing collaboration for room: [room-id]`
2. `📦 Setting up IndexedDB persistence...`
3. `✅ IndexedDB data loaded and synced`
4. `🔌 Connecting to WebSocket at ws://localhost:1234...`
5. `🔗 WebSocket status changed: connecting`
6. `🔗 WebSocket status changed: connected`
7. `✅ WebSocket connected successfully`
8. `🔄 Sync status changed: synced`

### Multi-Client Messaging:
1. Client A sends message → appears in all connected clients
2. `👥 Awareness states changed: X clients connected`
3. Real-time sync of Y.js document changes

## 🚀 Testing Your Setup

### Test 1: Basic Connection
```bash
# Terminal 1: Start WebSocket server
npm run ws-server-persist

# Terminal 2: Test connection
node test-websocket-connection.js
```

### Test 2: Multi-Tab Sync
1. Open `http://localhost:3000/test-websocket` in 2+ tabs
2. Connect all tabs to the same room
3. Send messages from different tabs
4. Verify all tabs receive messages

### Test 3: Canvas Collaboration
1. Open `http://localhost:3000/dalang` in multiple tabs
2. Create canvases in one tab
3. Verify they appear in other tabs
4. Add layers and test real-time sync

## 🔍 Troubleshooting Checklist

- [ ] WebSocket server is running on port 1234
- [ ] No firewall blocking localhost:1234
- [ ] Browser console shows successful connection logs
- [ ] Multiple tabs can connect to the same room
- [ ] Messages sync between tabs in real-time
- [ ] Y.js documents sync properly
- [ ] IndexedDB persistence is working

## 📞 Need Help?

If you're still having issues:
1. Share the browser console logs
2. Share the WebSocket server logs
3. Describe your testing environment (OS, browser, network setup)
4. Mention any error messages you're seeing
