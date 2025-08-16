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
  mousePosition?: Point;
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

  const drawLayer = useCallback((ctx: CanvasRenderingContext2D, layer: Layer) => {
    const isSelected = selectedLayer && selectedLayer.id === layer.id;
    
    if (layer instanceof ImageLayer) {
      const img = new Image();
      img.onload = () => {
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
      };
      img.src = layer.srcPath;
    }
  }, [selectedLayer, drawHandles]);

  const render = useCallback(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw background
    if (canvas.bg.type === 'image' && canvas.bg.imageSrc) {
      const bgImg = new Image();
      bgImg.onload = () => {
        // Draw the background image to fill the entire canvas
        ctx.drawImage(bgImg, 0, 0, canvasElement.width, canvasElement.height);
        
        // Draw layers on top of background
        canvas.layers.forEach(layer => {
          drawLayer(ctx, layer);
        });
      };
      bgImg.src = canvas.bg.imageSrc;
    } else {
      // Draw solid color background
      ctx.fillStyle = canvas.bg.color || '#ffffff';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      
      // Draw layers in order
      canvas.layers.forEach(layer => {
        drawLayer(ctx, layer);
      });
    }
  }, [canvas, drawLayer]);

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
