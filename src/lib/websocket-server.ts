// Simple WebSocket server for local collaboration
// This runs in the browser using a service worker approach for offline sync

export interface WebSocketMessage {
  type: 'sync' | 'update' | 'ping';
  roomId: string;
  data?: any;
  timestamp: number;
}

class LocalWebSocketServer {
  private connections: Map<string, Set<MessagePort>> = new Map();
  private roomData: Map<string, any> = new Map();

  constructor() {
    // Listen for connections from different tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  private handleMessage(event: MessageEvent) {
    const { type, roomId, data, port } = event.data;

    switch (type) {
      case 'connect':
        this.handleConnect(roomId, port);
        break;
      case 'disconnect':
        this.handleDisconnect(roomId, port);
        break;
      case 'sync':
        this.handleSync(roomId, data, port);
        break;
      case 'update':
        this.handleUpdate(roomId, data, port);
        break;
    }
  }

  private handleConnect(roomId: string, port: MessagePort) {
    if (!this.connections.has(roomId)) {
      this.connections.set(roomId, new Set());
    }
    this.connections.get(roomId)!.add(port);

    // Send current room data to new connection
    const currentData = this.roomData.get(roomId);
    if (currentData) {
      port.postMessage({
        type: 'sync',
        roomId,
        data: currentData,
        timestamp: Date.now(),
      });
    }
  }

  private handleDisconnect(roomId: string, port: MessagePort) {
    const connections = this.connections.get(roomId);
    if (connections) {
      connections.delete(port);
      if (connections.size === 0) {
        this.connections.delete(roomId);
      }
    }
  }

  private handleSync(roomId: string, data: any, senderPort: MessagePort) {
    this.roomData.set(roomId, data);
    this.broadcast(roomId, {
      type: 'sync',
      roomId,
      data,
      timestamp: Date.now(),
    }, senderPort);
  }

  private handleUpdate(roomId: string, data: any, senderPort: MessagePort) {
    // Merge update with existing data
    const currentData = this.roomData.get(roomId) || {};
    const updatedData = { ...currentData, ...data };
    this.roomData.set(roomId, updatedData);

    this.broadcast(roomId, {
      type: 'update',
      roomId,
      data: updatedData,
      timestamp: Date.now(),
    }, senderPort);
  }

  private broadcast(roomId: string, message: WebSocketMessage, excludePort?: MessagePort) {
    const connections = this.connections.get(roomId);
    if (connections) {
      connections.forEach(port => {
        if (port !== excludePort) {
          try {
            port.postMessage(message);
          } catch (error) {
            // Remove dead connections
            connections.delete(port);
          }
        }
      });
    }
  }
}

// Simple cross-tab communication using BroadcastChannel
export class CrossTabSync {
  private channel: BroadcastChannel;
  private roomId: string;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(roomId: string) {
    this.roomId = roomId;
    this.channel = new BroadcastChannel(`wayang-${roomId}`);
    this.channel.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    const { type, data } = event.data;
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  send(type: string, data: any) {
    this.channel.postMessage({ type, data, timestamp: Date.now() });
  }

  on(type: string, listener: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  off(type: string, listener: Function) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  close() {
    this.channel.close();
    this.listeners.clear();
  }
}

// Global instance for local WebSocket server
export const localWebSocketServer = new LocalWebSocketServer();
