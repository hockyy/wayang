import { useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, Layer, Point, BackgroundConfig, ImageLayer } from '@/types/core';
import { getCollaborationProvider } from '@/lib/collaboration';
import * as Y from 'yjs';

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

// Helper functions to convert between Layer/Canvas objects and Yjs data
function layerToObject(layer: Layer): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    id: layer.id,
    type: layer.constructor.name,
    bottomLeftX: layer.bottomLeft.x,
    bottomLeftY: layer.bottomLeft.y,
    topRightX: layer.topRight.x,
    topRightY: layer.topRight.y,
    layerOrder: layer.layerOrder,
    oriWidth: layer.oriWidth,
    oriHeight: layer.oriHeight,
  };

  if (layer instanceof ImageLayer) {
    obj.srcPath = layer.srcPath;
    obj.mimeType = layer.mimeType || '';
    obj.isAnimated = layer.isAnimated;
  }

  return obj;
}

function objectToLayer(obj: Record<string, unknown>): Layer {
  const type = obj.type as string;
  const id = obj.id as string;
  const bottomLeft = new Point(
    obj.bottomLeftX as number,
    obj.bottomLeftY as number
  );
  const topRight = new Point(
    obj.topRightX as number,
    obj.topRightY as number
  );
  const layerOrder = obj.layerOrder as number;
  const oriWidth = obj.oriWidth as number;
  const oriHeight = obj.oriHeight as number;

  let layer: Layer;
  if (type === 'ImageLayer') {
    const srcPath = obj.srcPath as string;
    const mimeType = obj.mimeType as string;
    const isAnimated = obj.isAnimated as boolean;
    layer = new ImageLayer(bottomLeft, topRight, layerOrder, oriWidth, oriHeight, srcPath, mimeType, isAnimated);
  } else {
    layer = new Layer(bottomLeft, topRight, layerOrder, oriWidth, oriHeight);
  }

  // Override the auto-generated ID with the stored ID
  layer.id = id;
  return layer;
}

function canvasToObject(canvas: Canvas): Record<string, unknown> {
  return {
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    bgType: canvas.bg.type,
    bgColor: canvas.bg.color || '',
    bgImageSrc: canvas.bg.imageSrc || '',
    bgImageWidth: canvas.bg.imageWidth || 0,
    bgImageHeight: canvas.bg.imageHeight || 0,
  };
}

function objectToCanvas(obj: Record<string, unknown>): Canvas {
  if (!obj) return new Canvas(0, 0, { type: 'color', color: '#000000' });
  
  const id = obj.id as string;
  const width = obj.width as number;
  const height = obj.height as number;
  const bgType = obj.bgType as 'color' | 'image';
  
  const bg: BackgroundConfig = {
    type: bgType,
    color: (obj.bgColor as string) || undefined,
    imageSrc: (obj.bgImageSrc as string) || undefined,
    imageWidth: (obj.bgImageWidth as number) || undefined,
    imageHeight: (obj.bgImageHeight as number) || undefined,
  };

  const canvas = new Canvas(width, height, bg);
  canvas.id = id;
  
  return canvas;
}

export const useCollaborativeCanvas = ({ roomId, mode = 'local' }: UseCollaborativeCanvasProps): UseCollaborativeCanvasReturn => {
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Initialize Y.Doc and shared data structures with new three-map approach
  const [collaborationState] = useState(() => {
    const provider = getCollaborationProvider(roomId, {
      enableWebSocket: mode === 'online'
    });
    
    // Three separate maps for normalized data structure
    const canvasMap = provider.getSharedMap('canvas2') as Y.Map<Record<string, unknown>>;
    const canvasLayersMap = provider.getSharedMap('canvasLayers') as Y.Map<Y.Array<string>>;
    const layersMap = provider.getSharedMap('layers') as Y.Map<Record<string, unknown>>;
    
    return { provider, canvasMap, canvasLayersMap, layersMap };
  });

  // Create observers for each map to trigger re-renders
  const [canvasData, setCanvasData] = useState<Record<string, Record<string, unknown>>>({});
  const [canvasLayersData, setCanvasLayersData] = useState<Record<string, string[]>>({});
  const [layersData, setLayersData] = useState<Record<string, Record<string, unknown>>>({});

  // Set up observers for the three maps
  useEffect(() => {
    const { canvasMap, canvasLayersMap, layersMap } = collaborationState;

    // Observer for canvas map
    const updateCanvasData = () => {
      const data: Record<string, Record<string, unknown>> = {};
      canvasMap.forEach((value, key) => {
        data[key] = value;
      });
      setCanvasData(data);
    };

    // Observer for canvas-layers map
    const updateCanvasLayersData = () => {
      const data: Record<string, string[]> = {};
      canvasLayersMap.forEach((yArray, canvasId) => {
        data[canvasId] = yArray.toArray();
      });
      setCanvasLayersData(data);
    };

    // Observer for layers map
    const updateLayersData = () => {
      const data: Record<string, Record<string, unknown>> = {};
      layersMap.forEach((value, key) => {
        data[key] = value;
      });
      setLayersData(data);
    };

    // Initial load
    updateCanvasData();
    updateCanvasLayersData();
    updateLayersData();

    // Set up observers
    canvasMap.observe(updateCanvasData);
    canvasLayersMap.observe(updateCanvasLayersData);
    layersMap.observe(updateLayersData);

    // Also observe changes to individual Y.Arrays in canvasLayersMap
    const layerArrayObservers = new Map<string, () => void>();
    const observeCanvasLayers = () => {
      canvasLayersMap.forEach((yArray, canvasId) => {
        if (!layerArrayObservers.has(canvasId)) {
          const observer = () => updateCanvasLayersData();
          yArray.observe(observer);
          layerArrayObservers.set(canvasId, observer);
        }
      });
    };

    observeCanvasLayers();
    canvasLayersMap.observe(observeCanvasLayers);

    return () => {
      canvasMap.unobserve(updateCanvasData);
      canvasLayersMap.unobserve(updateCanvasLayersData);
      layersMap.unobserve(updateLayersData);
      canvasLayersMap.unobserve(observeCanvasLayers);
      
      // Unobserve all layer arrays
      layerArrayObservers.forEach((observer, canvasId) => {
        const yArray = canvasLayersMap.get(canvasId);
        if (yArray) {
          yArray.unobserve(observer);
        }
      });
    };
  }, [collaborationState]);

  // Initialize collaboration provider
  useEffect(() => {
    const init = async () => {
      try {
        const provider = getCollaborationProvider(roomId, {
          enableWebSocket: mode === 'online'
        });
        
        // Connect and wait for initialization
        await provider.connect();
        setIsConnected(provider.isConnected());
        
        // Set up connection status updates
        if (mode === 'online') {
          const checkConnection = () => setIsConnected(provider.isConnected());
          const interval = setInterval(checkConnection, 1000);
          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to initialize collaborative canvas:', error);
        setIsConnected(false);
      }
    };

    const cleanup = init();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [roomId, mode]);

  // Convert Yjs data to Canvas objects using the new normalized structure
  const canvases = useMemo(() => {
    const canvasList: Canvas[] = [];
    
    // Iterate through all canvases
    for (const [canvasId, canvasObj] of Object.entries(canvasData)) {
      // Create canvas from base data
      const canvas = objectToCanvas(canvasObj);
      
      // Get layer IDs for this canvas
      const layerIds = canvasLayersData[canvasId] || [];
      
      // Build layers array from layer data
      canvas.layers = layerIds
        .map(layerId => layersData[layerId])
        .filter(Boolean)
        .map(layerObj => objectToLayer(layerObj))
        .sort((a, b) => a.layerOrder - b.layerOrder);
        
      canvasList.push(canvas);
    }
    return canvasList.sort((a, b) => {
      const idA = a?.id ?? '';
      const idB = b?.id ?? '';
      return idA.localeCompare(idB);
    });
  }, [canvasData, canvasLayersData, layersData]);

  const activeCanvas = useMemo(() => {
    return canvases.find(canvas => canvas.id === activeCanvasId) || null;
  }, [canvases, activeCanvasId]);

  const activeCanvasLayers = useMemo(() => {
    return activeCanvas?.layers || [];
  }, [activeCanvas]);

  const createCanvas = useCallback((width: number, height: number, bg: BackgroundConfig): Canvas => {
    const newCanvas = new Canvas(width, height, bg);
    const { canvasMap, canvasLayersMap } = collaborationState;
    
    // Store canvas data in canvas map
    canvasMap.set(newCanvas.id, canvasToObject(newCanvas));
    
    // Initialize empty layer array for this canvas
    const layerArray = new Y.Array<string>();
    canvasLayersMap.set(newCanvas.id, layerArray);
    
    // Set as active if it's the first canvas
    if (!activeCanvasId) {
      setActiveCanvasId(newCanvas.id);
    }
    
    return newCanvas;
  }, [activeCanvasId, collaborationState]);

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
          const { canvasMap, canvasLayersMap } = collaborationState;
          
          // Store canvas data in canvas map
          canvasMap.set(newCanvas.id, canvasToObject(newCanvas));
          
          // Initialize empty layer array for this canvas
          const layerArray = new Y.Array<string>();
          canvasLayersMap.set(newCanvas.id, layerArray);
          
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
  }, [activeCanvasId, collaborationState]);

  const deleteCanvas = useCallback((canvasId: string) => {
    const { canvasMap, canvasLayersMap, layersMap } = collaborationState;
    
    // Get layer IDs for this canvas before deletion
    const layerIds = canvasLayersData[canvasId] || [];
    
    // Remove all layers belonging to this canvas
    layerIds.forEach(layerId => {
      layersMap.delete(layerId);
    });
    
    // Remove canvas-layers mapping
    canvasLayersMap.delete(canvasId);
    
    // Remove canvas itself
    canvasMap.delete(canvasId);
    
    // Update active canvas if needed
    if (activeCanvasId === canvasId) {
      const remainingCanvases = canvases.filter(canvas => canvas.id !== canvasId);
      if (remainingCanvases.length > 0) {
        setActiveCanvasId(remainingCanvases[0].id);
      } else {
        setActiveCanvasId(null);
      }
    }
  }, [activeCanvasId, canvases, collaborationState, canvasLayersData]);

  const setActiveCanvas = useCallback((canvasId: string) => {
    setActiveCanvasId(canvasId);
  }, []);



  const addLayerToCanvas = useCallback((canvasId: string, layer: Layer) => {
    const { canvasLayersMap, layersMap } = collaborationState;
    
    // Check if canvas exists
    if (!canvasLayersMap.has(canvasId)) return;
    
    // Store layer data
    layersMap.set(layer.id, layerToObject(layer));
    
    // Add layer ID to canvas layers array
    const layerArray = canvasLayersMap.get(canvasId);
    if (layerArray) {
      layerArray.push([layer.id]);
    }
  }, [collaborationState]);

  const removeLayerFromCanvas = useCallback((canvasId: string, layerId: string) => {
    const { canvasLayersMap, layersMap } = collaborationState;
    
    // Remove layer data
    layersMap.delete(layerId);
    
    // Remove layer ID from canvas layers array
    const layerArray = canvasLayersMap.get(canvasId);
    if (layerArray) {
      const layerIds = layerArray.toArray();
      const layerIndex = layerIds.indexOf(layerId);
      if (layerIndex !== -1) {
        layerArray.delete(layerIndex, 1);
      }
    }
  }, [collaborationState]);

  const updateLayer = useCallback((canvasId: string, layerId: string, updates: Partial<Layer>) => {
    const { layersMap } = collaborationState;
    
    // Get current layer data
    const currentLayerData = layersMap.get(layerId);
    if (!currentLayerData) return;
    
    // Create updated layer object
    const updatedData = { ...currentLayerData };
    
    if (updates.bottomLeft) {
      updatedData.bottomLeftX = updates.bottomLeft.x;
      updatedData.bottomLeftY = updates.bottomLeft.y;
    }
    if (updates.topRight) {
      updatedData.topRightX = updates.topRight.x;
      updatedData.topRightY = updates.topRight.y;
    }
    if (updates.layerOrder !== undefined) {
      updatedData.layerOrder = updates.layerOrder;
    }
    
    // Update layer data
    layersMap.set(layerId, updatedData);
  }, [collaborationState]);

  const moveLayer = useCallback((canvasId: string, layerId: string, offsetX: number, offsetY: number) => {
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layer = activeCanvas.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    const newBottomLeft = new Point(layer.bottomLeft.x + offsetX, layer.bottomLeft.y + offsetY);
    const newTopRight = new Point(layer.topRight.x + offsetX, layer.topRight.y + offsetY);
    
    updateLayer(canvasId, layerId, {
      bottomLeft: newBottomLeft,
      topRight: newTopRight,
    });
  }, [activeCanvas, updateLayer]);

  const resizeLayer = useCallback((canvasId: string, layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => {
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layer = activeCanvas.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Apply aspect ratio logic if needed
    if (maintainAspectRatio) {
      const originalAspectRatio = layer.oriWidth / layer.oriHeight;
      const newWidth = Math.abs(newTopRight.x - newBottomLeft.x);
      const newHeight = Math.abs(newTopRight.y - newBottomLeft.y);
      const newAspectRatio = newWidth / newHeight;
      
      if (newAspectRatio > originalAspectRatio) {
        const adjustedWidth = newHeight * originalAspectRatio;
        if (newBottomLeft.x < newTopRight.x) {
          newTopRight.x = newBottomLeft.x + adjustedWidth;
        } else {
          newBottomLeft.x = newTopRight.x + adjustedWidth;
        }
      } else if (newAspectRatio < originalAspectRatio) {
        const adjustedHeight = newWidth / originalAspectRatio;
        if (newBottomLeft.y < newTopRight.y) {
          newTopRight.y = newBottomLeft.y + adjustedHeight;
        } else {
          newBottomLeft.y = newTopRight.y + adjustedHeight;
        }
      }
    }
    
    updateLayer(canvasId, layerId, {
      bottomLeft: newBottomLeft,
      topRight: newTopRight,
    });
  }, [activeCanvas, updateLayer]);

  const moveLayerUp = useCallback((canvasId: string, layerId: string) => {
    const { canvasLayersMap } = collaborationState;
    
    const layerArray = canvasLayersMap.get(canvasId);
    if (!layerArray) return;
    
    const layerIds = layerArray.toArray();
    const layerIndex = layerIds.indexOf(layerId);
    
    if (layerIndex !== -1 && layerIndex < layerIds.length - 1) {
      // Remove and re-insert at higher position
      layerArray.delete(layerIndex, 1);
      layerArray.insert(layerIndex + 1, [layerId]);
    }
  }, [collaborationState]);

  const moveLayerDown = useCallback((canvasId: string, layerId: string) => {
    const { canvasLayersMap } = collaborationState;
    
    const layerArray = canvasLayersMap.get(canvasId);
    if (!layerArray) return;
    
    const layerIds = layerArray.toArray();
    const layerIndex = layerIds.indexOf(layerId);
    
    if (layerIndex > 0) {
      // Remove and re-insert at lower position
      layerArray.delete(layerIndex, 1);
      layerArray.insert(layerIndex - 1, [layerId]);
    }
  }, [collaborationState]);

  const getTopLayerAt = useCallback((canvasId: string, point: Point): Layer | null => {
    if (!activeCanvas || activeCanvas.id !== canvasId) return null;
    
    return activeCanvas.getTopLayerAt(point);
  }, [activeCanvas]);

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