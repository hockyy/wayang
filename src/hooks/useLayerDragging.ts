import { useState, useCallback, useRef } from 'react';
import { Point, Layer } from '@/types/core';

export interface UseLayerDraggingProps {
  onLayerMove?: (layerId: string, newBottomLeft: Point, newTopRight: Point) => void;
  onLayerMoveEnd?: (layerId: string, newBottomLeft: Point, newTopRight: Point) => void;
}

export interface UseLayerDraggingReturn {
  isDragging: boolean;
  dragState: {
    layerId: string | null;
    startPos: Point | null;
    initialBounds: { bottomLeft: Point; topRight: Point } | null;
  };
  startDragging: (layer: Layer, mousePos: Point) => void;
  updateDragPosition: (mousePos: Point) => void;
  endDragging: () => void;
}

/**
 * Hook to handle layer dragging logic
 */
export const useLayerDragging = ({ 
  onLayerMove, 
  onLayerMoveEnd 
}: UseLayerDraggingProps): UseLayerDraggingReturn => {
  const [isDragging, setIsDragging] = useState(false);

  // Throttle layer move updates for better performance
  const lastUpdateTime = useRef<number>(0);
  const throttledLayerMove = useCallback((layerId: string, bottomLeft: Point, topRight: Point) => {
    const now = Date.now();
    if (now - lastUpdateTime.current >= 16) { // ~60fps
      lastUpdateTime.current = now;
      if (onLayerMove) {
        onLayerMove(layerId, bottomLeft, topRight);
      }
    }
  }, [onLayerMove]);
  
  const dragStateRef = useRef<{
    layerId: string | null;
    startPos: Point | null;
    initialBounds: { bottomLeft: Point; topRight: Point } | null;
    currentBounds: { bottomLeft: Point; topRight: Point } | null;
  }>({
    layerId: null,
    startPos: null,
    initialBounds: null,
    currentBounds: null,
  });

  const startDragging = useCallback((layer: Layer, mousePos: Point) => {
    setIsDragging(true);
    dragStateRef.current = {
      layerId: layer.id,
      startPos: mousePos.clone(),
      initialBounds: {
        bottomLeft: layer.bottomLeft.clone(),
        topRight: layer.topRight.clone()
      },
      currentBounds: null,
    };
  }, []);

  const updateDragPosition = useCallback((mousePos: Point) => {
    if (!isDragging || !dragStateRef.current.startPos || !dragStateRef.current.initialBounds || !dragStateRef.current.layerId) {
      return;
    }

    const { startPos, initialBounds, layerId } = dragStateRef.current;
    
    // Calculate offset from drag start
    const offsetX = mousePos.x - startPos.x;
    const offsetY = mousePos.y - startPos.y;
    
    // Calculate new absolute position based on initial bounds
    const newBottomLeft = new Point(
      initialBounds.bottomLeft.x + offsetX,
      initialBounds.bottomLeft.y + offsetY
    );
    const newTopRight = new Point(
      initialBounds.topRight.x + offsetX,
      initialBounds.topRight.y + offsetY
    );
    
    // Store current bounds for end callback
    dragStateRef.current.currentBounds = { bottomLeft: newBottomLeft, topRight: newTopRight };
    
    // Update position in real-time with throttling
    throttledLayerMove(layerId, newBottomLeft, newTopRight);
  }, [isDragging, throttledLayerMove]);

  const endDragging = useCallback(() => {
    if (!isDragging) return;

    const { layerId, currentBounds } = dragStateRef.current;
    
    // Call end callback if we were dragging and have final bounds
    if (layerId && currentBounds && onLayerMoveEnd) {
      onLayerMoveEnd(layerId, currentBounds.bottomLeft, currentBounds.topRight);
    }
    
    // Reset state
    setIsDragging(false);
    dragStateRef.current = {
      layerId: null,
      startPos: null,
      initialBounds: null,
      currentBounds: null,
    };
  }, [isDragging, onLayerMoveEnd]);

  return {
    isDragging,
    dragState: {
      layerId: dragStateRef.current.layerId,
      startPos: dragStateRef.current.startPos,
      initialBounds: dragStateRef.current.initialBounds,
    },
    startDragging,
    updateDragPosition,
    endDragging,
  };
};
