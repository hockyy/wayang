'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas, Layer, ImageLayer, Point } from '@/types/core';
import { useResizeHandles } from '@/hooks/useResizeHandles';

interface CanvasRendererProps {
  canvas: Canvas;
  selectedLayer: Layer | null;
  className?: string;
  onCanvasRef?: (ref: HTMLCanvasElement | null) => void;
  zoomLevel?: number;
  maxWidth?: number;
  maxHeight?: number;
  mousePosition?: Point | null;
  isDragging?: boolean;
  isResizing?: boolean;
  activeHandle?: number | null;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  canvas,
  selectedLayer,
  className = '',
  onCanvasRef,
  zoomLevel = 100,
  maxWidth = 1200,
  maxHeight = 800,
  mousePosition,
  isDragging = false,
  isResizing = false,
  activeHandle = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Image cache to avoid creating new Image objects on every render
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  
  // Function to get or create cached image
  const getCachedImage = useCallback((srcPath: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // Check if image is already cached
      const cachedImage = imageCache.current.get(srcPath);
      if (cachedImage && cachedImage.complete) {
        resolve(cachedImage);
        return;
      }
      
      // Create new image and cache it
      const img = new Image();
      img.onload = () => {
        imageCache.current.set(srcPath, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${srcPath}`));
      };
      img.src = srcPath;
    });
  }, []);

  const onCanvasRefCallback = useCallback((ref: HTMLCanvasElement | null) => {
    onCanvasRef?.(ref);
  }, [onCanvasRef]);

  useEffect(() => {
    onCanvasRefCallback(canvasRef.current);
  }, [onCanvasRefCallback]);

  // Calculate display dimensions based on zoom and constraints
  const displayDimensions = useMemo(() => {
    const zoomFactor = zoomLevel / 100;
    const scaledWidth = canvas.width * zoomFactor;
    const scaledHeight = canvas.height * zoomFactor;
    
    // Calculate scale factor to fit within max dimensions
    const scaleX = maxWidth / scaledWidth;
    const scaleY = maxHeight / scaledHeight;
    const constraintScale = Math.min(1, scaleX, scaleY);
    
    return {
      width: scaledWidth * constraintScale,
      height: scaledHeight * constraintScale,
      scale: constraintScale * zoomFactor,
    };
  }, [canvas.width, canvas.height, zoomLevel, maxWidth, maxHeight]);

  // Get resize handles for the selected layer
  const isSelectedLayerPresent = !!selectedLayer;
  const { drawHandles } = useResizeHandles({ 
    layer: selectedLayer || new Layer(new Point(0, 0), new Point(0, 0), 0, 0, 0), 
    isSelected: isSelectedLayerPresent,
    mousePosition,
    isDragging,
    isResizing,
    activeHandle
  });

  const drawLayer = useCallback(async (ctx: CanvasRenderingContext2D, layer: Layer) => {
    const isSelected = selectedLayer && selectedLayer.id === layer.id;
    
    if (layer instanceof ImageLayer) {
      try {
        // Get cached image (this is now synchronous for cached images)
        const img = await getCachedImage(layer.srcPath);
        
        const x = Math.min(layer.bottomLeft.x, layer.topRight.x);
        const y = Math.min(layer.bottomLeft.y, layer.topRight.y);
        const width = layer.getWidth();
        const height = layer.getHeight();
        
        ctx.drawImage(img, x, y, width, height);
        
        // Draw selection border if this layer is selected
        if (isSelected) {
          ctx.strokeStyle = '#007bff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
          ctx.setLineDash([]);
          
          // Draw resize handles using the hook (only for selected layer)
          if (selectedLayer && selectedLayer.id === layer.id) {
            drawHandles(ctx);
          }
        }
      } catch (error) {
        console.error('Failed to draw layer:', error);
        // Draw placeholder rectangle for failed images
        const x = Math.min(layer.bottomLeft.x, layer.topRight.x);
        const y = Math.min(layer.bottomLeft.y, layer.topRight.y);
        const width = layer.getWidth();
        const height = layer.getHeight();
        
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        // Draw error text
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image failed to load', x + width / 2, y + height / 2);
      }
    }
  }, [selectedLayer, drawHandles, getCachedImage]);

  const render = useCallback(async () => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw background
    if (canvas.bg.type === 'image' && canvas.bg.imageSrc) {
      try {
        // Use cached image for background too
        const bgImg = await getCachedImage(canvas.bg.imageSrc);
        ctx.drawImage(bgImg, 0, 0, canvasElement.width, canvasElement.height);
      } catch (error) {
        console.error('Failed to load background image:', error);
        // Fallback to white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      }
    } else {
      // Draw solid color background
      ctx.fillStyle = canvas.bg.color || '#ffffff';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    }
    
    // Draw layers sequentially to maintain order
    for (const layer of canvas.layers) {
      await drawLayer(ctx, layer);
    }
  }, [canvas, drawLayer, getCachedImage]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={canvas.width}
      height={canvas.height}
      className={`border border-gray-300 ${className}`}
      style={{
        width: `${displayDimensions.width}px`,
        height: `${displayDimensions.height}px`,
        maxWidth: `${maxWidth}px`,
        maxHeight: `${maxHeight}px`,
        objectFit: 'contain',
        imageRendering: zoomLevel > 200 ? 'pixelated' : 'auto',
      }}
    />
  );
};
