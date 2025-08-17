'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface SyncTestResult {
  timestamp: string;
  action: string;
  success: boolean;
  details: string;
}

export default function YjsSyncTester() {
  const [roomId, setRoomId] = useState('sync-test-' + Date.now());
  const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:1234');
  const [isConnected, setIsConnected] = useState(false);
  const [testResults, setTestResults] = useState<SyncTestResult[]>([]);
  const [sharedText, setSharedText] = useState('');
  const [localInput, setLocalInput] = useState('');
  
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const textRef = useRef<Y.Text | null>(null);

  const addResult = (action: string, success: boolean, details: string) => {
    const result: SyncTestResult = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      success,
      details
    };
    setTestResults(prev => [result, ...prev]);
  };

  const connectToRoom = () => {
    if (providerRef.current) {
      providerRef.current.destroy();
    }

    addResult('Connection', false, `Attempting to connect to ${websocketUrl} room: ${roomId}`);

    // Create Y.Doc and shared structures
    docRef.current = new Y.Doc();
    textRef.current = docRef.current.getText('sharedText');
    
    // Create WebSocket provider
    providerRef.current = new WebsocketProvider(
      websocketUrl,
      roomId,
      docRef.current,
      {
        connect: true,
        disableBc: false,
      }
    );

    // Set up event listeners
    providerRef.current.on('status', (event: { status: string }) => {
      const connected = event.status === 'connected';
      setIsConnected(connected);
      addResult('Status Change', true, `WebSocket ${event.status}`);
    });

    providerRef.current.on('sync', (isSynced: boolean) => {
      addResult('Sync', isSynced, `Document ${isSynced ? 'synced' : 'not synced'}`);
    });

    // Listen for text changes from other clients
    textRef.current.observe((event) => {
      const currentText = textRef.current?.toString() || '';
      setSharedText(currentText);
      
      if (event.changes.delta.length > 0) {
        addResult('Remote Change', true, `Text updated from remote client: "${currentText}"`);
      }
    });

    // Set initial text from document
    setSharedText(textRef.current.toString());
  };

  const insertText = () => {
    if (!textRef.current || !localInput.trim()) return;

    const insertPosition = textRef.current.length;
    const textToInsert = localInput + ' ';
    
    textRef.current.insert(insertPosition, textToInsert);
    addResult('Local Insert', true, `Inserted "${textToInsert}" at position ${insertPosition}`);
    setLocalInput('');
  };

  const deleteText = () => {
    if (!textRef.current || textRef.current.length === 0) return;

    const deleteLength = Math.min(5, textRef.current.length);
    const startPos = textRef.current.length - deleteLength;
    
    textRef.current.delete(startPos, deleteLength);
    addResult('Local Delete', true, `Deleted ${deleteLength} characters from position ${startPos}`);
  };

  const clearText = () => {
    if (!textRef.current) return;

    const length = textRef.current.length;
    if (length > 0) {
      textRef.current.delete(0, length);
      addResult('Clear Text', true, `Cleared all ${length} characters`);
    }
  };

  const runAutoTest = async () => {
    if (!textRef.current) return;

    addResult('Auto Test', false, 'Starting automated sync test...');

    const testStrings = [
      'Hello from client ' + Math.random().toString(36).substr(2, 9),
      'Testing sync at ' + new Date().toLocaleTimeString(),
      'Random data: ' + Math.random().toString(),
    ];

    for (let i = 0; i < testStrings.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      textRef.current.insert(textRef.current.length, testStrings[i] + '\n');
      addResult('Auto Insert', true, `Auto-inserted: "${testStrings[i]}"`);
    }

    addResult('Auto Test', true, 'Automated test completed');
  };

  const disconnect = () => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
      docRef.current = null;
      textRef.current = null;
      setIsConnected(false);
      addResult('Disconnect', true, 'Disconnected from room');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Y.js Document Synchronization Tester</h1>
      
      {/* Connection Settings */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Connection Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">WebSocket URL:</label>
            <input
              type="text"
              value={websocketUrl}
              onChange={(e) => setWebsocketUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={isConnected}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Room ID:</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={isConnected}
            />
          </div>
        </div>
        
        <div className="mt-4 space-x-2">
          <button
            onClick={connectToRoom}
            disabled={isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400"
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shared Document */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Shared Y.Text Document</h2>
            <div className={`px-2 py-1 rounded text-sm ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md mb-4 min-h-32 font-mono text-sm whitespace-pre-wrap">
            {sharedText || '(empty document)'}
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && insertText()}
                placeholder="Type text to insert..."
                className="flex-1 px-3 py-2 border rounded-md"
                disabled={!isConnected}
              />
              <button
                onClick={insertText}
                disabled={!isConnected || !localInput.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
              >
                Insert
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={deleteText}
                disabled={!isConnected || sharedText.length === 0}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-400"
              >
                Delete Last 5 Chars
              </button>
              <button
                onClick={clearText}
                disabled={!isConnected || sharedText.length === 0}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400"
              >
                Clear All
              </button>
              <button
                onClick={runAutoTest}
                disabled={!isConnected}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400"
              >
                Run Auto Test
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Sync Test Results</h2>
            <button
              onClick={clearResults}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {testResults.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No test results yet. Connect and start testing!
              </div>
            ) : (
              testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md text-sm ${
                    result.success 
                      ? 'bg-green-50 border-l-4 border-green-400' 
                      : 'bg-red-50 border-l-4 border-red-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{result.action}</span>
                    <span className="text-xs text-gray-500">{result.timestamp}</span>
                  </div>
                  <div className="text-gray-700">{result.details}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Testing Instructions:</h3>
        <ul className="text-blue-700 space-y-1 text-sm">
          <li>1. Connect to a room using the settings above</li>
          <li>2. Open this page in multiple tabs/windows with the same room ID</li>
          <li>3. Type and insert text in one tab - it should appear in all tabs</li>
          <li>4. Use delete/clear operations and watch them sync across tabs</li>
          <li>5. Run the auto test to see automated sync operations</li>
          <li>6. Check the test results panel for detailed sync information</li>
        </ul>
      </div>
    </div>
  );
}
