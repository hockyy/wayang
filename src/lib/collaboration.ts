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
      console.log(`🔄 Initializing collaboration for room: ${this.roomId}`);
      console.log(`🌐 WebSocket enabled: ${this.enableWebSocket}, URL: ${this.websocketUrl}`);
      
      // Set up IndexedDB persistence for offline storage
      console.log('📦 Setting up IndexedDB persistence...');
      this.indexeddbProvider = new IndexeddbPersistence(this.roomId, this.doc);
      
      // Wait for IndexedDB to load cached data
      await this.indexeddbProvider.whenSynced;
      console.log('✅ IndexedDB data loaded and synced');

      // Set up WebSocket if enabled
      if (this.enableWebSocket) {
        console.log(`🔌 Connecting to WebSocket at ${this.websocketUrl}...`);
        this.websocketProvider = new WebsocketProvider(
          this.websocketUrl,
          this.roomId,
          this.doc,
          {
            connect: true,
            disableBc: false, // Enable broadcast channel for local tabs
          }
        );

        // Enhanced connection status logging
        this.websocketProvider.on('status', (event: { status: string }) => {
          console.log(`🔗 WebSocket status changed: ${event.status}`);
          if (event.status === 'connected') {
            console.log('✅ WebSocket connected successfully');
            console.log(`📊 Connection details:`, {
              wsConnected: this.websocketProvider?.wsconnected,
              wsConnecting: this.websocketProvider?.wsconnecting,
              synced: this.websocketProvider?.synced,
              bcConnected: this.websocketProvider?.bcconnected,
            });
          } else if (event.status === 'disconnected') {
            console.log('❌ WebSocket disconnected, working offline');
          } else if (event.status === 'connecting') {
            console.log('🔄 WebSocket connecting...');
          }
        });

        this.websocketProvider.on('sync', (isSynced: boolean) => {
          console.log(`🔄 Sync status changed: ${isSynced ? 'synced' : 'not synced'}`);
        });

        this.websocketProvider.on('connection-close', (event: CloseEvent | null) => {
          if (event) {
            console.log(`🔌 WebSocket connection closed:`, {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            });
          } else {
            console.log('🔌 WebSocket connection closed (no event details)');
          }
        });

        this.websocketProvider.on('connection-error', (event: Event) => {
          console.error('❌ WebSocket connection error:', event);
        });

        // Log awareness information
        if (this.websocketProvider.awareness) {
          this.websocketProvider.awareness.on('change', () => {
            const states = Array.from(this.websocketProvider!.awareness.getStates().values());
            console.log('👥 Awareness states changed:', states.length, 'clients connected');
          });
        }

        // Periodic connection status logging
        const statusLogger = setInterval(() => {
          if (this.websocketProvider) {
            console.log('📊 Periodic status check:', {
              wsConnected: this.websocketProvider.wsconnected,
              wsConnecting: this.websocketProvider.wsconnecting,
              synced: this.websocketProvider.synced,
              bcConnected: this.websocketProvider.bcconnected,
              shouldConnect: this.websocketProvider.shouldConnect,
            });
          } else {
            clearInterval(statusLogger);
          }
        }, 10000); // Every 10 seconds
      }

      this.isReady = true;
      console.log('✅ Collaboration provider initialized successfully');
    } catch (error) {
      console.error('❌ Collaboration setup failed, working offline:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
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
