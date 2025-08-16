import { useState, useCallback, useRef, useEffect } from 'react';
import { Point, MouseMode, Layer } from '@/types/core';

// Utility functions for handle calculations
const getOppositeHandle = (handleIndex: number): number => {
  return (handleIndex + 2) % 4;
};

const getHandlePositions = (bottomLeft: Point, topRight: Point) => {
  const x = Math.min(bottomLeft.x, topRight.x);
  const y = Math.min(bottomLeft.y, topRight.y);
  const width = Math.abs(topRight.x - bottomLeft.x);
  const height = Math.abs(topRight.y - bottomLeft.y);
  
  return [
    new Point(x, y),                    // 0: topLeft
    new Point(x + width, y),            // 1: topRight  
    new Point(x + width, y + height),   // 2: bottomRight
    new Point(x, y + height),           // 3: bottomLeft
  ];
};

const calculateNewBounds = (mousePos: Point, pivotPoint: Point, activeHandle: number): { bottomLeft: Point; topRight: Point } => {
  // Calculate bounds ensuring bottomLeft is actually bottom-left and topRight is actually top-right
  let x1: number, y1: number, x2: number, y2: number;
  
  switch (activeHandle) {
    case 0: // topLeft - pivot is bottomRight (2)
      x1 = mousePos.x;  // new left
      y1 = mousePos.y;  // new top  
      x2 = pivotPoint.x; // pivot right
      y2 = pivotPoint.y; // pivot bottom
      break;
    case 1: // topRight - pivot is bottomLeft (3)
      x1 = pivotPoint.x; // pivot left
      y1 = mousePos.y;   // new top
      x2 = mousePos.x;   // new right  
      y2 = pivotPoint.y; // pivot bottom
      break;
    case 2: // bottomRight - pivot is topLeft (0)
      x1 = pivotPoint.x; // pivot left
      y1 = pivotPoint.y; // pivot top
      x2 = mousePos.x;   // new right
      y2 = mousePos.y;   // new bottom
      break;
    case 3: // bottomLeft - pivot is topRight (1)
      x1 = mousePos.x;   // new left
      y1 = pivotPoint.y; // pivot top
      x2 = pivotPoint.x; // pivot right
      y2 = mousePos.y;   // new bottom
      break;
    default:
      // Fallback to min/max approach
      const minX = Math.min(mousePos.x, pivotPoint.x);
      const maxX = Math.max(mousePos.x, pivotPoint.x);
      const minY = Math.min(mousePos.y, pivotPoint.y);
      const maxY = Math.max(mousePos.y, pivotPoint.y);
      x1 = minX; y1 = minY; x2 = maxX; y2 = maxY;
  }
  
  // Ensure we have proper min/max values and create bottomLeft/topRight correctly
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  
  // bottomLeft = bottom-left corner, topRight = top-right corner
  const newBottomLeft = new Point(minX, maxY);
  const newTopRight = new Point(maxX, minY);
  
  return { bottomLeft: newBottomLeft, topRight: newTopRight };
};

export interface UseMouseProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  getTopLayerAt?: (point: Point) => Layer | null;
  mode?: MouseMode;
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
}

export const useMouse = ({
  canvasRef,
  getTopLayerAt,
  mode = 'move'
}: UseMouseProps): UseMouseReturn => {
  const [mouseMode, setMouseMode] = useState<MouseMode>(mode);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [mousePosition, setMousePosition] = useState<Point | null>(null);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const [, forceUpdate] = useState({});

  const dragStartPos = useRef<Point | null>(null);
  const initialLayerBounds = useRef<{ bottomLeft: Point; topRight: Point } | null>(null);
  const initialDragLayerBounds = useRef<{ bottomLeft: Point; topRight: Point } | null>(null);

  // Track canvas dimensions and position for efficient coordinate transformation
  const [canvasTransform, setCanvasTransform] = useState<{
    rect: DOMRect | null;
    scaleX: number;
    scaleY: number;
    isValid: boolean;
  }>({
    rect: null,
    scaleX: 1,
    scaleY: 1,
    isValid: false
  });

  // Update canvas transform when canvas changes or on resize
  const updateCanvasTransform = useCallback(() => {
    if (!canvasRef.current) {
      setCanvasTransform({
        rect: null,
        scaleX: 1,
        scaleY: 1,
        isValid: false
      });
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    setCanvasTransform({
      rect,
      scaleX: canvas.width / rect.width,
      scaleY: canvas.height / rect.height,
      isValid: true
    });
  }, [canvasRef]);

  // Update transform when canvas changes or window resizes
  useEffect(() => {
    updateCanvasTransform();
    
    const handleResize = () => updateCanvasTransform();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateCanvasTransform]);

  const getMousePositionFromEvent = useCallback((event: MouseEvent): Point | null => {
    if (!canvasTransform.isValid || !canvasTransform.rect) {
      return null;
    }

    // Calculate the mouse position relative to the canvas element
    const mouseX = event.clientX - canvasTransform.rect.left;
    const mouseY = event.clientY - canvasTransform.rect.top;

    // Convert from display coordinates to canvas coordinates
    return new Point(
      mouseX * canvasTransform.scaleX,
      mouseY * canvasTransform.scaleY
    );
  }, [canvasTransform]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;

    const mousePos = getMousePositionFromEvent(event);
    if (!mousePos) return;
    
    // Prevent default browser behavior (text selection, image dragging, etc.)
    event.preventDefault();
    setMousePosition(mousePos);

    if (mouseMode === 'move' && getTopLayerAt) {
      // First, check if clicking on a handle of the currently selected layer
      if (selectedLayer) {
        const selectedHandleIndex = selectedLayer.getHandleAt(mousePos);
        
        if (selectedHandleIndex !== null) {
          // Start resizing the selected layer
          setIsResizing(true);
          setActiveHandle(selectedHandleIndex);
          initialLayerBounds.current = {
            bottomLeft: selectedLayer.bottomLeft.clone(),
            topRight: selectedLayer.topRight.clone()
          };
          dragStartPos.current = mousePos;
          return; // Early return to avoid checking other layers
        }
      }

      // If not clicking on a handle, check for layer selection/interaction
      const layer = getTopLayerAt(mousePos);
      console.log('Mouse click at:', mousePos, 'Found layer:', layer?.id || 'none');

      if (layer) {
        if (layer.containsPoint(mousePos)) {
          // Start moving
          setSelectedLayer(layer);
          setIsDragging(true);
          dragStartPos.current = mousePos;
          // Store initial layer bounds for dragging
          initialDragLayerBounds.current = {
            bottomLeft: layer.bottomLeft.clone(),
            topRight: layer.topRight.clone()
          };
        } else {
          // Click on layer but outside its bounds (shouldn't happen with getTopLayerAt)
          setSelectedLayer(layer);
        }
      } else {
        // No layer found, deselect
        setSelectedLayer(null);
      }
    }
  }, [getTopLayerAt, getMousePositionFromEvent, selectedLayer]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;

    const mousePos = getMousePositionFromEvent(event);
    if (!mousePos) return;
    
    // Prevent default browser behavior during dragging/resizing
    if (isDragging || isResizing) {
      event.preventDefault();
    }
    
    setMousePosition(mousePos);

    if (isResizing && selectedLayer && activeHandle !== null && initialLayerBounds.current) {

      // Get opposite handle and handle positions using utility functions
      const pivotHandleIndex = getOppositeHandle(activeHandle);
      const initialHandlePositions = getHandlePositions(
        initialLayerBounds.current.bottomLeft, 
        initialLayerBounds.current.topRight
      );

      // Pivot point is the opposite corner from initial bounds
      const pivotPoint = initialHandlePositions[pivotHandleIndex];

      // Calculate new bounds based on the specific handle being dragged
      const { bottomLeft, topRight } = calculateNewBounds(mousePos, pivotPoint, activeHandle);

      // Directly update the layer bounds without creating new objects
      selectedLayer.bottomLeft.x = bottomLeft.x;
      selectedLayer.bottomLeft.y = bottomLeft.y;
      selectedLayer.topRight.x = topRight.x;
      selectedLayer.topRight.y = topRight.y;
    } else if (isDragging && selectedLayer && mouseMode === 'move') {
      if (dragStartPos.current && initialDragLayerBounds.current) {
        // Calculate offset from drag start
        const offsetX = mousePos.x - dragStartPos.current.x;
        const offsetY = mousePos.y - dragStartPos.current.y;
        
        // Calculate new absolute position based on initial bounds
        const newBottomLeft = new Point(
          initialDragLayerBounds.current.bottomLeft.x + offsetX,
          initialDragLayerBounds.current.bottomLeft.y + offsetY
        );
        const newTopRight = new Point(
          initialDragLayerBounds.current.topRight.x + offsetX,
          initialDragLayerBounds.current.topRight.y + offsetY
        );
        
        // Directly update the layer position without creating new objects
        selectedLayer.bottomLeft.x = newBottomLeft.x;
        selectedLayer.bottomLeft.y = newBottomLeft.y;
        selectedLayer.topRight.x = newTopRight.x;
        selectedLayer.topRight.y = newTopRight.y;
      }
    }

  }, [isDragging, isResizing, selectedLayer, activeHandle, mouseMode, canvasRef, getMousePositionFromEvent]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    // Prevent default browser behavior
    event.preventDefault();
    
    // Force a re-render to finalize any changes
    if (isDragging || isResizing) {
      forceUpdate({});
    }
    
    setIsDragging(false);
    setIsResizing(false);
    setActiveHandle(null);
    dragStartPos.current = null;
    initialLayerBounds.current = null;
    initialDragLayerBounds.current = null;
  }, [isDragging, isResizing]);

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

  const handleSetSelectedLayer = useCallback((layer: Layer | null) => {
    setSelectedLayer(layer);
  }, []);

  return {
    mouseMode,
    setMouseMode,
    selectedLayer,
    setSelectedLayer: handleSetSelectedLayer,
    isDragging,
    isResizing,
    mousePosition,
    activeHandle,
  };
};
