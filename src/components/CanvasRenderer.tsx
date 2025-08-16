'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Canvas, Layer, ImageLayer } from '@/types/core';

interface CanvasRendererProps {
  canvas: Canvas;
  selectedLayer: Layer | null;
  className?: string;
  onCanvasRef?: (ref: HTMLCanvasElement | null) => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  canvas,
  selectedLayer,
  className = '',
  onCanvasRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onCanvasRef?.(canvasRef.current);
  }, [onCanvasRef]);

  const drawLayer = useCallback((ctx: CanvasRenderingContext2D, layer: Layer) => {
    if (layer instanceof ImageLayer) {
      const img = new Image();
      img.onload = () => {
        const x = Math.min(layer.bottomLeft.x, layer.topRight.x);
        const y = Math.min(layer.bottomLeft.y, layer.topRight.y);
        const width = layer.getWidth();
        const height = layer.getHeight();
        
        ctx.drawImage(img, x, y, width, height);
        
        // Draw selection border if this layer is selected
        if (selectedLayer && selectedLayer.id === layer.id) {
          ctx.strokeStyle = '#007bff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
          ctx.setLineDash([]);
        }
      };
      img.src = layer.srcPath;
    }
  }, [selectedLayer]);

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
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
      }}
    />
  );
};
