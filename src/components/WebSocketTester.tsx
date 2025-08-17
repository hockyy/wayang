'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface ConnectionStatus {
  wsConnected: boolean;
  wsConnecting: boolean;
  synced: boolean;
  bcConnected: boolean;
}

export default function WebSocketTester() {
  const [status, setStatus] = useState<ConnectionStatus>({
    wsConnected: false,
    wsConnecting: false,
    synced: false,
    bcConnected: false,
  });
  const [messages, setMessages] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [roomId, setRoomId] = useState('test-room-' + Date.now());
  const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:1234');
  
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const messagesArrayRef = useRef<Y.Array<string> | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const connectWebSocket = () => {
    if (providerRef.current) {
      addLog('Disconnecting existing connection...');
      providerRef.current.destroy();
    }

    addLog(`Connecting to ${websocketUrl} with room: ${roomId}`);
    
    // Create new Y.Doc
    docRef.current = new Y.Doc();
    messagesArrayRef.current = docRef.current.getArray<string>('messages');
    
    // Create WebSocket provider
    providerRef.current = new WebsocketProvider(
      websocketUrl,
      roomId,
      docRef.current,
      {
        connect: true,
        disableBc: false, // Enable broadcast channel for cross-tab sync
      }
    );

    // Set up event listeners
    providerRef.current.on('status', (event: { status: string }) => {
      addLog(`Status changed: ${event.status}`);
      setStatus(prev => ({
        ...prev,
        wsConnected: event.status === 'connected',
        wsConnecting: event.status === 'connecting',
      }));
    });

    providerRef.current.on('sync', (isSynced: boolean) => {
      addLog(`Sync status: ${isSynced ? 'synced' : 'not synced'}`);
      setStatus(prev => ({ ...prev, synced: isSynced }));
    });

    providerRef.current.on('connection-close', (event: CloseEvent) => {
      addLog(`Connection closed: ${event.code} - ${event.reason}`);
    });

    providerRef.current.on('connection-error', (event: Event) => {
      addLog(`Connection error: ${event.type}`);
    });

    // Monitor connection status
    const statusInterval = setInterval(() => {
      if (providerRef.current) {
        setStatus(prev => ({
          ...prev,
          wsConnected: providerRef.current?.wsconnected ?? false,
          wsConnecting: providerRef.current?.wsconnecting ?? false,
          synced: providerRef.current?.synced ?? false,
          bcConnected: providerRef.current?.bcconnected ?? false,
        }));
      }
    }, 1000);

    // Listen for messages from other clients
    messagesArrayRef.current.observe((event) => {
      event.changes.added.forEach((item) => {
        const content = item.content.getContent()[0] as string;
        addLog(`Received message: ${content}`);
      });
    });

    return () => {
      clearInterval(statusInterval);
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  };

  const sendMessage = () => {
    if (messagesArrayRef.current && messageInput.trim()) {
      const message = `${messageInput} (from client ${Math.random().toString(36).substr(2, 9)})`;
      messagesArrayRef.current.push([message]);
      addLog(`Sent message: ${message}`);
      setMessageInput('');
    }
  };

  const disconnect = () => {
    if (providerRef.current) {
      addLog('Disconnecting...');
      providerRef.current.destroy();
      providerRef.current = null;
      docRef.current = null;
      messagesArrayRef.current = null;
      setStatus({
        wsConnected: false,
        wsConnecting: false,
        synced: false,
        bcConnected: false,
      });
    }
  };

  const clearLogs = () => {
    setMessages([]);
  };

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WebSocket Connection Tester</h1>
      
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
              placeholder="ws://localhost:1234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Room ID:</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="test-room"
            />
          </div>
        </div>
        
        <div className="mt-4 space-x-2">
          <button
            onClick={connectWebSocket}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Connection Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${status.wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="text-sm">WebSocket</div>
            <div className="text-xs text-gray-600">{status.wsConnected ? 'Connected' : 'Disconnected'}</div>
          </div>
          <div className="text-center">
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${status.wsConnecting ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
            <div className="text-sm">Connecting</div>
            <div className="text-xs text-gray-600">{status.wsConnecting ? 'Yes' : 'No'}</div>
          </div>
          <div className="text-center">
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${status.synced ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="text-sm">Synced</div>
            <div className="text-xs text-gray-600">{status.synced ? 'Yes' : 'No'}</div>
          </div>
          <div className="text-center">
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${status.bcConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className="text-sm">Cross-tab</div>
            <div className="text-xs text-gray-600">{status.bcConnected ? 'Connected' : 'Disconnected'}</div>
          </div>
        </div>
      </div>

      {/* Message Testing */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Message Testing</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-3 py-2 border rounded-md"
            placeholder="Type a message to send to other clients..."
            disabled={!status.wsConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!status.wsConnected || !messageInput.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Open this page in multiple tabs/windows to test real-time messaging
        </p>
      </div>

      {/* Logs */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Connection Logs</h2>
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
        <div className="bg-black text-green-400 p-3 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click Connect to start testing.</div>
          ) : (
            messages.map((message, index) => (
              <div key={index}>{message}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
