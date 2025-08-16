import { useCallback, useMemo } from 'react';
import { Layer, Point } from '@/types/core';
import { HANDLE_SIZE, HANDLE_OFFSET } from '@/constants/ui';

export interface UseResizeHandlesProps {
  layer: Layer;
  isSelected: boolean;
  mousePosition?: Point | null;
  isDragging?: boolean;
  isResizing?: boolean;
  activeHandle?: number | null;
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
  isResizing = false,
  activeHandle = null
}: UseResizeHandlesProps): UseResizeHandlesReturn => {
  // Calculate handle positions using useMemo to ensure re-computation when bounds change
  // Include specific layer properties that affect handle positions in dependencies
  const handles = useMemo((): ResizeHandle[] => {
    if (!isSelected) return [];

    const x = Math.min(layer.bottomLeft.x, layer.topRight.x);
    const y = Math.min(layer.bottomLeft.y, layer.topRight.y);
    const width = layer.getWidth();
    const height = layer.getHeight();
    console.log(x, y, width, height);
    // Handle indices: 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
    return [
      { x: x - HANDLE_OFFSET, y: y - HANDLE_OFFSET, index: 0 }, // top-left
      { x: x + width - HANDLE_OFFSET, y: y - HANDLE_OFFSET, index: 1 }, // top-right
      { x: x + width - HANDLE_OFFSET, y: y + height - HANDLE_OFFSET, index: 2 }, // bottom-right
      { x: x - HANDLE_OFFSET, y: y + height - HANDLE_OFFSET, index: 3 }, // bottom-left
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, layer.bottomLeft.x, layer.bottomLeft.y, layer.topRight.x, layer.topRight.y, isSelected]);

  // Check if a point is near a resize handle (define first to avoid circular dependency)
  const getHandleAt = useCallback((point: Point, tolerance: number = HANDLE_SIZE): number | null => {
    if (!isSelected) return null;

    const handleList = handles;
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

    const handleList = handles;

    // Determine which handle is currently being hovered or active
    let hoveredHandle: number | null = null;
    if (mousePosition && !isDragging && !isResizing) {
      hoveredHandle = getHandleAt(mousePosition);
    }

    handleList.forEach(handle => {
      // Use different colors for hovered/active handles
      const isHovered = hoveredHandle === handle.index;
      const isActive = isResizing && activeHandle === handle.index;

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
      ctx.fillRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
    });
  }, [handles, isSelected, mousePosition, isDragging, isResizing, activeHandle, getHandleAt]);



  // Get pivot handle for the given active handle
  // Handle 0 pivots around handle 2, handle 1 around handle 3, etc.
  const getPivotHandle = useCallback((activeHandle: number): number => {
    // XOR with 2 to get opposite corner: 0^2=2, 1^2=3, 2^2=0, 3^2=1
    return activeHandle ^ 2;
  }, []);

  return {
    handles: handles,
    drawHandles,
    getHandleAt,
    getPivotHandle,
  };
};
