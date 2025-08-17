import { useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, Layer, Point, BackgroundConfig, ImageLayer } from '@/types/core';
import { getCollaborationProvider } from '@/lib/collaboration';
import { useYDeepArray } from './useYHooks';
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

// Helper functions to convert between Layer/Canvas objects and Y.Map
function layerToYMap(layer: Layer): Y.Map<unknown> {
  const yLayer = new Y.Map();
  yLayer.set('id', layer.id);
  yLayer.set('type', layer.constructor.name);
  yLayer.set('bottomLeftX', layer.bottomLeft.x);
  yLayer.set('bottomLeftY', layer.bottomLeft.y);
  yLayer.set('topRightX', layer.topRight.x);
  yLayer.set('topRightY', layer.topRight.y);
  yLayer.set('layerOrder', layer.layerOrder);
  yLayer.set('oriWidth', layer.oriWidth);
  yLayer.set('oriHeight', layer.oriHeight);

  if (layer instanceof ImageLayer) {
    yLayer.set('srcPath', layer.srcPath);
    yLayer.set('mimeType', layer.mimeType || '');
    yLayer.set('isAnimated', layer.isAnimated);
  }

  return yLayer;
}

function yMapToLayer(yLayer: Y.Map<unknown>): Layer {
  const type = yLayer.get('type') as string;
  const id = yLayer.get('id') as string;
  const bottomLeft = new Point(
    yLayer.get('bottomLeftX') as number,
    yLayer.get('bottomLeftY') as number
  );
  const topRight = new Point(
    yLayer.get('topRightX') as number,
    yLayer.get('topRightY') as number
  );
  const layerOrder = yLayer.get('layerOrder') as number;
  const oriWidth = yLayer.get('oriWidth') as number;
  const oriHeight = yLayer.get('oriHeight') as number;

  let layer: Layer;
  if (type === 'ImageLayer') {
    const srcPath = yLayer.get('srcPath') as string;
    const mimeType = yLayer.get('mimeType') as string;
    const isAnimated = yLayer.get('isAnimated') as boolean;
    layer = new ImageLayer(bottomLeft, topRight, layerOrder, oriWidth, oriHeight, srcPath, mimeType, isAnimated);
  } else {
    layer = new Layer(bottomLeft, topRight, layerOrder, oriWidth, oriHeight);
  }

  // Override the auto-generated ID with the stored ID
  layer.id = id;
  return layer;
}

function canvasToYMap(canvas: Canvas): Y.Map<unknown> {
  const yCanvas = new Y.Map();
  yCanvas.set('id', canvas.id);
  yCanvas.set('width', canvas.width);
  yCanvas.set('height', canvas.height);
  yCanvas.set('bgType', canvas.bg.type);
  yCanvas.set('bgColor', canvas.bg.color || '');
  yCanvas.set('bgImageSrc', canvas.bg.imageSrc || '');
  yCanvas.set('bgImageWidth', canvas.bg.imageWidth || 0);
  yCanvas.set('bgImageHeight', canvas.bg.imageHeight || 0);
  
  // Create layers array
  const yLayers = new Y.Array<Y.Map<unknown>>();
  canvas.layers.forEach(layer => {
    yLayers.push([layerToYMap(layer)]);
  });
  yCanvas.set('layers', yLayers);
  
  return yCanvas;
}

function yMapToCanvas(yCanvas: Y.Map<unknown>): Canvas {
  const id = yCanvas.get('id') as string;
  const width = yCanvas.get('width') as number;
  const height = yCanvas.get('height') as number;
  const bgType = yCanvas.get('bgType') as 'color' | 'image';
  
  const bg: BackgroundConfig = {
    type: bgType,
    color: yCanvas.get('bgColor') as string || undefined,
    imageSrc: yCanvas.get('bgImageSrc') as string || undefined,
    imageWidth: yCanvas.get('bgImageWidth') as number || undefined,
    imageHeight: yCanvas.get('bgImageHeight') as number || undefined,
  };

  const canvas = new Canvas(width, height, bg);
  canvas.id = id;

  // Convert layers
  const yLayers = yCanvas.get('layers') as Y.Array<Y.Map<unknown>>;
  if (yLayers) {
    const layers = yLayers.toArray().map(yLayer => yMapToLayer(yLayer));
    canvas.layers = layers.sort((a, b) => a.layerOrder - b.layerOrder);
  }

  return canvas;
}

export const useCollaborativeCanvas = ({ roomId, mode = 'local' }: UseCollaborativeCanvasProps): UseCollaborativeCanvasReturn => {
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Initialize Y.Doc and shared data structures
  const [collaborationState] = useState(() => {
    const provider = getCollaborationProvider(roomId, {
      enableWebSocket: mode === 'online'
    });
    const yCanvases = provider.getSharedArray('canvases') as Y.Array<Y.Map<unknown>>;
    
    // Cache initial snapshot to provide stable server snapshot
    const initialSnapshot = yCanvases.toJSON();
    
    return { provider, yCanvases, initialSnapshot };
  });

  // Use custom Y.js hooks to automatically trigger re-renders when Yjs data changes
  // This will observe deep changes in canvases and their nested layers
  const canvasesData = useYDeepArray(collaborationState.yCanvases);

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

  // Convert Yjs data to Canvas objects
  const canvases = useMemo(() => {
    // canvasesData now contains the actual Y.Map objects from useYArray
    return canvasesData.map(yCanvas => yMapToCanvas(yCanvas));
  }, [canvasesData]);

  const activeCanvas = useMemo(() => {
    return canvases.find(canvas => canvas.id === activeCanvasId) || null;
  }, [canvases, activeCanvasId]);

  const activeCanvasLayers = useMemo(() => {
    return activeCanvas?.layers || [];
  }, [activeCanvas]);

  const createCanvas = useCallback((width: number, height: number, bg: BackgroundConfig): Canvas => {
    const newCanvas = new Canvas(width, height, bg);
    const yCanvas = canvasToYMap(newCanvas);
    collaborationState.yCanvases.push([yCanvas]);
    
    // Set as active if it's the first canvas
    if (!activeCanvasId) {
      setActiveCanvasId(newCanvas.id);
    }
    
    return newCanvas;
  }, [activeCanvasId, collaborationState.yCanvases]);

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
          const yCanvas = canvasToYMap(newCanvas);
          collaborationState.yCanvases.push([yCanvas]);
          
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
  }, [activeCanvasId, collaborationState.yCanvases]);

  const deleteCanvas = useCallback((canvasId: string) => {
    // Find and remove the canvas
    for (let i = 0; i < collaborationState.yCanvases.length; i++) {
      const yCanvas = collaborationState.yCanvases.get(i);
      if (yCanvas.get('id') === canvasId) {
        collaborationState.yCanvases.delete(i, 1);
        break;
      }
    }
    
    // Update active canvas if needed
    if (activeCanvasId === canvasId) {
      const remainingCanvases = canvases.filter(canvas => canvas.id !== canvasId);
      if (remainingCanvases.length > 0) {
        setActiveCanvasId(remainingCanvases[0].id);
      } else {
        setActiveCanvasId(null);
      }
    }
  }, [activeCanvasId, canvases, collaborationState.yCanvases]);

  const setActiveCanvas = useCallback((canvasId: string) => {
    setActiveCanvasId(canvasId);
  }, []);

  const findCanvasIndex = useCallback((canvasId: string): number => {
    for (let i = 0; i < collaborationState.yCanvases.length; i++) {
      const yCanvas = collaborationState.yCanvases.get(i);
      if (yCanvas.get('id') === canvasId) {
        return i;
      }
    }
    return -1;
  }, [collaborationState.yCanvases]);

  const addLayerToCanvas = useCallback((canvasId: string, layer: Layer) => {
    const canvasIndex = findCanvasIndex(canvasId);
    if (canvasIndex === -1) return;

    const yCanvas = collaborationState.yCanvases.get(canvasIndex);
    const yLayers = yCanvas.get('layers') as Y.Array<Y.Map<unknown>>;
    const yLayer = layerToYMap(layer);
    yLayers.push([yLayer]);
  }, [findCanvasIndex, collaborationState.yCanvases]);

  const removeLayerFromCanvas = useCallback((canvasId: string, layerId: string) => {
    const canvasIndex = findCanvasIndex(canvasId);
    if (canvasIndex === -1) return;

    const yCanvas = collaborationState.yCanvases.get(canvasIndex);
    const yLayers = yCanvas.get('layers') as Y.Array<Y.Map<unknown>>;
    
    for (let i = 0; i < yLayers.length; i++) {
      const yLayer = yLayers.get(i);
      if (yLayer.get('id') === layerId) {
        yLayers.delete(i, 1);
        break;
      }
    }
  }, [findCanvasIndex, collaborationState.yCanvases]);

  const updateLayer = useCallback((canvasId: string, layerId: string, updates: Partial<Layer>) => {
    const canvasIndex = findCanvasIndex(canvasId);
    if (canvasIndex === -1) return;

    const yCanvas = collaborationState.yCanvases.get(canvasIndex);
    const yLayers = yCanvas.get('layers') as Y.Array<Y.Map<unknown>>;
    
    for (let i = 0; i < yLayers.length; i++) {
      const yLayer = yLayers.get(i);
      if (yLayer.get('id') === layerId) {
        // Apply updates to the Y.Map
        if (updates.bottomLeft) {
          yLayer.set('bottomLeftX', updates.bottomLeft.x);
          yLayer.set('bottomLeftY', updates.bottomLeft.y);
        }
        if (updates.topRight) {
          yLayer.set('topRightX', updates.topRight.x);
          yLayer.set('topRightY', updates.topRight.y);
        }
        if (updates.layerOrder !== undefined) {
          yLayer.set('layerOrder', updates.layerOrder);
        }
        // Add other updates as needed
        break;
      }
    }
  }, [findCanvasIndex, collaborationState.yCanvases]);

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
    const canvasIndex = findCanvasIndex(canvasId);
    if (canvasIndex === -1) return;

    const yCanvas = collaborationState.yCanvases.get(canvasIndex);
    const yLayers = yCanvas.get('layers') as Y.Array<Y.Map<unknown>>;
    
    let layerIndex = -1;
    for (let i = 0; i < yLayers.length; i++) {
      if (yLayers.get(i).get('id') === layerId) {
        layerIndex = i;
        break;
      }
    }
    
    if (layerIndex !== -1 && layerIndex < yLayers.length - 1) {
      const yLayer = yLayers.get(layerIndex);
      yLayers.delete(layerIndex, 1);
      yLayers.insert(layerIndex + 1, [yLayer]);
    }
  }, [findCanvasIndex, collaborationState.yCanvases]);

  const moveLayerDown = useCallback((canvasId: string, layerId: string) => {
    const canvasIndex = findCanvasIndex(canvasId);
    if (canvasIndex === -1) return;

    const yCanvas = collaborationState.yCanvases.get(canvasIndex);
    const yLayers = yCanvas.get('layers') as Y.Array<Y.Map<unknown>>;
    
    let layerIndex = -1;
    for (let i = 0; i < yLayers.length; i++) {
      if (yLayers.get(i).get('id') === layerId) {
        layerIndex = i;
        break;
      }
    }
    
    if (layerIndex > 0) {
      const yLayer = yLayers.get(layerIndex);
      yLayers.delete(layerIndex, 1);
      yLayers.insert(layerIndex - 1, [yLayer]);
    }
  }, [findCanvasIndex, collaborationState.yCanvases]);

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