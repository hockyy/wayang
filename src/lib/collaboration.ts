// Collaboration provider using y-websocket for real-time sync between tabs
// This works offline by using local WebSocket connections and y-indexeddb for persistence

import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

export interface CollaborationConfig {
  roomId: string;
  websocketUrl?: string;
}

export class CollaborationProvider {
  private doc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  private roomId: string;
  private websocketUrl: string;

  constructor(config: CollaborationConfig) {
    this.roomId = config.roomId;
    this.websocketUrl = config.websocketUrl || 'ws://localhost:1234';
    this.doc = new Y.Doc();
  }

  async connect(): Promise<void> {
    try {
      // Set up IndexedDB persistence for offline storage
      this.indexeddbProvider = new IndexeddbPersistence(this.roomId, this.doc);
      
      // Wait for IndexedDB to load
      await this.indexeddbProvider.whenSynced;

      // Create WebSocket provider for real-time collaboration
      this.provider = new WebsocketProvider(
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

        this.provider!.on('status', (event: { status: string }) => {
          if (event.status === 'connected') {
            clearTimeout(timeout);
            resolve();
          }
        });

        this.provider!.on('connection-error', () => {
          clearTimeout(timeout);
          console.warn('WebSocket connection failed, continuing offline');
          resolve(); // Continue offline
        });
      });
    } catch (error) {
      console.warn('Failed to connect to collaboration server, continuing offline:', error);
      // Continue without collaboration
    }
  }

  disconnect(): void {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
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
    return this.provider?.wsconnected || false;
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

export function getCollaborationProvider(roomId: string): CollaborationProvider {
  if (!collaborationInstances.has(roomId)) {
    const provider = new CollaborationProvider({ roomId });
    collaborationInstances.set(roomId, provider);
  }
  return collaborationInstances.get(roomId)!;
}

export function removeCollaborationProvider(roomId: string): void {
  const provider = collaborationInstances.get(roomId);
  if (provider) {
    provider.disconnect();
    collaborationInstances.delete(roomId);
  }
}
