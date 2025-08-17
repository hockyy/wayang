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
  private isReady = false;

  constructor(config: CollaborationConfig) {
    this.roomId = config.roomId;
    this.websocketUrl = config.websocketUrl || 'ws://localhost:1234';
    this.enableWebSocket = config.enableWebSocket ?? true;
    this.doc = new Y.Doc();
  }

  async connect(): Promise<void> {
    if (this.isReady) return; // Already connected
    
    try {
      // Set up IndexedDB persistence for offline storage
      this.indexeddbProvider = new IndexeddbPersistence(this.roomId, this.doc);
      
      // Wait for IndexedDB to load cached data
      await this.indexeddbProvider.whenSynced;
      console.log('IndexedDB data loaded');

      // Set up WebSocket if enabled
      if (this.enableWebSocket) {
        this.websocketProvider = new WebsocketProvider(
          this.websocketUrl,
          this.roomId,
          this.doc,
          {
            connect: true,
            disableBc: false, // Enable broadcast channel for local tabs
          }
        );

        // Simple connection setup - no complex timeout handling
        this.websocketProvider.on('status', (event: { status: string }) => {
          if (event.status === 'connected') {
            console.log('WebSocket connected');
          } else if (event.status === 'disconnected') {
            console.log('WebSocket disconnected, working offline');
          }
        });
      }

      this.isReady = true;
    } catch (error) {
      console.warn('Collaboration setup failed, working offline:', error);
      this.isReady = true; // Still mark as ready for offline use
    }
  }

  disconnect(): void {
    this.websocketProvider?.destroy();
    this.indexeddbProvider?.destroy();
    this.websocketProvider = null;
    this.indexeddbProvider = null;
    this.isReady = false;
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
    if (!this.enableWebSocket) return true; // Local mode is always "connected"
    return this.websocketProvider?.wsconnected ?? false;
  }

  isInitialized(): boolean {
    return this.isReady;
  }
}

// Simplified global instance management
const collaborationInstances = new Map<string, CollaborationProvider>();

export function getCollaborationProvider(roomId: string, config?: Partial<CollaborationConfig>): CollaborationProvider {
  const key = `${roomId}-${config?.enableWebSocket ?? true}`;
  
  let provider = collaborationInstances.get(key);
  if (!provider) {
    provider = new CollaborationProvider({ roomId, ...config });
    collaborationInstances.set(key, provider);
  }
  
  return provider;
}

export function removeCollaborationProvider(roomId: string, enableWebSocket = true): void {
  const key = `${roomId}-${enableWebSocket}`;
  const provider = collaborationInstances.get(key);
  if (provider) {
    provider.disconnect();
    collaborationInstances.delete(key);
  }
}

// Helper to create a provider directly (for React hooks)
export function createCollaborationProvider(config: CollaborationConfig): CollaborationProvider {
  return new CollaborationProvider(config);
}
