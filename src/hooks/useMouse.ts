import { useState, useCallback, useEffect } from 'react';
import { Point, MouseMode, Layer } from '@/types/core';
import { useCanvasTransform } from './useCanvasTransform';
import { useKeyboardState } from './useKeyboardState';
import { useLayerDragging } from './useLayerDragging';
import { useLayerResizing } from './useLayerResizing';

export interface UseMouseProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  getTopLayerAt?: (point: Point) => Layer | null;
  mode?: MouseMode;
  onLayerMove?: (layerId: string, newBottomLeft: Point, newTopRight: Point) => void;
  onLayerResize?: (layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => void;
  onLayerMoveEnd?: (layerId: string, newBottomLeft: Point, newTopRight: Point) => void;
  onLayerResizeEnd?: (layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => void;
}

export interface UseMouseReturn {
  mouseMode: MouseMode;
  setMouseMode: (mode: MouseMode) => void;
  selectedLayer: Layer | null;
  setSelectedLayer: (layer: Layer | null) => void;
  isDragging: boolean;
  isResizing: boolean;
  mousePosition: Point | null;
  activeHandle: number | null; // 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
  isShiftPressed: boolean;
}

export const useMouse = ({
  canvasRef,
  getTopLayerAt,
  mode = 'move',
  onLayerMove,
  onLayerResize,
  onLayerMoveEnd,
  onLayerResizeEnd
}: UseMouseProps): UseMouseReturn => {
  const [mouseMode, setMouseMode] = useState<MouseMode>(mode);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [mousePosition, setMousePosition] = useState<Point | null>(null);

  // Use the specialized hooks
  const { getMousePositionFromEvent } = useCanvasTransform(canvasRef);
  const { isShiftPressed, setIsShiftPressed } = useKeyboardState();
  
  const dragging = useLayerDragging({
    onLayerMove,
    onLayerMoveEnd,
  });
  
  const resizing = useLayerResizing({
    onLayerResize,
    onLayerResizeEnd,
  });

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;
    
    const mousePos = getMousePositionFromEvent(event);
    if (!mousePos) return;
    
    // Prevent default browser behavior
    event.preventDefault();
    setMousePosition(mousePos);
    setIsShiftPressed(event.shiftKey);

    if (mouseMode === 'move' && getTopLayerAt) {
      // Check if clicking on a handle of the currently selected layer
      if (selectedLayer) {
        const handleIndex = selectedLayer.getHandleAt(mousePos);
        
        if (handleIndex !== null) {
          // Start resizing
          resizing.startResizing(selectedLayer, handleIndex, event.shiftKey);
          return;
        }
      }

      // Check for layer selection/interaction
      const layer = getTopLayerAt(mousePos);

      if (layer && layer.containsPoint(mousePos)) {
        // Start dragging
        setSelectedLayer(layer);
        dragging.startDragging(layer, mousePos);
      } else {
        // No layer found or clicked outside bounds, deselect
        setSelectedLayer(layer);
      }
    }
  }, [getTopLayerAt, getMousePositionFromEvent, selectedLayer, canvasRef, mouseMode, dragging, resizing, setIsShiftPressed]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;

    const mousePos = getMousePositionFromEvent(event);
    if (!mousePos) return;
    
    // Prevent default browser behavior during interactions
    if (dragging.isDragging || resizing.isResizing) {
      event.preventDefault();
    }
    
    setMousePosition(mousePos);
    setIsShiftPressed(event.shiftKey);

    // Update dragging or resizing position
    if (resizing.isResizing) {
      resizing.updateResizePosition(mousePos, event.shiftKey);
    } else if (dragging.isDragging && mouseMode === 'move') {
      dragging.updateDragPosition(mousePos);
    }
  }, [dragging, resizing, mouseMode, canvasRef, getMousePositionFromEvent, setIsShiftPressed]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    event.preventDefault();
    
    // End any active interactions
    dragging.endDragging();
    resizing.endResizing();
    
    // Reset shift state on mouse up
    setIsShiftPressed(false);
  }, [dragging, resizing, setIsShiftPressed]);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, canvasRef]);

  return {
    mouseMode,
    setMouseMode,
    selectedLayer,
    setSelectedLayer,
    isDragging: dragging.isDragging,
    isResizing: resizing.isResizing,
    mousePosition,
    activeHandle: resizing.activeHandle,
    isShiftPressed,
  };
};
