import { useCallback } from 'react';
import { Layer, Point } from '@/types/core';

export interface UseResizeHandlesProps {
  layer: Layer;
  isSelected: boolean;
  mousePosition?: Point;
  isDragging?: boolean;
  isResizing?: boolean;
}

export interface ResizeHandle {
  x: number;
  y: number;
  index: number;
}

export interface UseResizeHandlesReturn {
  handles: ResizeHandle[];
  drawHandles: (ctx: CanvasRenderingContext2D) => void;
  getHandleAt: (point: Point, tolerance?: number) => number | null;
  getPivotHandle: (activeHandle: number) => number;
}

export const useResizeHandles = ({ 
  layer, 
  isSelected, 
  mousePosition, 
  isDragging = false, 
  isResizing = false 
}: UseResizeHandlesProps): UseResizeHandlesReturn => {
  // Calculate handle positions
  const handles = useCallback((): ResizeHandle[] => {
    if (!isSelected) return [];
    
    const x = Math.min(layer.bottomLeft.x, layer.topRight.x);
    const y = Math.min(layer.bottomLeft.y, layer.topRight.y);
    const width = layer.getWidth();
    const height = layer.getHeight();
    
    const handleSize = 8;
    const handleOffset = handleSize / 2;
    
    // Handle indices: 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
    return [
      { x: x - handleOffset, y: y - handleOffset, index: 0 }, // top-left
      { x: x + width - handleOffset, y: y - handleOffset, index: 1 }, // top-right
      { x: x + width - handleOffset, y: y + height - handleOffset, index: 2 }, // bottom-right
      { x: x - handleOffset, y: y + height - handleOffset, index: 3 }, // bottom-left
    ];
  }, [layer, isSelected]);

  // Check if a point is near a resize handle (define first to avoid circular dependency)
  const getHandleAt = useCallback((point: Point, tolerance: number = 8): number | null => {
    if (!isSelected) return null;
    
    const handleList = handles();
    const handleSize = tolerance;
    
    for (const handle of handleList) {
      if (
        point.x >= handle.x - handleSize / 2 &&
        point.x <= handle.x + handleSize / 2 + handleSize &&
        point.y >= handle.y - handleSize / 2 &&
        point.y <= handle.y + handleSize / 2 + handleSize
      ) {
        return handle.index;
      }
    }
    
    return null;
  }, [handles, isSelected]);

  // Draw resize handles
  const drawHandles = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isSelected) return;
    
    const handleList = handles();
    const handleSize = 8;
    
    // Determine which handle is currently being hovered or active
    let hoveredHandle: number | null = null;
    if (mousePosition && !isDragging && !isResizing) {
      hoveredHandle = getHandleAt(mousePosition);
    }
    
    handleList.forEach(handle => {
      // Use different colors for hovered/active handles
      const isHovered = hoveredHandle === handle.index;
      const isActive = isResizing && hoveredHandle === handle.index;
      
      if (isActive) {
        ctx.fillStyle = '#dc3545'; // Red for active resize
        ctx.strokeStyle = '#ffffff';
      } else if (isHovered) {
        ctx.fillStyle = '#28a745'; // Green for hover
        ctx.strokeStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#007bff'; // Blue for normal
        ctx.strokeStyle = '#ffffff';
      }
      
      ctx.lineWidth = 1;
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  }, [handles, isSelected, mousePosition, isDragging, isResizing, getHandleAt]);



  // Get pivot handle for the given active handle
  // Handle 0 pivots around handle 2, handle 1 around handle 3, etc.
  const getPivotHandle = useCallback((activeHandle: number): number => {
    // XOR with 2 to get opposite corner: 0^2=2, 1^2=3, 2^2=0, 3^2=1
    return activeHandle ^ 2;
  }, []);

  return {
    handles: handles(),
    drawHandles,
    getHandleAt,
    getPivotHandle,
  };
};
