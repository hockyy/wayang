import { useState, useCallback, useRef } from 'react';
import { Point, Layer } from '@/types/core';
import { getOppositeHandle, getHandlePositions, calculateNewBounds } from './useResizeCalculations';

export interface UseLayerResizingProps {
  onLayerResize?: (layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => void;
  onLayerResizeEnd?: (layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => void;
}

export interface UseLayerResizingReturn {
  isResizing: boolean;
  activeHandle: number | null;
  resizeState: {
    layerId: string | null;
    handleIndex: number | null;
    initialBounds: { bottomLeft: Point; topRight: Point } | null;
    maintainAspectRatio: boolean;
  };
  startResizing: (layer: Layer, handleIndex: number, isShiftPressed: boolean) => void;
  updateResizePosition: (mousePos: Point, isShiftPressed: boolean) => void;
  endResizing: () => void;
}

/**
 * Hook to handle layer resizing logic
 */
export const useLayerResizing = ({ 
  onLayerResize, 
  onLayerResizeEnd 
}: UseLayerResizingProps): UseLayerResizingReturn => {
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);

  // Throttle layer resize updates for better performance
  const lastUpdateTime = useRef<number>(0);
  const throttledLayerResize = useCallback((
    layerId: string, 
    bottomLeft: Point, 
    topRight: Point, 
    maintainAspectRatio: boolean
  ) => {
    const now = Date.now();
    if (now - lastUpdateTime.current >= 16) { // ~60fps
      lastUpdateTime.current = now;
      if (onLayerResize) {
        onLayerResize(layerId, bottomLeft, topRight, maintainAspectRatio);
      }
    }
  }, [onLayerResize]);
  
  const resizeStateRef = useRef<{
    layerId: string | null;
    handleIndex: number | null;
    initialBounds: { bottomLeft: Point; topRight: Point } | null;
    currentBounds: { bottomLeft: Point; topRight: Point } | null;
    maintainAspectRatio: boolean;
    originalAspectRatio: number | null;
  }>({
    layerId: null,
    handleIndex: null,
    initialBounds: null,
    currentBounds: null,
    maintainAspectRatio: false,
    originalAspectRatio: null,
  });

  const startResizing = useCallback((layer: Layer, handleIndex: number, isShiftPressed: boolean) => {
    setIsResizing(true);
    setActiveHandle(handleIndex);
    
    const initialBounds = {
      bottomLeft: layer.bottomLeft.clone(),
      topRight: layer.topRight.clone()
    };
    
    resizeStateRef.current = {
      layerId: layer.id,
      handleIndex,
      initialBounds,
      currentBounds: null,
      maintainAspectRatio: isShiftPressed,
      originalAspectRatio: isShiftPressed ? layer.getAspectRatio().getFloat() : null,
    };
  }, []);

  const updateResizePosition = useCallback((mousePos: Point, isShiftPressed: boolean) => {
    if (!isResizing || !resizeStateRef.current.initialBounds || !resizeStateRef.current.layerId || activeHandle === null) {
      return;
    }

    const { initialBounds, layerId, handleIndex } = resizeStateRef.current;
    
    // Update aspect ratio constraint based on current shift state
    const maintainAspectRatio = isShiftPressed;
    const originalAspectRatio = maintainAspectRatio ? resizeStateRef.current.originalAspectRatio : undefined;
    
    // Get opposite handle and handle positions
    const pivotHandleIndex = getOppositeHandle(handleIndex!);
    const initialHandlePositions = getHandlePositions(
      initialBounds.bottomLeft, 
      initialBounds.topRight
    );
    
    // Pivot point is the opposite corner from initial bounds
    const pivotPoint = initialHandlePositions[pivotHandleIndex];
    
    // Calculate new bounds based on the specific handle being dragged
    const { bottomLeft, topRight } = calculateNewBounds(
      mousePos, 
      pivotPoint, 
      handleIndex!, 
      maintainAspectRatio, 
      originalAspectRatio || undefined
    );
    
    // Store current bounds for end callback
    resizeStateRef.current.currentBounds = { bottomLeft, topRight };
    resizeStateRef.current.maintainAspectRatio = maintainAspectRatio;
    
    // Update position in real-time with throttling
    throttledLayerResize(layerId, bottomLeft, topRight, maintainAspectRatio);
  }, [isResizing, activeHandle, throttledLayerResize]);

  const endResizing = useCallback(() => {
    if (!isResizing) return;

    const { layerId, currentBounds, maintainAspectRatio } = resizeStateRef.current;
    
    // Call end callback if we were resizing and have final bounds
    if (layerId && currentBounds && onLayerResizeEnd) {
      onLayerResizeEnd(layerId, currentBounds.bottomLeft, currentBounds.topRight, maintainAspectRatio);
    }
    
    // Reset state
    setIsResizing(false);
    setActiveHandle(null);
    resizeStateRef.current = {
      layerId: null,
      handleIndex: null,
      initialBounds: null,
      currentBounds: null,
      maintainAspectRatio: false,
      originalAspectRatio: null,
    };
  }, [isResizing, onLayerResizeEnd]);

  return {
    isResizing,
    activeHandle,
    resizeState: {
      layerId: resizeStateRef.current.layerId,
      handleIndex: resizeStateRef.current.handleIndex,
      initialBounds: resizeStateRef.current.initialBounds,
      maintainAspectRatio: resizeStateRef.current.maintainAspectRatio,
    },
    startResizing,
    updateResizePosition,
    endResizing,
  };
};
