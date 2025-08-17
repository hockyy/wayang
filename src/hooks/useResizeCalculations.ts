import { Point } from '@/types/core';

/**
 * Utility functions for handle calculations and bounds manipulation
 */

export const getOppositeHandle = (handleIndex: number): number => {
  return (handleIndex + 2) % 4;
};

export const getHandlePositions = (bottomLeft: Point, topRight: Point) => {
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

export const calculateNewBounds = (
  mousePos: Point, 
  pivotPoint: Point, 
  activeHandle: number, 
  maintainAspectRatio: boolean = false, 
  originalAspectRatio?: number
): { bottomLeft: Point; topRight: Point } => {
  let x1: number, y1: number, x2: number, y2: number;
  
  if (maintainAspectRatio && originalAspectRatio) {
    // Calculate constrained mouse position to maintain aspect ratio
    const deltaX = mousePos.x - pivotPoint.x;
    const deltaY = mousePos.y - pivotPoint.y;
    
    const currentWidth = Math.abs(deltaX);
    const currentHeight = Math.abs(deltaY);
    
    let constrainedWidth: number, constrainedHeight: number;
    
    if (currentWidth / currentHeight > originalAspectRatio) {
      constrainedWidth = currentWidth;
      constrainedHeight = currentWidth / originalAspectRatio;
    } else {
      constrainedHeight = currentHeight;
      constrainedWidth = currentHeight * originalAspectRatio;
    }
    
    const constrainedDeltaX = constrainedWidth * Math.sign(deltaX);
    const constrainedDeltaY = constrainedHeight * Math.sign(deltaY);
    
    const constrainedMouseX = pivotPoint.x + constrainedDeltaX;
    const constrainedMouseY = pivotPoint.y + constrainedDeltaY;
    
    switch (activeHandle) {
      case 0: // topLeft
        x1 = constrainedMouseX; y1 = constrainedMouseY; 
        x2 = pivotPoint.x; y2 = pivotPoint.y;
        break;
      case 1: // topRight
        x1 = pivotPoint.x; y1 = constrainedMouseY; 
        x2 = constrainedMouseX; y2 = pivotPoint.y;
        break;
      case 2: // bottomRight
        x1 = pivotPoint.x; y1 = pivotPoint.y; 
        x2 = constrainedMouseX; y2 = constrainedMouseY;
        break;
      case 3: // bottomLeft
        x1 = constrainedMouseX; y1 = pivotPoint.y; 
        x2 = pivotPoint.x; y2 = constrainedMouseY;
        break;
      default:
        x1 = Math.min(constrainedMouseX, pivotPoint.x);
        y1 = Math.min(constrainedMouseY, pivotPoint.y);
        x2 = Math.max(constrainedMouseX, pivotPoint.x);
        y2 = Math.max(constrainedMouseY, pivotPoint.y);
    }
  } else {
    switch (activeHandle) {
      case 0: // topLeft
        x1 = mousePos.x; y1 = mousePos.y; 
        x2 = pivotPoint.x; y2 = pivotPoint.y;
        break;
      case 1: // topRight
        x1 = pivotPoint.x; y1 = mousePos.y; 
        x2 = mousePos.x; y2 = pivotPoint.y;
        break;
      case 2: // bottomRight
        x1 = pivotPoint.x; y1 = pivotPoint.y; 
        x2 = mousePos.x; y2 = mousePos.y;
        break;
      case 3: // bottomLeft
        x1 = mousePos.x; y1 = pivotPoint.y; 
        x2 = pivotPoint.x; y2 = mousePos.y;
        break;
      default:
        const minX = Math.min(mousePos.x, pivotPoint.x);
        const maxX = Math.max(mousePos.x, pivotPoint.x);
        const minY = Math.min(mousePos.y, pivotPoint.y);
        const maxY = Math.max(mousePos.y, pivotPoint.y);
        x1 = minX; y1 = minY; x2 = maxX; y2 = maxY;
    }
  }
  
  // Ensure proper min/max values
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  
  // bottomLeft = bottom-left corner, topRight = top-right corner
  const newBottomLeft = new Point(minX, maxY);
  const newTopRight = new Point(maxX, minY);
  
  return { bottomLeft: newBottomLeft, topRight: newTopRight };
};
