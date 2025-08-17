import { useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, Layer, Point, BackgroundConfig, ImageLayer } from '@/types/core';
import { getCollaborationProvider, CollaborationProvider } from '@/lib/collaboration';
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

// Helper functions for the new simplified structure
function canvasToJsonString(canvas: Canvas): string {
  return JSON.stringify({
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    background: canvas.bg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function jsonStringToCanvas(jsonString: string): Canvas {
  const data = JSON.parse(jsonString);
  const canvas = new Canvas(data.width, data.height, data.background);
  canvas.id = data.id;
  return canvas;
}

function layerToJsonString(layer: Layer): string {
  const data = {
    id: layer.id,
    type: layer.constructor.name,
    bottomLeft: { x: layer.bottomLeft.x, y: layer.bottomLeft.y },
    topRight: { x: layer.topRight.x, y: layer.topRight.y },
    layerOrder: layer.layerOrder,
    oriWidth: layer.oriWidth,
    oriHeight: layer.oriHeight,
  };

  if (layer instanceof ImageLayer) {
    return JSON.stringify({
      ...data,
      srcPath: layer.srcPath,
      mimeType: layer.mimeType,
      isAnimated: layer.isAnimated,
    });
  }

  return JSON.stringify(data);
}

function jsonStringToLayer(jsonString: string): Layer {
  const data = JSON.parse(jsonString);
  
  if (data.type === 'ImageLayer') {
    const imageLayer = new ImageLayer(
      new Point(data.bottomLeft.x, data.bottomLeft.y),
      new Point(data.topRight.x, data.topRight.y),
      data.layerOrder,
      data.oriWidth,
      data.oriHeight,
      data.srcPath || '',
      data.mimeType,
      data.isAnimated
    );
    // IMPORTANT: Override the auto-generated ID with the stored ID
    imageLayer.id = data.id;
    return imageLayer;
  }
  
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

  // Initialize collaboration with simplified structure
  useEffect(() => {
    const init = async () => {
      try {
        const provider = getCollaborationProvider(roomId, {
          enableWebSocket: mode === 'online'
        });
        setCollaborationProvider(provider);
        
        await provider.connect();
        setIsConnected(provider.isConnected());

        // Setup simplified structure:
        // - canvasMap: Map<CanvasId, Y.Array> where Y.Array contains Y.Text elements with layer IDs
        // - layerMap: Map<LayerId, Y.Map> where Y.Map contains layer data
        // - canvasMetadata: Map<CanvasId, string> where string is JSON of canvas metadata
        const canvasMap = provider.getSharedMap('canvas');
        const layerMap = provider.getSharedMap('layer');
        const canvasMetadata = provider.getSharedMap('canvasMetadata');
        
        // Load existing canvases
        const loadCanvases = () => {
          console.log('loadCanvases triggered');
          const loadedCanvases: Canvas[] = [];
          
          canvasMap.forEach((canvasData: unknown, canvasId: string) => {
            if (canvasData && typeof canvasData === 'object' && 'toArray' in canvasData) {
              // canvasData is Y.Array containing Y.Text elements with layer IDs
              const layerArray = canvasData as Y.Array<Y.Text>;
              
              // Load canvas from metadata
              let canvas: Canvas;
              const metadataJson = canvasMetadata.get(canvasId) as string;
              if (metadataJson) {
                try {
                  canvas = jsonStringToCanvas(metadataJson);
                } catch (error) {
                  console.error('Failed to parse canvas metadata:', error);
                  canvas = new Canvas(800, 600, { type: 'color', color: '#ffffff' });
                  canvas.id = canvasId;
                }
              } else {
                // Fallback to default values if no metadata
                canvas = new Canvas(800, 600, { type: 'color', color: '#ffffff' });
                canvas.id = canvasId;
              }
              
              const layers: Layer[] = [];
              console.log(`Loading ${layerArray.length} layers for canvas ${canvasId}`);
              layerArray.forEach((layerIdText: Y.Text) => {
                const layerId = layerIdText.toString();
                const layerYMap = layerMap.get(layerId) as Y.Map<unknown>;
                if (layerYMap) {
                  const layerContent = layerYMap.get('content') as string;
                  if (layerContent) {
                    try {
                      const layer = jsonStringToLayer(layerContent);
                      console.log(`Loaded layer ${layerId}, reconstructed layer ID: ${layer.id}`);
                      if (layer.id !== layerId) {
                        console.warn(`Layer ID mismatch! Expected: ${layerId}, Got: ${layer.id}`);
                      }
                      layers.push(layer);
                    } catch (error) {
                      console.error('Failed to parse layer:', error);
                    }
                  } else {
                    console.warn(`No content found for layer ${layerId}`);
                  }
                } else {
                  console.warn(`Layer ${layerId} not found in layerMap`);
                }
              });
              
              canvas.layers = layers.sort((a, b) => a.layerOrder - b.layerOrder);
              console.log(`Canvas ${canvasId} loaded with ${canvas.layers.length} layers`);
              loadedCanvases.push(canvas);
            }
          });
          
          console.log(`Setting ${loadedCanvases.length} canvases to state`);
          setCanvases(loadedCanvases);
        };

        // Initial load
        loadCanvases();

        // Setup observers
        canvasMap.observe((event) => {
          console.log('canvasMap changed:', event);
          loadCanvases();
        });
        layerMap.observe((event) => {
          console.log('layerMap changed:', event);
          loadCanvases();
        });
        canvasMetadata.observe((event) => {
          console.log('canvasMetadata changed:', event);
          loadCanvases();
        });

      } catch (error) {
        console.error('Failed to initialize collaborative canvas:', error);
      }
    };

    init();
  }, [roomId, mode]);

  // Helper functions for the new simplified structure
  const createCanvasInYjs = useCallback((canvas: Canvas) => {
    if (collaborationProvider) {
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      const canvasMetadata = collaborationProvider.getSharedMap('canvasMetadata');
      
      // Create empty layer array for this canvas
      const layerArray = new Y.Array<Y.Text>();
      canvasMap.set(canvas.id, layerArray);
      
      // Store canvas metadata as JSON
      canvasMetadata.set(canvas.id, canvasToJsonString(canvas));
    }
  }, [collaborationProvider]);

  const addLayerToYjs = useCallback((canvasId: string, layer: Layer) => {
    console.log('addLayerToYjs called:', canvasId, layer.id);
    if (collaborationProvider) {
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      const layerMap = collaborationProvider.getSharedMap('layer');
      
      // Add layer to layerMap
      const layerYMap = new Y.Map();
      layerMap.set(layer.id, layerYMap);
      
      const layerJsonString = layerToJsonString(layer);
      console.log('Layer JSON:', layerJsonString);
      layerYMap.set('content', layerJsonString);
      
      // Add layer ID to canvas array
      const layerArray = canvasMap.get(canvasId) as Y.Array<unknown>;
      console.log('Canvas array before adding:', layerArray);
      if (layerArray) {
        const layerIdText = new Y.Text(layer.id);
        layerArray.push([layerIdText]);
        console.log('Canvas array after adding:', layerArray.length, 'items');
      } else {
        console.error('Canvas array not found for canvasId:', canvasId);
      }
    }
  }, [collaborationProvider]);

  const updateLayerInYjs = useCallback((layerId: string, layer: Layer) => {
    console.log('activeCanvasId:', activeCanvasId)
    if (collaborationProvider) {
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      const layerMap = collaborationProvider.getSharedMap('layer');
      
      console.log('canvasMap:', canvasMap);
      if (activeCanvasId) {
        console.log('canvas array:', canvasMap.get(activeCanvasId));
      }
      console.log('layerMap:', layerMap);
      console.log('layerId:', layerId);
      
      const layerYMap = layerMap.get(layerId) as Y.Map<unknown>;
      console.log('layerYMap:', layerYMap);
      
      if (layerYMap) {
        console.log('updating layer:', layer);
        layerYMap.set('content', layerToJsonString(layer));
      } else {
        console.error('Layer not found in layerMap:', layerId);
      }
    }
  }, [collaborationProvider, activeCanvasId]);

  const removeLayerFromYjs = useCallback((canvasId: string, layerId: string) => {
    console.log('removeLayerFromYjs called:', canvasId, layerId);
    if (collaborationProvider) {
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      const layerMap = collaborationProvider.getSharedMap('layer');
      
      // Remove from layerMap
      console.log('Removing layer from layerMap:', layerId);
      const layerExists = layerMap.has(layerId);
      console.log('Layer exists in layerMap:', layerExists);
      layerMap.delete(layerId);
      
      // Remove from canvas array
      const layerArray = canvasMap.get(canvasId) as Y.Array<Y.Text>;
      console.log('Canvas array before removal:', layerArray?.length);
      if (layerArray) {
        let found = false;
        for (let i = 0; i < layerArray.length; i++) {
          const layerIdText = layerArray.get(i);
          console.log(`Checking layer at index ${i}: ${layerIdText.toString()}`);
          if (layerIdText.toString() === layerId) {
            console.log(`Found layer ${layerId} at index ${i}, removing...`);
            layerArray.delete(i, 1);
            found = true;
            break;
          }
        }
        console.log('Layer found and removed:', found);
        console.log('Canvas array after removal:', layerArray.length);
      } else {
        console.error('Canvas array not found for canvasId:', canvasId);
      }
    }
  }, [collaborationProvider]);

  const moveLayerInYjs = useCallback((canvasId: string, layerId: string, direction: 'up' | 'down') => {
    if (collaborationProvider) {
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      const layerArray = canvasMap.get(canvasId) as Y.Array<Y.Text>;
      
      if (layerArray) {
        let currentIndex = -1;
        for (let i = 0; i < layerArray.length; i++) {
          if (layerArray.get(i).toString() === layerId) {
            currentIndex = i;
            break;
          }
        }
        
        if (currentIndex !== -1) {
          const newIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
          if (newIndex >= 0 && newIndex < layerArray.length) {
            const layerIdText = layerArray.get(currentIndex);
            layerArray.delete(currentIndex, 1);
            layerArray.insert(newIndex, [layerIdText]);
          }
        }
      }
    }
  }, [collaborationProvider]);

  const createCanvas = useCallback((width: number, height: number, bg: BackgroundConfig): Canvas => {
    const newCanvas = new Canvas(width, height, bg);
    createCanvasInYjs(newCanvas);
    
    // Set as active if it's the first canvas
    if (!activeCanvasId) {
      setActiveCanvasId(newCanvas.id);
    }
    
    return newCanvas;
  }, [activeCanvasId, createCanvasInYjs]);

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
          createCanvasInYjs(newCanvas);
          
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
  }, [activeCanvasId, createCanvasInYjs]);

  const deleteCanvas = useCallback((canvasId: string) => {
    if (collaborationProvider) {
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      const layerMap = collaborationProvider.getSharedMap('layer');
      const canvasMetadata = collaborationProvider.getSharedMap('canvasMetadata');
      
      // Get the canvas to find all its layers
      const layerArray = canvasMap.get(canvasId) as Y.Array<Y.Text>;
      if (layerArray) {
        // Remove all layers from layerMap
        layerArray.forEach((layerIdText: Y.Text) => {
          layerMap.delete(layerIdText.toString());
        });
      }
      
      // Remove canvas from canvasMap and metadata
      canvasMap.delete(canvasId);
      canvasMetadata.delete(canvasId);
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
  }, [activeCanvasId, collaborationProvider, canvases]);

  const setActiveCanvas = useCallback((canvasId: string) => {
    console.log('setActiveCanvas', canvasId);
    setActiveCanvasId(canvasId);
  }, []);

  const addLayerToCanvas = useCallback((canvasId: string, layer: Layer) => {
    console.log('addLayerToCanvas called:', canvasId, layer.id);
    addLayerToYjs(canvasId, layer);
  }, [addLayerToYjs]);

  const removeLayerFromCanvas = useCallback((canvasId: string, layerId: string) => {
    console.log('removeLayerFromCanvas called:', canvasId, layerId);
    
    // Debug: Show what's in React state
    const currentCanvas = canvases.find(c => c.id === canvasId);
    if (currentCanvas) {
      console.log('React state canvas layers:', currentCanvas.layers.map(l => ({ id: l.id, type: l.constructor.name })));
      const layerInState = currentCanvas.layers.find(l => l.id === layerId);
      console.log('Layer exists in React state:', !!layerInState);
    }
    
    // Debug: Show what's in Yjs
    if (collaborationProvider) {
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      const layerMap = collaborationProvider.getSharedMap('layer');
      const layerArray = canvasMap.get(canvasId) as Y.Array<Y.Text>;
      
      if (layerArray) {
        console.log('Yjs canvas array layers:', Array.from({ length: layerArray.length }, (_, i) => layerArray.get(i).toString()));
      }
      console.log('Layer exists in Yjs layerMap:', layerMap.has(layerId));
    }
    
    removeLayerFromYjs(canvasId, layerId);
  }, [removeLayerFromYjs, canvases, collaborationProvider]);

  const updateLayer = useCallback((canvasId: string, layerId: string, updates: Partial<Layer>) => {
    if (!activeCanvas || activeCanvas.id !== canvasId) {
      return;
    }
    
    const layer = activeCanvas.layers.find(l => l.id === layerId);
    if (!layer) {
      return;
    }
    
    // Create updated layer by cloning and applying updates
    const updatedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
    
    // Apply updates explicitly to handle Point objects correctly
    if (updates.bottomLeft) {
      updatedLayer.bottomLeft = new Point(updates.bottomLeft.x, updates.bottomLeft.y);
    }
    if (updates.topRight) {
      updatedLayer.topRight = new Point(updates.topRight.x, updates.topRight.y);
    }
    
    // Apply other updates
    Object.keys(updates).forEach(key => {
      if (key !== 'bottomLeft' && key !== 'topRight') {
        (updatedLayer as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
      }
    });
    
    updateLayerInYjs(layerId, updatedLayer);
  }, [activeCanvas, updateLayerInYjs]);

  const moveLayer = useCallback((canvasId: string, layerId: string, offsetX: number, offsetY: number) => {
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layer = activeCanvas.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Create moved layer
    const movedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
    movedLayer.move(offsetX, offsetY);
    
    updateLayerInYjs(layerId, movedLayer);
  }, [activeCanvas, updateLayerInYjs]);

  const resizeLayer = useCallback((canvasId: string, layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => {
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layer = activeCanvas.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Create resized layer
    const resizedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
    resizedLayer.resize(newBottomLeft, newTopRight, maintainAspectRatio);
    
    updateLayerInYjs(layerId, resizedLayer);
  }, [activeCanvas, updateLayerInYjs]);

  const moveLayerUp = useCallback((canvasId: string, layerId: string) => {
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layerIndex = activeCanvas.layers.findIndex(layer => layer.id === layerId);
    if (layerIndex === -1 || layerIndex === activeCanvas.layers.length - 1) return;
    
    moveLayerInYjs(canvasId, layerId, 'up');
  }, [activeCanvas, moveLayerInYjs]);

  const moveLayerDown = useCallback((canvasId: string, layerId: string) => {
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layerIndex = activeCanvas.layers.findIndex(layer => layer.id === layerId);
    if (layerIndex === -1 || layerIndex === 0) return;
    
    moveLayerInYjs(canvasId, layerId, 'down');
  }, [activeCanvas, moveLayerInYjs]);

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

