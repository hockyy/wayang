'use client';

import React, { useCallback, useRef } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { useMouse } from '@/hooks/useMouse';
import { useImageUpload } from '@/hooks/useImageUpload';
import { CanvasRenderer } from '@/components/CanvasRenderer';
import { ToolPanel } from '@/components/ToolPanel';
import { LayerPanel } from '@/components/LayerPanel';
import { CanvasPanel } from '@/components/CanvasPanel';
import { Point, ImageLayer, Layer } from '@/types/core';

export default function DalangPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const {
    canvases,
    activeCanvas,
    activeCanvasId,
    createCanvas,
    setActiveCanvas,
    addLayerToCanvas,
    removeLayerFromCanvas,
    moveLayer,
    getTopLayerAt,
  } = useCanvas();

  // Create a default canvas if none exists
  React.useEffect(() => {
    if (canvases.length === 0) {
      createCanvas(800, 600, { color: '#ffffff' });
    }
  }, [canvases.length, createCanvas]);

  const handleLayerMove = useCallback((layerId: string, offsetX: number, offsetY: number) => {
    if (activeCanvasId) {
      moveLayer(activeCanvasId, layerId, offsetX, offsetY);
    }
  }, [activeCanvasId, moveLayer]);

  const handleGetTopLayerAt = useCallback((point: Point) => {
    if (activeCanvasId) {
      return getTopLayerAt(activeCanvasId, point);
    }
    return null;
  }, [activeCanvasId, getTopLayerAt]);

  const handleLayerSelect = useCallback((layer: Layer | null) => {
    // This will be used by the mouse hook
  }, []);

  const {
    mouseMode,
    setMouseMode,
    selectedLayer,
    setSelectedLayer,
    isDragging,
  } = useMouse({
    canvasRef,
    onLayerMove: handleLayerMove,
    onLayerSelect: handleLayerSelect,
    getTopLayerAt: handleGetTopLayerAt,
    mode: 'move',
  });

  const handleImageAdded = useCallback((imageLayer: ImageLayer) => {
    if (activeCanvasId) {
      addLayerToCanvas(activeCanvasId, imageLayer);
    }
  }, [activeCanvasId, addLayerToCanvas]);

  const { uploadImage, isUploading, uploadError } = useImageUpload({
    onImageAdded: handleImageAdded,
  });

  const handleLayerDelete = useCallback((layerId: string) => {
    if (activeCanvasId) {
      removeLayerFromCanvas(activeCanvasId, layerId);
      if (selectedLayer?.id === layerId) {
        setSelectedLayer(null);
      }
    }
  }, [activeCanvasId, removeLayerFromCanvas, selectedLayer, setSelectedLayer]);

  if (!activeCanvas) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Wayang Dalang</h1>
          <div className="flex items-center gap-4">
            {uploadError && (
              <div className="text-red-500 text-sm">{uploadError}</div>
            )}
            {isDragging && (
              <div className="text-blue-500 text-sm">Moving layer...</div>
            )}
            <div className="text-sm text-gray-500">
              Mode: {mouseMode === 'move' ? 'Move' : 'Pan'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Tools */}
        <ToolPanel
          mouseMode={mouseMode}
          onMouseModeChange={setMouseMode}
          onImageUpload={uploadImage}
          isUploading={isUploading}
          uploadError={uploadError}
        />

        {/* Center - Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Container */}
          <div className="flex-1 bg-gray-200 p-4 overflow-auto">
            <div className="flex items-center justify-center min-h-full">
              <CanvasRenderer
                canvas={activeCanvas}
                selectedLayer={selectedLayer}
                className="shadow-lg"
                onCanvasRef={(ref) => {
                  if (canvasRef.current !== ref) {
                    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = ref;
                  }
                }}
              />
            </div>
          </div>

          {/* Bottom - Layer Panel */}
          <div className="h-48 border-t border-gray-300">
            <LayerPanel
              layers={activeCanvas.layers}
              selectedLayer={selectedLayer}
              onLayerSelect={setSelectedLayer}
              onLayerDelete={handleLayerDelete}
            />
          </div>
        </div>

        {/* Right Sidebar - Canvas List */}
        <CanvasPanel
          canvases={canvases}
          activeCanvasId={activeCanvasId}
          onCanvasSelect={setActiveCanvas}
          onCanvasCreate={createCanvas}
          allowCreate={true}
        />
      </div>
    </div>
  );
}
