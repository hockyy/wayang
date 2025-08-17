import { useState, useCallback, useEffect } from 'react';
import { Point } from '@/types/core';

interface CanvasTransform {
  rect: DOMRect | null;
  scaleX: number;
  scaleY: number;
  isValid: boolean;
}

export interface UseCanvasTransformReturn {
  canvasTransform: CanvasTransform;
  getMousePositionFromEvent: (event: MouseEvent) => Point | null;
  updateCanvasTransform: () => void;
}

/**
 * Hook to handle canvas coordinate transformation and mouse position calculations
 */
export const useCanvasTransform = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): UseCanvasTransformReturn => {
  const [canvasTransform, setCanvasTransform] = useState<CanvasTransform>({
    rect: null,
    scaleX: 1,
    scaleY: 1,
    isValid: false
  });

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

  const getMousePositionFromEvent = useCallback((event: MouseEvent): Point | null => {
    // Fallback calculation if canvas transform isn't ready
    if (!canvasTransform.isValid || !canvasTransform.rect) {
      if (!canvasRef.current) return null;
      
      // Calculate using getBoundingClientRect as fallback
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Convert from display coordinates to canvas coordinates
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      
      return new Point(mouseX * scaleX, mouseY * scaleY);
    }

    // Use cached transform for better performance
    const mouseX = event.clientX - canvasTransform.rect.left;
    const mouseY = event.clientY - canvasTransform.rect.top;

    // Convert from display coordinates to canvas coordinates
    const canvasX = mouseX * canvasTransform.scaleX;
    const canvasY = mouseY * canvasTransform.scaleY;
    return new Point(canvasX, canvasY);
  }, [canvasTransform, canvasRef]);

  // Update transform when canvas changes or window resizes
  useEffect(() => {
    updateCanvasTransform();
    
    const handleResize = () => updateCanvasTransform();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateCanvasTransform]);

  return {
    canvasTransform,
    getMousePositionFromEvent,
    updateCanvasTransform,
  };
};
