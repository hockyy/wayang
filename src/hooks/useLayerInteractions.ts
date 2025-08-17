import { useCallback } from 'react';
import { Point, Layer, ImageLayer } from '@/types/core';

export interface UseLayerInteractionsProps {
  activeCanvasId: string | null;
  activeCanvas: any; // TODO: Type this properly
  selectedLayer: Layer | null;
  setSelectedLayer: (layer: Layer | null) => void;
  updateLayer: (canvasId: string, layerId: string, updates: Partial<Layer>) => void;
  addLayerToCanvas: (canvasId: string, layer: Layer) => void;
  removeLayerFromCanvas: (canvasId: string, layerId: string) => void;
  moveLayerUp: (canvasId: string, layerId: string) => void;
  moveLayerDown: (canvasId: string, layerId: string) => void;
  getTopLayerAt: (canvasId: string, point: Point) => Layer | null;
}

export interface UseLayerInteractionsReturn {
  // Layer interaction handlers
  handleGetTopLayerAt: (point: Point) => Layer | null;
  handleLayerMove: (layerId: string, newBottomLeft: Point, newTopRight: Point) => void;
  handleLayerResize: (layerId: string, newBottomLeft: Point, newTopRight: Point) => void;
  handleLayerMoveEnd: () => void;
  handleLayerResizeEnd: () => void;
  
  // Layer management handlers
  handleImageAdded: (imageLayer: ImageLayer) => void;
  handleLayerDelete: (layerId: string) => void;
  handleMoveLayerUp: (layerId: string) => void;
  handleMoveLayerDown: (layerId: string) => void;
}

/**
 * Hook to handle all layer-related interactions and management
 */
export const useLayerInteractions = ({
  activeCanvasId,
  activeCanvas,
  selectedLayer,
  setSelectedLayer,
  updateLayer,
  addLayerToCanvas,
  removeLayerFromCanvas,
  moveLayerUp,
  moveLayerDown,
  getTopLayerAt,
}: UseLayerInteractionsProps): UseLayerInteractionsReturn => {
  
  // Layer interaction handlers
  const handleGetTopLayerAt = useCallback((point: Point) => {
    if (activeCanvasId) {
      return getTopLayerAt(activeCanvasId, point);
    }
    return null;
  }, [activeCanvasId, getTopLayerAt]);

  const handleLayerMove = useCallback((layerId: string, newBottomLeft: Point, newTopRight: Point) => {
    if (activeCanvasId) {
      updateLayer(activeCanvasId, layerId, {
        bottomLeft: newBottomLeft,
        topRight: newTopRight
      });
    }
  }, [activeCanvasId, updateLayer]);

  const handleLayerResize = useCallback((layerId: string, newBottomLeft: Point, newTopRight: Point) => {
    if (activeCanvasId) {
      updateLayer(activeCanvasId, layerId, {
        bottomLeft: newBottomLeft,
        topRight: newTopRight
      });
    }
  }, [activeCanvasId, updateLayer]);

  const handleLayerMoveEnd = useCallback(() => {
    // Real-time updates already handled, no additional action needed
  }, []);

  const handleLayerResizeEnd = useCallback(() => {
    // Real-time updates already handled, no additional action needed  
  }, []);

  // Layer management handlers
  const handleImageAdded = useCallback((imageLayer: ImageLayer) => {
    if (activeCanvasId) {
      addLayerToCanvas(activeCanvasId, imageLayer);
    }
  }, [activeCanvasId, addLayerToCanvas]);

  const handleLayerDelete = useCallback((layerId: string) => {
    if (activeCanvasId) {
      removeLayerFromCanvas(activeCanvasId, layerId);
      if (selectedLayer?.id === layerId) {
        setSelectedLayer(null);
      }
    }
  }, [activeCanvasId, removeLayerFromCanvas, selectedLayer, setSelectedLayer]);

  const handleMoveLayerUp = useCallback((layerId: string) => {
    if (activeCanvasId) {
      moveLayerUp(activeCanvasId, layerId);
    }
  }, [activeCanvasId, moveLayerUp]);

  const handleMoveLayerDown = useCallback((layerId: string) => {
    if (activeCanvasId) {
      moveLayerDown(activeCanvasId, layerId);
    }
  }, [activeCanvasId, moveLayerDown]);

  return {
    handleGetTopLayerAt,
    handleLayerMove,
    handleLayerResize,
    handleLayerMoveEnd,
    handleLayerResizeEnd,
    handleImageAdded,
    handleLayerDelete,
    handleMoveLayerUp,
    handleMoveLayerDown,
  };
};
