import { useState, useCallback, useRef, useEffect } from 'react';
import { Point, MouseMode, Layer } from '@/types/core';

export interface UseMouseProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onLayerMove?: (layerId: string, offsetX: number, offsetY: number) => void;
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
  mousePosition: Point;
  dragOffset: Point;
}

export const useMouse = ({
  canvasRef,
  onLayerMove,
  onLayerSelect,
  getTopLayerAt,
  mode = 'move'
}: UseMouseProps): UseMouseReturn => {
  const [mouseMode, setMouseMode] = useState<MouseMode>(mode);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState<Point>(new Point(0, 0));
  const [dragOffset, setDragOffset] = useState<Point>(new Point(0, 0));
  
  const dragStartPos = useRef<Point>(new Point(0, 0));
  const lastMousePos = useRef<Point>(new Point(0, 0));

  const getMousePositionFromEvent = useCallback((event: MouseEvent): Point => {
    if (!canvasRef.current) return new Point(0, 0);
    
    const rect = canvasRef.current.getBoundingClientRect();
    return new Point(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  }, [canvasRef]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;
    
    const mousePos = getMousePositionFromEvent(event);
    setMousePosition(mousePos);
    lastMousePos.current = mousePos;
    dragStartPos.current = mousePos;

    if (mouseMode === 'move' && getTopLayerAt) {
      const layer = getTopLayerAt(mousePos);
      setSelectedLayer(layer);
      onLayerSelect?.(layer);
      
      if (layer) {
        setIsDragging(true);
        // Calculate offset from mouse to layer's bottom-left corner
        setDragOffset(new Point(
          mousePos.x - layer.bottomLeft.x,
          mousePos.y - layer.bottomLeft.y
        ));
      }
    }
  }, [mouseMode, getTopLayerAt, onLayerSelect, canvasRef, getMousePositionFromEvent]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasRef.current) return;
    
    const mousePos = getMousePositionFromEvent(event);
    setMousePosition(mousePos);

    if (isDragging && selectedLayer && mouseMode === 'move') {
      const offsetX = mousePos.x - lastMousePos.current.x;
      const offsetY = mousePos.y - lastMousePos.current.y;
      
      onLayerMove?.(selectedLayer.id, offsetX, offsetY);
    }
    
    lastMousePos.current = mousePos;
  }, [isDragging, selectedLayer, mouseMode, onLayerMove, canvasRef, getMousePositionFromEvent]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset(new Point(0, 0));
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
    mousePosition,
    dragOffset,
  };
};
