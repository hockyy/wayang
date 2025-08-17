// Database utility for storing canvas and layer data offline
// Using IndexedDB for browser-based storage

export interface CanvasData {
  id: string;
  width: number;
  height: number;
  background: any;
  layers: LayerData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerData {
  id: string;
  type: string;
  bottomLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  layerOrder: number;
  oriWidth: number;
  oriHeight: number;
  srcPath?: string;
  mimeType?: string;
  isAnimated?: boolean;
}

class WayangDatabase {
  private dbName = 'wayang-db';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create canvases store
        if (!db.objectStoreNames.contains('canvases')) {
          const canvasStore = db.createObjectStore('canvases', { keyPath: 'id' });
          canvasStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create layers store
        if (!db.objectStoreNames.contains('layers')) {
          const layerStore = db.createObjectStore('layers', { keyPath: 'id' });
          layerStore.createIndex('canvasId', 'canvasId', { unique: false });
        }
      };
    });
  }

  async saveCanvas(canvasData: CanvasData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['canvases'], 'readwrite');
      const store = transaction.objectStore('canvases');
      
      canvasData.updatedAt = new Date();
      const request = store.put(canvasData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save canvas'));
    });
  }

  async getCanvas(id: string): Promise<CanvasData | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['canvases'], 'readonly');
      const store = transaction.objectStore('canvases');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(new Error('Failed to get canvas'));
    });
  }

  async getAllCanvases(): Promise<CanvasData[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['canvases'], 'readonly');
      const store = transaction.objectStore('canvases');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(new Error('Failed to get canvases'));
    });
  }

  async deleteCanvas(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['canvases'], 'readwrite');
      const store = transaction.objectStore('canvases');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete canvas'));
    });
  }
}

// Singleton instance
export const wayangDB = new WayangDatabase();
