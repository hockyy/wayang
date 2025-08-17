'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas, Layer, ImageLayer, Point } from '@/types/core';
import { useResizeHandles } from '@/hooks/useResizeHandles';
import { parseGIF, decompressFrames } from 'gifuct-js';

interface GIFFrame {
  dims: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  patch: Uint8ClampedArray;
  delay: number;
  disposalType?: number;
}

interface GIFData {
  frames: GIFFrame[];
  startTime: number;
}

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
  
  // GIF data cache for parsed GIFs and their frames
  const gifCache = useRef<Map<string, GIFData>>(new Map());
  
  // Temp canvas for GIF frame rendering
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Animation frame ID for cleanup
  const animationFrameRef = useRef<number | null>(null);
  
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
  
  // Function to load and parse GIF
  const loadGIF = useCallback(async (srcPath: string): Promise<GIFFrame[]> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', srcPath, true);
      xhr.responseType = 'arraybuffer';
      
      xhr.onload = function() {
        if (xhr.response) {
          try {
            const gif = parseGIF(xhr.response);
            const frames = decompressFrames(gif, true);
            resolve(frames);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Failed to load GIF data'));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error loading GIF'));
      xhr.send();
    });
  }, []);
  
  // Function to get current frame for a GIF
  const getCurrentGIFFrame = useCallback((srcPath: string): GIFFrame | null => {
    const gifData = gifCache.current.get(srcPath);
    if (!gifData || !gifData.frames.length) return null;
    
    const currentTime = Date.now();
    const elapsed = currentTime - gifData.startTime;
    
    // Calculate which frame should be showing
    let totalDelay = 0;
    for (let i = 0; i < gifData.frames.length; i++) {
      const frame = gifData.frames[i];
      const frameDelay = frame.delay || 100; // Default 100ms if no delay
      
      if (elapsed >= totalDelay && elapsed < totalDelay + frameDelay) {
        return frame;
      }
      totalDelay += frameDelay;
    }
    
    // Loop back to beginning
    const totalDuration = gifData.frames.reduce((sum: number, frame: GIFFrame) => sum + (frame.delay || 100), 0);
    const loopTime = elapsed % totalDuration;
    
    totalDelay = 0;
    for (let i = 0; i < gifData.frames.length; i++) {
      const frame = gifData.frames[i];
      const frameDelay = frame.delay || 100;
      
      if (loopTime >= totalDelay && loopTime < totalDelay + frameDelay) {
        return frame;
      }
      totalDelay += frameDelay;
    }
    
    return gifData.frames[0]; // Fallback to first frame
  }, []);
  
  // Function to draw a GIF frame to canvas
  const drawGIFFrame = useCallback((ctx: CanvasRenderingContext2D, frame: GIFFrame, x: number, y: number, width: number, height: number) => {
    if (!frame || !frame.dims) return;
    
    // Create temp canvas if not exists
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
      tempCtxRef.current = tempCanvasRef.current.getContext('2d');
    }
    
    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCtxRef.current;
    if (!tempCtx) return;
    
    // Set temp canvas size to frame dimensions
    tempCanvas.width = frame.dims.width;
    tempCanvas.height = frame.dims.height;
    
    // Create ImageData from frame patch
    const imageData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
    imageData.data.set(frame.patch);
    
    // Draw frame data to temp canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw the temp canvas to the main canvas with scaling
    ctx.drawImage(tempCanvas, x, y, width, height);
  }, []);

  // Check if any layers are animated
  const hasAnimatedImages = useMemo(() => {
    return canvas.layers.some(layer => 
      layer instanceof ImageLayer && layer.isAnimated
    ) || (canvas.bg.type === 'image' && canvas.bg.imageSrc?.endsWith('.gif'));
  }, [canvas.layers, canvas.bg]);

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
      const x = Math.min(layer.bottomLeft.x, layer.topRight.x);
      const y = Math.min(layer.bottomLeft.y, layer.topRight.y);
      const width = layer.getWidth();
      const height = layer.getHeight();
      
      try {
        if (layer.isAnimated) {
          // Handle animated GIF
          let gifData = gifCache.current.get(layer.srcPath);
          
          if (!gifData) {
            // Load and cache GIF frames
            const frames = await loadGIF(layer.srcPath);
            gifData = {
              frames,
              startTime: Date.now()
            };
            gifCache.current.set(layer.srcPath, gifData);
          }
          
          // Get current frame and draw it
          const currentFrame = getCurrentGIFFrame(layer.srcPath);
          if (currentFrame) {
            drawGIFFrame(ctx, currentFrame, x, y, width, height);
          }
        } else {
          // Handle static image
          const img = await getCachedImage(layer.srcPath);
          ctx.drawImage(img, x, y, width, height);
        }
        
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
  }, [selectedLayer, drawHandles, getCachedImage, loadGIF, getCurrentGIFFrame, drawGIFFrame]);

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
        if (canvas.bg.imageSrc.endsWith('.gif')) {
          // Handle animated background GIF
          let gifData = gifCache.current.get(canvas.bg.imageSrc);
          
          if (!gifData) {
            const frames = await loadGIF(canvas.bg.imageSrc);
            gifData = {
              frames,
              startTime: Date.now()
            };
            gifCache.current.set(canvas.bg.imageSrc, gifData);
          }
          
          const currentFrame = getCurrentGIFFrame(canvas.bg.imageSrc);
          if (currentFrame) {
            drawGIFFrame(ctx, currentFrame, 0, 0, canvasElement.width, canvasElement.height);
          }
        } else {
          // Static background image
          const bgImg = await getCachedImage(canvas.bg.imageSrc);
          ctx.drawImage(bgImg, 0, 0, canvasElement.width, canvasElement.height);
        }
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
  }, [canvas, drawLayer, getCachedImage, loadGIF, getCurrentGIFFrame, drawGIFFrame]);
  
  // Animation loop for GIFs
  const animate = useCallback(() => {
    if (hasAnimatedImages) {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [hasAnimatedImages, render]);
  
  // Start/stop animation based on whether we have animated images
  useEffect(() => {
    if (hasAnimatedImages) {
      animate();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      render(); // Single render for static content
    }
    
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasAnimatedImages, animate, render]);

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
