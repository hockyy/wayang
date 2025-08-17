import { useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, Layer, Point, BackgroundConfig, ImageLayer } from '@/types/core';
import { wayangDB, CanvasData, LayerData } from '@/lib/database';
import { getCollaborationProvider, CollaborationProvider } from '@/lib/collaboration';

export interface UseCollaborativeCanvasProps {
  roomId: string;
  mode?: 'online' | 'local';
}

export interface UseCollaborativeCanvasReturn {
  canvases: Canvas[];
  activeCanvas: Canvas | null;
  activeCanvasId: string | null;
  activeCanvasLayers: Layer[];
  isConnected: boolean;
  mode: 'online' | 'local';
  createCanvas: (width: number, height: number, bg: BackgroundConfig) => Canvas;
  createCanvasFromImage: (file: File) => Promise<Canvas>;
  deleteCanvas: (canvasId: string) => void;
  setActiveCanvas: (canvasId: string) => void;
  addLayerToCanvas: (canvasId: string, layer: Layer) => void;
  removeLayerFromCanvas: (canvasId: string, layerId: string) => void;
  updateLayer: (canvasId: string, layerId: string, updates: Partial<Layer>) => void;
  moveLayer: (canvasId: string, layerId: string, offsetX: number, offsetY: number) => void;
  resizeLayer: (canvasId: string, layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => void;
  moveLayerUp: (canvasId: string, layerId: string) => void;
  moveLayerDown: (canvasId: string, layerId: string) => void;
  getTopLayerAt: (canvasId: string, point: Point) => Layer | null;
}

function canvasToData(canvas: Canvas): CanvasData {
  return {
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    background: canvas.bg,
    layers: canvas.layers.map(layerToData),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function layerToData(layer: Layer): LayerData {
  const data: LayerData = {
    id: layer.id,
    type: layer.constructor.name,
    bottomLeft: { x: layer.bottomLeft.x, y: layer.bottomLeft.y },
    topRight: { x: layer.topRight.x, y: layer.topRight.y },
    layerOrder: layer.layerOrder,
    oriWidth: layer.oriWidth,
    oriHeight: layer.oriHeight,
  };

  // Add specific properties for different layer types
  if (layer instanceof ImageLayer) {
    data.srcPath = layer.srcPath;
    data.mimeType = layer.mimeType;
    data.isAnimated = layer.isAnimated;
  }

  return data;
}

function dataToCanvas(data: CanvasData): Canvas {
  const canvas = new Canvas(data.width, data.height, data.background);
  canvas.id = data.id;
  canvas.layers = data.layers.map(dataToLayer);
  return canvas;
}

function dataToLayer(data: LayerData): Layer {
  // Create appropriate layer type based on stored type
  if (data.type === 'ImageLayer') {
    return new ImageLayer(
      new Point(data.bottomLeft.x, data.bottomLeft.y),
      new Point(data.topRight.x, data.topRight.y),
      data.layerOrder,
      data.oriWidth,
      data.oriHeight,
      data.srcPath || '',
      data.mimeType,
      data.isAnimated
    );
  }
  
  // Default to base Layer
  const layer = new Layer(
    new Point(data.bottomLeft.x, data.bottomLeft.y),
    new Point(data.topRight.x, data.topRight.y),
    data.layerOrder,
    data.oriWidth,
    data.oriHeight
  );
  layer.id = data.id;
  return layer;
}

export const useCollaborativeCanvas = ({ roomId, mode = 'local' }: UseCollaborativeCanvasProps): UseCollaborativeCanvasReturn => {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborationProvider, setCollaborationProvider] = useState<CollaborationProvider | null>(null);

  const activeCanvas = useMemo(() => {
    return canvases.find(canvas => canvas.id === activeCanvasId) || null;
  }, [canvases, activeCanvasId]);

  const activeCanvasLayers = useMemo(() => {
    return activeCanvas?.layers || [];
  }, [activeCanvas]);

  // Initialize database and collaboration
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize database
        await wayangDB.init();
        
        // Load existing canvases from database
        const savedCanvases = await wayangDB.getAllCanvases();
        const loadedCanvases = savedCanvases.map(dataToCanvas);
        setCanvases(loadedCanvases);

        // Initialize collaboration
        const provider = getCollaborationProvider(roomId);
        setCollaborationProvider(provider);
        
        await provider.connect();
        setIsConnected(provider.isConnected());

        // Set up shared state
        const sharedCanvases = provider.getSharedMap('canvases');
        
        // Sync local canvases to shared state
        loadedCanvases.forEach(canvas => {
          if (!sharedCanvases.has(canvas.id)) {
            sharedCanvases.set(canvas.id, canvasToData(canvas));
          }
        });

        // Listen for changes from other tabs
        sharedCanvases.observe(() => {
          const updatedCanvases: Canvas[] = [];
          sharedCanvases.forEach((canvasData: unknown) => {
            if (canvasData && typeof canvasData === 'object') {
              updatedCanvases.push(dataToCanvas(canvasData as CanvasData));
            }
          });
          setCanvases(updatedCanvases);
        });

      } catch (error) {
        console.error('Failed to initialize collaborative canvas:', error);
      }
    };

    init();
  }, [roomId]);

  const syncCanvasToCollaboration = useCallback((canvas: Canvas) => {
    if (collaborationProvider) {
      const sharedCanvases = collaborationProvider.getSharedMap('canvases');
      sharedCanvases.set(canvas.id, canvasToData(canvas));
    }
  }, [collaborationProvider]);

  const syncCanvasToDatabase = useCallback(async (canvas: Canvas) => {
    try {
      await wayangDB.saveCanvas(canvasToData(canvas));
    } catch (error) {
      console.error('Failed to save canvas to database:', error);
    }
  }, []);

  const createCanvas = useCallback((width: number, height: number, bg: BackgroundConfig): Canvas => {
    const newCanvas = new Canvas(width, height, bg);
    
    setCanvases(prev => {
      const updated = [...prev, newCanvas];
      syncCanvasToCollaboration(newCanvas);
      syncCanvasToDatabase(newCanvas);
      return updated;
    });
    
    // Set as active if it's the first canvas
    if (!activeCanvasId) {
      setActiveCanvasId(newCanvas.id);
    }
    
    return newCanvas;
  }, [activeCanvasId, syncCanvasToCollaboration, syncCanvasToDatabase]);

  const createCanvasFromImage = useCallback(async (file: File): Promise<Canvas> => {
    return new Promise((resolve, reject) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        reject(new Error('Invalid file type. Please upload JPG, PNG, GIF, or WebP files.'));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        try {
          const bg: BackgroundConfig = {
            type: 'image',
            imageSrc: objectUrl,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
          };

          const newCanvas = new Canvas(img.naturalWidth, img.naturalHeight, bg);
          
          setCanvases(prev => {
            const updated = [...prev, newCanvas];
            syncCanvasToCollaboration(newCanvas);
            syncCanvasToDatabase(newCanvas);
            return updated;
          });
          
          if (!activeCanvasId) {
            setActiveCanvasId(newCanvas.id);
          }
          
          resolve(newCanvas);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  }, [activeCanvasId, syncCanvasToCollaboration, syncCanvasToDatabase]);

  const deleteCanvas = useCallback((canvasId: string) => {
    setCanvases(prev => {
      const updatedCanvases = prev.filter(canvas => canvas.id !== canvasId);
      
      // Remove from collaboration
      if (collaborationProvider) {
        const sharedCanvases = collaborationProvider.getSharedMap('canvases');
        sharedCanvases.delete(canvasId);
      }
      
      // Remove from database
      wayangDB.deleteCanvas(canvasId).catch(console.error);
      
      if (activeCanvasId === canvasId) {
        if (updatedCanvases.length > 0) {
          setActiveCanvasId(updatedCanvases[0].id);
        } else {
          setActiveCanvasId(null);
        }
      }
      
      return updatedCanvases;
    });
  }, [activeCanvasId, collaborationProvider]);

  const setActiveCanvas = useCallback((canvasId: string) => {
    setActiveCanvasId(canvasId);
  }, []);

  const updateCanvasInState = useCallback((updatedCanvas: Canvas) => {
    setCanvases(prev => {
      const updated = prev.map(canvas => 
        canvas.id === updatedCanvas.id ? updatedCanvas : canvas
      );
      syncCanvasToCollaboration(updatedCanvas);
      syncCanvasToDatabase(updatedCanvas);
      return updated;
    });
  }, [syncCanvasToCollaboration, syncCanvasToDatabase]);

  const addLayerToCanvas = useCallback((canvasId: string, layer: Layer) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id;
        updatedCanvas.layers = [...canvas.layers, layer];
        updatedCanvas.layers.sort((a, b) => a.layerOrder - b.layerOrder);
        updateCanvasInState(updatedCanvas);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, [updateCanvasInState]);

  const removeLayerFromCanvas = useCallback((canvasId: string, layerId: string) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id;
        updatedCanvas.layers = canvas.layers.filter(layer => layer.id !== layerId);
        updateCanvasInState(updatedCanvas);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, [updateCanvasInState]);

  const updateLayer = useCallback((canvasId: string, layerId: string, updates: Partial<Layer>) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id;
        updatedCanvas.layers = canvas.layers.map((layer: Layer) => {
          if (layer.id === layerId) {
            return Object.assign(Object.create(Object.getPrototypeOf(layer)), layer, updates);
          }
          return layer;
        });
        updateCanvasInState(updatedCanvas);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, [updateCanvasInState]);

  const moveLayer = useCallback((canvasId: string, layerId: string, offsetX: number, offsetY: number) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id;
        updatedCanvas.layers = canvas.layers.map((layer: Layer) => {
          if (layer.id === layerId) {
            const movedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
            movedLayer.move(offsetX, offsetY);
            return movedLayer;
          }
          return layer;
        });
        updateCanvasInState(updatedCanvas);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, [updateCanvasInState]);

  const resizeLayer = useCallback((canvasId: string, layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedLayers = canvas.layers.map((layer: Layer) => {
          if (layer.id === layerId) {
            const resizedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
            resizedLayer.resize(newBottomLeft, newTopRight, maintainAspectRatio);
            return resizedLayer;
          }
          return layer;
        });
        
        const updatedCanvas = Object.assign(Object.create(Object.getPrototypeOf(canvas)), canvas);
        updatedCanvas.layers = updatedLayers;
        updateCanvasInState(updatedCanvas);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, [updateCanvasInState]);

  const moveLayerUp = useCallback((canvasId: string, layerId: string) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const layerIndex = canvas.layers.findIndex(layer => layer.id === layerId);
        if (layerIndex === -1 || layerIndex === canvas.layers.length - 1) return canvas;
        
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id;
        updatedCanvas.layers = [...canvas.layers];
        
        [updatedCanvas.layers[layerIndex], updatedCanvas.layers[layerIndex + 1]] = 
        [updatedCanvas.layers[layerIndex + 1], updatedCanvas.layers[layerIndex]];
        
        updateCanvasInState(updatedCanvas);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, [updateCanvasInState]);

  const moveLayerDown = useCallback((canvasId: string, layerId: string) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const layerIndex = canvas.layers.findIndex(layer => layer.id === layerId);
        if (layerIndex === -1 || layerIndex === 0) return canvas;
        
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id;
        updatedCanvas.layers = [...canvas.layers];
        
        [updatedCanvas.layers[layerIndex], updatedCanvas.layers[layerIndex - 1]] = 
        [updatedCanvas.layers[layerIndex - 1], updatedCanvas.layers[layerIndex]];
        
        updateCanvasInState(updatedCanvas);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, [updateCanvasInState]);

  const getTopLayerAt = useCallback((canvasId: string, point: Point): Layer | null => {
    const canvas = canvases.find(c => c.id === canvasId);
    return canvas ? canvas.getTopLayerAt(point) : null;
  }, [canvases]);

  return {
    canvases,
    activeCanvas,
    activeCanvasId,
    activeCanvasLayers,
    isConnected,
    mode,
    createCanvas,
    createCanvasFromImage,
    deleteCanvas,
    setActiveCanvas,
    addLayerToCanvas,
    removeLayerFromCanvas,
    updateLayer,
    moveLayer,
    resizeLayer,
    moveLayerUp,
    moveLayerDown,
    getTopLayerAt,
  };
};
