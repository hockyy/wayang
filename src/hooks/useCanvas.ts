import { useState, useCallback, useMemo } from 'react';
import { Canvas, Layer, ImageLayer, Point, BackgroundConfig } from '@/types/core';

export interface UseCanvasProps {
  roomId?: string;
}

export interface UseCanvasReturn {
  canvases: Canvas[];
  activeCanvas: Canvas | null;
  activeCanvasId: string | null;
  createCanvas: (width: number, height: number, bg: BackgroundConfig) => Canvas;
  setActiveCanvas: (canvasId: string) => void;
  addLayerToCanvas: (canvasId: string, layer: Layer) => void;
  removeLayerFromCanvas: (canvasId: string, layerId: string) => void;
  updateLayer: (canvasId: string, layerId: string, updates: Partial<Layer>) => void;
  moveLayer: (canvasId: string, layerId: string, offsetX: number, offsetY: number) => void;
  getTopLayerAt: (canvasId: string, point: Point) => Layer | null;
}

export const useCanvas = ({ roomId }: UseCanvasProps = {}): UseCanvasReturn => {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);

  const activeCanvas = useMemo(() => {
    return canvases.find(canvas => canvas.id === activeCanvasId) || null;
  }, [canvases, activeCanvasId]);

  const createCanvas = useCallback((width: number, height: number, bg: BackgroundConfig): Canvas => {
    const newCanvas = new Canvas(width, height, bg);
    
    setCanvases(prev => [...prev, newCanvas]);
    
    // Set as active if it's the first canvas
    if (!activeCanvasId) {
      setActiveCanvasId(newCanvas.id);
    }
    
    return newCanvas;
  }, [activeCanvasId]);

  const setActiveCanvas = useCallback((canvasId: string) => {
    setActiveCanvasId(canvasId);
  }, []);

  const addLayerToCanvas = useCallback((canvasId: string, layer: Layer) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedCanvas = Object.assign(Object.create(Object.getPrototypeOf(canvas)), canvas);
        updatedCanvas.addLayer(layer);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, []);

  const removeLayerFromCanvas = useCallback((canvasId: string, layerId: string) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedCanvas = Object.assign(Object.create(Object.getPrototypeOf(canvas)), canvas);
        updatedCanvas.removeLayer(layerId);
        return updatedCanvas;
      }
      return canvas;
    }));
  }, []);

  const updateLayer = useCallback((canvasId: string, layerId: string, updates: Partial<Layer>) => {
    setCanvases(prev => prev.map(canvas => {
      if (canvas.id === canvasId) {
        const updatedCanvas = Object.assign(Object.create(Object.getPrototypeOf(canvas)), canvas);
        updatedCanvas.layers = updatedCanvas.layers.map(layer => {
          if (layer.id === layerId) {
            return Object.assign(layer, updates);
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
        const updatedCanvas = Object.assign(Object.create(Object.getPrototypeOf(canvas)), canvas);
        const layer = updatedCanvas.layers.find(l => l.id === layerId);
        if (layer) {
          layer.move(offsetX, offsetY);
        }
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
    createCanvas,
    setActiveCanvas,
    addLayerToCanvas,
    removeLayerFromCanvas,
    updateLayer,
    moveLayer,
    getTopLayerAt,
  };
};
