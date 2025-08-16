import { useState, useCallback, useRef, useEffect } from 'react';
import { Point, MouseMode, Layer } from '@/types/core';

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

      // Get pivot handle (opposite corner)
      const pivotHandle = activeHandle ^ 2; // XOR with 2 to get opposite corner

      // Get handle positions from current layer bounds
      const handles = selectedLayer.getResizeHandles();
      const handlePositions = [
        handles.topLeft,     // 0
        handles.topRight,    // 1
        handles.bottomRight, // 2
        handles.bottomLeft,  // 3
      ];

      // Pivot point is the opposite corner
      const pivotPoint = handlePositions[pivotHandle];

      // Determine new bounds based on mouse position and pivot
      const minX = Math.min(mousePos.x, pivotPoint.x);
      const maxX = Math.max(mousePos.x, pivotPoint.x);
      const minY = Math.min(mousePos.y, pivotPoint.y);
      const maxY = Math.max(mousePos.y, pivotPoint.y);

      const newBottomLeft = new Point(minX, maxY);
      const newTopRight = new Point(maxX, minY);

      onLayerResize?.(selectedLayer.id, newBottomLeft, newTopRight, isShiftPressed);
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
