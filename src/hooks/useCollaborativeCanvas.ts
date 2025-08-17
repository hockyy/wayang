import { useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, Layer, Point, BackgroundConfig, ImageLayer } from '@/types/core';
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

// New Yjs-specific canvas metadata (without layers)
function canvasToYjsMetadata(canvas: Canvas) {
  return {
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    background: canvas.bg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Convert layer to Yjs-compatible format (store only src path, no blob URLs)
function layerToYjsData(layer: Layer) {
  const data = {
    id: layer.id,
    type: layer.constructor.name,
    bottomLeft: { x: layer.bottomLeft.x, y: layer.bottomLeft.y },
    topRight: { x: layer.topRight.x, y: layer.topRight.y },
    layerOrder: layer.layerOrder,
    oriWidth: layer.oriWidth,
    oriHeight: layer.oriHeight,
  };

  // For ImageLayer, store only the src path (no blob URLs)
  if (layer instanceof ImageLayer) {
    return {
      ...data,
      srcPath: layer.srcPath,
      mimeType: layer.mimeType,
      isAnimated: layer.isAnimated,
    };
  }

  return data;
}

// Removed dataToCanvas and dataToLayer - no longer needed for local database

// Convert Yjs data back to Layer
function yjsDataToLayer(data: {
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
}): Layer {
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

  // Initialize collaboration only - no local database
  useEffect(() => {
    const init = async () => {
      try {

        // Initialize collaboration
        const provider = getCollaborationProvider(roomId);
        setCollaborationProvider(provider);
        
        await provider.connect();
        setIsConnected(provider.isConnected());

        // Set up shared state using new Yjs structure
        // getMap('canvas') -> maps canvasId to canvas metadata
        const canvasMap = provider.getSharedMap('canvas');
        
        // Load existing canvases from Yjs (no local database)
        const loadedCanvases: Canvas[] = [];
        const canvasLayersMap = provider.getSharedMap('canvas-layers');
        
        canvasMap.forEach((canvasMetadata: unknown, canvasId: string) => {
          if (canvasMetadata && typeof canvasMetadata === 'object') {
            const metadata = canvasMetadata as {
              id: string;
              width: number;
              height: number;
              background: BackgroundConfig;
              createdAt: string;
              updatedAt: string;
            };
            
            // Reconstruct canvas from Yjs metadata
            const canvas = new Canvas(
              metadata.width,
              metadata.height,
              metadata.background
            );
            canvas.id = canvasId;
            
            // Load layers from canvas->layers mapping and individual Yjs arrays
            const layerIds = canvasLayersMap.get(canvasId) as string[] || [];
            const layers: Layer[] = [];
            
            layerIds.forEach(layerId => {
              const layerArray = provider.getSharedArray(layerId);
              if (layerArray.length > 0) {
                const layerYjsData = layerArray.get(0) as {
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
                };
                layers.push(yjsDataToLayer(layerYjsData));
              }
            });
            
            canvas.layers = layers.sort((a, b) => a.layerOrder - b.layerOrder);
            loadedCanvases.push(canvas);
          }
        });
        
        setCanvases(loadedCanvases);

        // Listen for changes to canvas-layers mapping
        canvasLayersMap.observe(() => {
          console.log('Canvas-layers mapping changed, reloading canvases...');
          // Reload all canvases when layer mapping changes
          const updatedCanvases: Canvas[] = [];
          
          canvasMap.forEach((canvasMetadata: unknown, canvasId: string) => {
            if (canvasMetadata && typeof canvasMetadata === 'object') {
              const metadata = canvasMetadata as {
                id: string;
                width: number;
                height: number;
                background: BackgroundConfig;
                createdAt: string;
                updatedAt: string;
              };
              
              const canvas = new Canvas(metadata.width, metadata.height, metadata.background);
              canvas.id = canvasId;
              
              // Load layers from updated mapping
              const layerIds = canvasLayersMap.get(canvasId) as string[] || [];
              const layers: Layer[] = [];
              
              layerIds.forEach(layerId => {
                const layerArray = provider.getSharedArray(layerId);
                if (layerArray.length > 0) {
                  const layerYjsData = layerArray.get(0) as {
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
                  };
                  layers.push(yjsDataToLayer(layerYjsData));
                }
              });
              
              canvas.layers = layers.sort((a, b) => a.layerOrder - b.layerOrder);
              updatedCanvases.push(canvas);
            }
          });
          
          setCanvases(updatedCanvases);
        });

        // Listen for changes from other clients
        canvasMap.observe(() => {
          const updatedCanvases: Canvas[] = [];
          canvasMap.forEach((canvasMetadata: unknown, canvasId: string) => {
            if (canvasMetadata && typeof canvasMetadata === 'object') {
              const metadata = canvasMetadata as {
                id: string;
                width: number;
                height: number;
                background: BackgroundConfig;
                createdAt: string;
                updatedAt: string;
              };
              // Reconstruct canvas from metadata
              const canvas = new Canvas(
                metadata.width,
                metadata.height,
                metadata.background
              );
              canvas.id = canvasId;
              
              // Load layers from individual Yjs arrays
              // We'll need to discover layer IDs from the current canvas state
              const currentCanvas = canvases.find(c => c.id === canvasId);
              const layers: Layer[] = [];
              
              if (currentCanvas) {
                // Load existing layers from Yjs
                currentCanvas.layers.forEach(existingLayer => {
                  const layerArray = provider.getSharedArray(existingLayer.id);
                  if (layerArray.length > 0) {
                    const layerYjsData = layerArray.get(0) as {
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
                    };
                    layers.push(yjsDataToLayer(layerYjsData));
                  }
                });
              }
              
              canvas.layers = layers.sort((a, b) => a.layerOrder - b.layerOrder);
              updatedCanvases.push(canvas);
            }
          });
          setCanvases(updatedCanvases);
        });

      } catch (error) {
        console.error('Failed to initialize collaborative canvas:', error);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // canvases is intentionally excluded to avoid infinite re-initialization

  const syncCanvasToCollaboration = useCallback((canvas: Canvas) => {
    if (collaborationProvider) {
      // Update canvas metadata in the main map
      const canvasMap = collaborationProvider.getSharedMap('canvas');
      canvasMap.set(canvas.id, canvasToYjsMetadata(canvas));
      
      // Update canvas -> layerIds mapping
      const canvasLayersMap = collaborationProvider.getSharedMap('canvas-layers');
      const layerIds = canvas.layers.map(layer => layer.id);
      canvasLayersMap.set(canvas.id, layerIds);
      
      // Update each layer in its individual array
      canvas.layers.forEach(layer => {
        const layerArray = collaborationProvider.getSharedArray(layer.id);
        layerArray.delete(0, layerArray.length); // Clear existing
        layerArray.push([layerToYjsData(layer)]);
      });
    }
  }, [collaborationProvider]);

  // Helper functions to work directly with Yjs layer arrays
  const updateLayerInYjs = useCallback((layerId: string, layer: Layer) => {
    if (collaborationProvider) {
      console.log('updateLayerInYjs', layerId, layer);
      const layerArray = collaborationProvider.getSharedArray(layerId);
      layerArray.delete(0, layerArray.length); // Clear existing
      layerArray.push([layerToYjsData(layer)]);
    }
  }, [collaborationProvider]);

  const removeLayerFromYjs = useCallback((layerId: string) => {
    if (collaborationProvider) {
      const layerArray = collaborationProvider.getSharedArray(layerId);
      layerArray.delete(0, layerArray.length); // Clear the layer array
    }
  }, [collaborationProvider]);

  const addLayerToCanvasInYjs = useCallback((canvasId: string, layerId: string) => {
    if (collaborationProvider) {
      const canvasLayersMap = collaborationProvider.getSharedMap('canvas-layers');
      const currentLayerIds = canvasLayersMap.get(canvasId) as string[] || [];
      canvasLayersMap.set(canvasId, [...currentLayerIds, layerId]);
    }
  }, [collaborationProvider]);

  const removeLayerFromCanvasInYjs = useCallback((canvasId: string, layerId: string) => {
    if (collaborationProvider) {
      const canvasLayersMap = collaborationProvider.getSharedMap('canvas-layers');
      const currentLayerIds = canvasLayersMap.get(canvasId) as string[] || [];
      canvasLayersMap.set(canvasId, currentLayerIds.filter(id => id !== layerId));
    }
  }, [collaborationProvider]);

  // Removed syncCanvasToDatabase - using Yjs persistence only

  const createCanvas = useCallback((width: number, height: number, bg: BackgroundConfig): Canvas => {
    const newCanvas = new Canvas(width, height, bg);
    
    setCanvases(prev => {
      const updated = [...prev, newCanvas];
      syncCanvasToCollaboration(newCanvas);
      return updated;
    });
    
    // Set as active if it's the first canvas
    if (!activeCanvasId) {
      setActiveCanvasId(newCanvas.id);
    }
    
    return newCanvas;
  }, [activeCanvasId, syncCanvasToCollaboration]);

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
  }, [activeCanvasId, syncCanvasToCollaboration]);

  const deleteCanvas = useCallback((canvasId: string) => {
    setCanvases(prev => {
      const canvasToDelete = prev.find(canvas => canvas.id === canvasId);
      const updatedCanvases = prev.filter(canvas => canvas.id !== canvasId);
      
      // Remove from collaboration
      if (collaborationProvider && canvasToDelete) {
        const canvasMap = collaborationProvider.getSharedMap('canvas');
        canvasMap.delete(canvasId);
        
        // Remove all layer arrays for this canvas
        canvasToDelete.layers.forEach(layer => {
          const layerArray = collaborationProvider.getSharedArray(layer.id);
          layerArray.delete(0, layerArray.length);
        });
      }
      
      // No local database to clean up - Yjs handles persistence
      
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

  // Removed updateCanvasInState - now using direct Yjs updates

  const addLayerToCanvas = useCallback((canvasId: string, layer: Layer) => {
    console.log('addLayerToCanvas inside', canvasId, layer);
    
    // Only update Yjs - local state will be updated by observers
    updateLayerInYjs(layer.id, layer);
    addLayerToCanvasInYjs(canvasId, layer.id);
  }, [updateLayerInYjs, addLayerToCanvasInYjs]);

  const removeLayerFromCanvas = useCallback((canvasId: string, layerId: string) => {
    // Only update Yjs - local state will be updated by observers
    removeLayerFromYjs(layerId);
    removeLayerFromCanvasInYjs(canvasId, layerId);
  }, [removeLayerFromYjs, removeLayerFromCanvasInYjs]);

  const updateLayer = useCallback((canvasId: string, layerId: string, updates: Partial<Layer>) => {
    // Only operate on the active canvas
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
    
    // Only update Yjs - local state will be updated by observers
    updateLayerInYjs(layerId, updatedLayer);
  }, [activeCanvas, updateLayerInYjs]);

  const moveLayer = useCallback((canvasId: string, layerId: string, offsetX: number, offsetY: number) => {
    // Only operate on the active canvas
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layer = activeCanvas.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Create moved layer
    const movedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
    movedLayer.move(offsetX, offsetY);
    
    // Only update Yjs - local state will be updated by observers
    updateLayerInYjs(layerId, movedLayer);
  }, [activeCanvas, updateLayerInYjs]);

  const resizeLayer = useCallback((canvasId: string, layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => {
    // Only operate on the active canvas
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layer = activeCanvas.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Create resized layer
    const resizedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
    resizedLayer.resize(newBottomLeft, newTopRight, maintainAspectRatio);
    
    // Only update Yjs - local state will be updated by observers
    updateLayerInYjs(layerId, resizedLayer);
  }, [activeCanvas, updateLayerInYjs]);

  const moveLayerUp = useCallback((canvasId: string, layerId: string) => {
    // Only operate on the active canvas
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layerIndex = activeCanvas.layers.findIndex(layer => layer.id === layerId);
    if (layerIndex === -1 || layerIndex === activeCanvas.layers.length - 1) return;
    
    // Create new layer order
    const newLayerIds = activeCanvas.layers.map(layer => layer.id);
    [newLayerIds[layerIndex], newLayerIds[layerIndex + 1]] = 
    [newLayerIds[layerIndex + 1], newLayerIds[layerIndex]];
    
    // Only update Yjs canvas->layers mapping
    if (collaborationProvider) {
      const canvasLayersMap = collaborationProvider.getSharedMap('canvas-layers');
      canvasLayersMap.set(canvasId, newLayerIds);
    }
  }, [activeCanvas, collaborationProvider]);

  const moveLayerDown = useCallback((canvasId: string, layerId: string) => {
    // Only operate on the active canvas
    if (!activeCanvas || activeCanvas.id !== canvasId) return;
    
    const layerIndex = activeCanvas.layers.findIndex(layer => layer.id === layerId);
    if (layerIndex === -1 || layerIndex === 0) return;
    
    // Create new layer order
    const newLayerIds = activeCanvas.layers.map(layer => layer.id);
    [newLayerIds[layerIndex], newLayerIds[layerIndex - 1]] = 
    [newLayerIds[layerIndex - 1], newLayerIds[layerIndex]];
    
    // Only update Yjs canvas->layers mapping
    if (collaborationProvider) {
      const canvasLayersMap = collaborationProvider.getSharedMap('canvas-layers');
      canvasLayersMap.set(canvasId, newLayerIds);
    }
  }, [activeCanvas, collaborationProvider]);

  const getTopLayerAt = useCallback((canvasId: string, point: Point): Layer | null => {
    // Only operate on the active canvas
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
