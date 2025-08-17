// Collaboration provider using Yjs with WebRTC, WebSocket, and IndexedDB
// This provides real-time collaboration with offline-first capabilities

import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

export interface CollaborationConfig {
  roomId: string;
  websocketUrl?: string;
  enableWebSocket?: boolean;
}

export class CollaborationProvider {
  private doc: Y.Doc;
  private websocketProvider: WebsocketProvider | null = null;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  private roomId: string;
  private websocketUrl: string;
  private enableWebSocket: boolean;

  constructor(config: CollaborationConfig) {
    this.roomId = config.roomId;
    this.websocketUrl = config.websocketUrl || 'ws://localhost:1234';
    this.enableWebSocket = config.enableWebSocket ?? true;
    this.doc = new Y.Doc();
  }

  async connect(): Promise<void> {
    try {
      // Set up IndexedDB persistence for offline storage - this allows instant access to cached data
      this.indexeddbProvider = new IndexeddbPersistence(this.roomId, this.doc);
      
      // Wait for IndexedDB to load cached data
      await this.indexeddbProvider.whenSynced;
      console.log('loaded data from indexed db');

      // Only set up WebSocket if enabled
      if (this.enableWebSocket) {
        // Set up WebSocket provider for server-based real-time collaboration
        this.websocketProvider = new WebsocketProvider(
          this.websocketUrl,
          this.roomId,
          this.doc,
          {
            connect: true,
            // Offline-first: continue working even without server
            disableBc: false,
          }
        );

        // Wait for connection or timeout
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('WebSocket connection timeout, continuing offline');
            resolve(); // Continue offline
          }, 2000);

          this.websocketProvider!.on('status', (event: { status: string }) => {
            if (event.status === 'connected') {
              clearTimeout(timeout);
              console.log('WebSocket connected successfully');
              resolve();
            }
          });

          this.websocketProvider!.on('connection-error', () => {
            clearTimeout(timeout);
            console.warn('WebSocket connection failed, continuing offline');
            resolve(); // Continue offline
          });
        });
      } else {
        console.log('WebSocket disabled, working in local mode');
      }
    } catch (error) {
      console.warn('Failed to connect to collaboration server, continuing offline:', error);
      // Continue without collaboration
    }
  }

  disconnect(): void {
    if (this.websocketProvider) {
      this.websocketProvider.destroy();
      this.websocketProvider = null;
    }
    if (this.indexeddbProvider) {
      this.indexeddbProvider.destroy();
      this.indexeddbProvider = null;
    }
  }

  getSharedMap(name: string): Y.Map<unknown> {
    return this.doc.getMap(name);
  }

  getSharedArray(name: string): Y.Array<unknown> {
    return this.doc.getArray(name);
  }

  getDoc(): Y.Doc {
    return this.doc;
  }

  isConnected(): boolean {
    // If WebSocket is disabled (local mode), consider it "connected" since we're working locally
    if (!this.enableWebSocket) {
      return true;
    }
    // If WebSocket is enabled, check actual connection status
    return this.websocketProvider?.wsconnected || false;
  }

  getConnectionMode(): 'local' | 'online' {
    return this.enableWebSocket ? 'online' : 'local';
  }

  // Subscribe to changes
  onUpdate(callback: (update: Uint8Array, origin: unknown) => void): void {
    this.doc.on('update', callback);
  }

  offUpdate(callback: (update: Uint8Array, origin: unknown) => void): void {
    this.doc.off('update', callback);
  }
}

// Global collaboration instances
const collaborationInstances = new Map<string, CollaborationProvider>();

export function getCollaborationProvider(roomId: string, config?: Partial<CollaborationConfig>): CollaborationProvider {
  const key = `${roomId}-${config?.enableWebSocket ?? true}`;
  if (!collaborationInstances.has(key)) {
    const provider = new CollaborationProvider({ 
      roomId, 
      ...config 
    });
    collaborationInstances.set(key, provider);
  }
  return collaborationInstances.get(key)!;
}

export function removeCollaborationProvider(roomId: string): void {
  const provider = collaborationInstances.get(roomId);
  if (provider) {
    provider.disconnect();
    collaborationInstances.delete(roomId);
  }
}
