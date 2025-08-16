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
  onLayerMove?: (layerId: string, newBottomLeft: Point, newTopRight: Point) => void;
  onLayerResize?: (layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => void;
  onLayerSelect?: (layer: Layer | null) => void;
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
  mousePosition: Point;
  activeHandle: number | null; // 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
}

export const useMouse = ({
  canvasRef,
  onLayerMove,
  onLayerResize,
  onLayerSelect,
  getTopLayerAt,
  mode = 'move'
}: UseMouseProps): UseMouseReturn => {
  const [mouseMode, setMouseMode] = useState<MouseMode>(mode);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [mousePosition, setMousePosition] = useState<Point>(new Point(0, 0));
  const [activeHandle, setActiveHandle] = useState<number | null>(null);

  const dragStartPos = useRef<Point | null>(null);
  const initialLayerBounds = useRef<{ bottomLeft: Point; topRight: Point } | null>(null);
  const initialDragLayerBounds = useRef<{ bottomLeft: Point; topRight: Point } | null>(null);

  const getMousePositionFromEvent = useCallback((event: MouseEvent): Point => {
    if (!canvasRef.current) return new Point(0, 0);

    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    // Calculate the mouse position relative to the canvas element
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert from display coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return new Point(
      mouseX * scaleX,
      mouseY * scaleY
    );
  }, [canvasRef]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;

    const mousePos = getMousePositionFromEvent(event);
    setMousePosition(mousePos);

    if (mouseMode === 'move' && getTopLayerAt) {
      const layer = getTopLayerAt(mousePos);

      if (layer) {
        // Check if clicking on a resize handle first
        const handleIndex = layer.getHandleAt(mousePos);

        if (handleIndex !== null) {
          // Start resizing
          setSelectedLayer(layer);
          onLayerSelect?.(layer);
          setIsResizing(true);
          setActiveHandle(handleIndex);
          initialLayerBounds.current = {
            bottomLeft: layer.bottomLeft.clone(),
            topRight: layer.topRight.clone()
          };
          dragStartPos.current = mousePos;
                  } else if (layer.containsPoint(mousePos)) {
            // Start moving
            setSelectedLayer(layer);
            onLayerSelect?.(layer);
            setIsDragging(true);
            dragStartPos.current = mousePos;
            // Store initial layer bounds for dragging
            initialDragLayerBounds.current = {
              bottomLeft: layer.bottomLeft.clone(),
              topRight: layer.topRight.clone()
            };
        } else {
          // Click outside layer, deselect
          setSelectedLayer(null);
          onLayerSelect?.(null);
          dragStartPos.current = null;
        }
      } else {
        // No layer found, deselect
        setSelectedLayer(null);
        onLayerSelect?.(null);
      }
    }
  }, [mouseMode, getTopLayerAt, onLayerSelect, canvasRef, getMousePositionFromEvent]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;

    const mousePos = getMousePositionFromEvent(event);
    setMousePosition(mousePos);

    if (isResizing && selectedLayer && activeHandle !== null && initialLayerBounds.current) {
      const isShiftPressed = event.shiftKey;

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

      onLayerResize?.(selectedLayer.id, bottomLeft, topRight, isShiftPressed);
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
        
        // Set layer to absolute position
        onLayerMove?.(selectedLayer.id, newBottomLeft, newTopRight);
      }
    }

  }, [isDragging, isResizing, selectedLayer, activeHandle, mouseMode, onLayerMove, onLayerResize, canvasRef, getMousePositionFromEvent]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveHandle(null);
    dragStartPos.current = null;
    initialLayerBounds.current = null;
    initialDragLayerBounds.current = null;
  }, []);

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
    onLayerSelect?.(layer);
  }, [onLayerSelect]);

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
