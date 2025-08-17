# Test Collaboration Setup

## Quick Test Instructions

### 1. Start the Collaboration Environment
```bash
npm run collab
```
This will start both the WebSocket server and Next.js development server.

### 2. Open Two Browser Tabs
- **Tab 1 (Dalang)**: http://localhost:3000/dalang
- **Tab 2 (View)**: http://localhost:3000/view

### 3. Test Real-Time Sync
1. In **Dalang tab**: Create a new canvas
   - Should see green "Connected" status
   - Canvas appears in the canvas panel

2. In **View tab**: 
   - Should automatically show the new canvas
   - Should see green "Live" status

3. In **Dalang tab**: Add an image layer
   - Upload an image or create content
   - Move/resize layers using the tools

4. In **View tab**:
   - Should see all changes in real-time
   - Layer panel should update automatically

### 4. Test Offline Mode
1. Stop the WebSocket server (Ctrl+C in terminal)
2. In both tabs: Status should change to orange "Offline"
3. In **Dalang tab**: Continue editing (should work offline)
4. Restart WebSocket server: `npm run ws-server-persist`
5. Both tabs should reconnect and sync changes

### 5. Test Layer Ordering
1. In **Dalang tab**: Add multiple layers
2. Use up/down arrows in layer panel to reorder
3. In **View tab**: Should see layer order changes immediately

## Expected Results

### ✅ Success Indicators
- Green connection status in both tabs
- Real-time canvas updates between tabs
- Layer ordering syncs instantly
- Offline mode works and syncs when reconnected
- Data persists after browser refresh

### ❌ Common Issues
- **Orange status**: WebSocket server not running
- **No sync**: Check browser console for errors
- **Slow sync**: Normal for large images, should still work

## Performance Notes
- Small changes sync instantly
- Large images may take a moment to sync
- IndexedDB provides fast local caching
- Server persistence ensures data recovery
