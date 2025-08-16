import { useState, useCallback, useMemo } from 'react';
import { Canvas, Layer, Point, BackgroundConfig } from '@/types/core';

export interface UseCanvasProps {
  roomId?: string;
}

export interface UseCanvasReturn {
  canvases: Canvas[];
  activeCanvas: Canvas | null;
  activeCanvasId: string | null;
  activeCanvasLayers: Layer[];
  createCanvas: (width: number, height: number, bg: BackgroundConfig) => Canvas;
  createCanvasFromImage: (file: File) => Promise<Canvas>;
  deleteCanvas: (canvasId: string) => void;
  setActiveCanvas: (canvasId: string) => void;
  addLayerToCanvas: (canvasId: string, layer: Layer) => void;
  removeLayerFromCanvas: (canvasId: string, layerId: string) => void;
  updateLayer: (canvasId: string, layerId: string, updates: Partial<Layer>) => void;
  moveLayer: (canvasId: string, layerId: string, offsetX: number, offsetY: number) => void;
  resizeLayer: (canvasId: string, layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => void;
  getTopLayerAt: (canvasId: string, point: Point) => Layer | null;
}

export const useCanvas = ({}: UseCanvasProps = {}): UseCanvasReturn => {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);

  const activeCanvas = useMemo(() => {
    return canvases.find(canvas => canvas.id === activeCanvasId) || null;
  }, [canvases, activeCanvasId]);

  const activeCanvasLayers = useMemo(() => {
    return activeCanvas?.layers || [];
  }, [activeCanvas]);

  const createCanvas = useCallback((width: number, height: number, bg: BackgroundConfig): Canvas => {
    const newCanvas = new Canvas(width, height, bg);
    
    setCanvases(prev => [...prev, newCanvas]);
    
    // Set as active if it's the first canvas
    if (!activeCanvasId) {
      setActiveCanvasId(newCanvas.id);
    }
    
    return newCanvas;
  }, [activeCanvasId]);

  const createCanvasFromImage = useCallback(async (file: File): Promise<Canvas> => {
    return new Promise((resolve, reject) => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        reject(new Error('Invalid file type. Please upload JPG, PNG, GIF, or WebP files.'));
        return;
      }

      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);

      // Load the image to get dimensions
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create background config with image
          const bg: BackgroundConfig = {
            type: 'image',
            imageSrc: objectUrl,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
          };

          // Create canvas with image dimensions
          const newCanvas = new Canvas(img.naturalWidth, img.naturalHeight, bg);
          
          setCanvases(prev => [...prev, newCanvas]);
          
          // Set as active if it's the first canvas
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
  }, [activeCanvasId]);

  const deleteCanvas = useCallback((canvasId: string) => {
    setCanvases(prev => {
      const updatedCanvases = prev.filter(canvas => canvas.id !== canvasId);
      
      // If we're deleting the active canvas, switch to another one or set to null
      if (activeCanvasId === canvasId) {
        if (updatedCanvases.length > 0) {
          // Switch to the first available canvas
          setActiveCanvasId(updatedCanvases[0].id);
        } else {
          // No canvases left
          setActiveCanvasId(null);
        }
      }
      
      return updatedCanvases;
    });
  }, [activeCanvasId]);

  const setActiveCanvas = useCallback((canvasId: string) => {
    setActiveCanvasId(canvasId);
  }, []);

  const addLayerToCanvas = useCallback((canvasId: string, layer: Layer) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        // Create a completely new canvas object with new layers array
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id; // Keep the same ID
        updatedCanvas.layers = [...canvas.layers, layer]; // Create new array with new layer
        updatedCanvas.layers.sort((a, b) => a.layerOrder - b.layerOrder); // Sort layers
        return updatedCanvas;
      }
      return canvas;
    }));
  }, []);

  const removeLayerFromCanvas = useCallback((canvasId: string, layerId: string) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        // Create a completely new canvas object with filtered layers array
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id; // Keep the same ID
        updatedCanvas.layers = canvas.layers.filter(layer => layer.id !== layerId); // Create new filtered array
        return updatedCanvas;
      }
      return canvas;
    }));
  }, []);

  const updateLayer = useCallback((canvasId: string, layerId: string, updates: Partial<Layer>) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        // Create a completely new canvas object with updated layers array
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id; // Keep the same ID
        updatedCanvas.layers = canvas.layers.map((layer: Layer) => {
          if (layer.id === layerId) {
            return Object.assign(Object.create(Object.getPrototypeOf(layer)), layer, updates);
          }
          return layer;
        });
        return updatedCanvas;
      }
      return canvas;
    }));
  }, []);

  const moveLayer = useCallback((canvasId: string, layerId: string, offsetX: number, offsetY: number) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        // Create a completely new canvas object with moved layer
        const updatedCanvas = new Canvas(canvas.width, canvas.height, canvas.bg);
        updatedCanvas.id = canvas.id; // Keep the same ID
        updatedCanvas.layers = canvas.layers.map((layer: Layer) => {
          if (layer.id === layerId) {
            // Create a new layer object with moved position
            const movedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
            movedLayer.move(offsetX, offsetY);
            return movedLayer;
          }
          return layer;
        });
        return updatedCanvas;
      }
      return canvas;
    }));
  }, []);

  const resizeLayer = useCallback((canvasId: string, layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        // Create a new canvas with updated layer - but reuse layer objects when possible
        const updatedLayers = canvas.layers.map((layer: Layer) => {
          if (layer.id === layerId) {
            // Create a new layer object with resized dimensions
            const resizedLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);
            resizedLayer.resize(newBottomLeft, newTopRight, maintainAspectRatio);
            return resizedLayer;
          }
          return layer; // Reuse existing layer objects
        });
        
        // Create new canvas but reuse properties to minimize object creation
        const updatedCanvas = Object.assign(Object.create(Object.getPrototypeOf(canvas)), canvas);
        updatedCanvas.layers = updatedLayers;
        return updatedCanvas;
      }
      return canvas;
    }));
  }, []);

  const getTopLayerAt = useCallback((canvasId: string, point: Point): Layer | null => {
    const canvas = canvases.find(c => c.id === canvasId);
    return canvas ? canvas.getTopLayerAt(point) : null;
  }, [canvases]);

  return {
    canvases,
    activeCanvas,
    activeCanvasId,
    activeCanvasLayers,
    createCanvas,
    createCanvasFromImage,
    deleteCanvas,
    setActiveCanvas,
    addLayerToCanvas,
    removeLayerFromCanvas,
    updateLayer,
    moveLayer,
    resizeLayer,
    getTopLayerAt,
  };
};
