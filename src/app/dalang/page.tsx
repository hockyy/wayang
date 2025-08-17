'use client';

import React, { useCallback, useRef } from 'react';
import { useCollaborativeCanvas } from '@/hooks/useCollaborativeCanvas';
import { useMouse } from '@/hooks/useMouse';
import { useImageUpload } from '@/hooks/useImageUpload';
import { CanvasRenderer } from '@/components/CanvasRenderer';
import { ToolPanel } from '@/components/ToolPanel';
import { LayerPanel } from '@/components/LayerPanel';
import { CanvasPanel } from '@/components/CanvasPanel';
import { Point, ImageLayer } from '@/types/core';

export default function DalangPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(100);
  const [isToolPanelCollapsed, setIsToolPanelCollapsed] = React.useState(false);
  const [isCanvasPanelCollapsed, setIsCanvasPanelCollapsed] = React.useState(false);
  
  const {
    canvases,
    activeCanvas,
    activeCanvasId,
    activeCanvasLayers,
    isConnected,
    mode,
    createCanvas,
    createCanvasFromImage,
    deleteCanvas,
    setActiveCanvas,
    addLayerToCanvas,
    removeLayerFromCanvas,
    updateLayer,
    resizeLayer,
    moveLayerUp,
    moveLayerDown,
    getTopLayerAt,
  } = useCollaborativeCanvas({ roomId: 'dalang-room'});

  // No default canvas creation - let users start with empty state



  const handleGetTopLayerAt = useCallback((point: Point) => {
    if (activeCanvasId) {
      return getTopLayerAt(activeCanvasId, point);
    }
    return null;
  }, [activeCanvasId, getTopLayerAt]);

  // Callback for layer movement during dragging (using absolute positioning)
  const handleLayerMove = useCallback((layerId: string, newBottomLeft: Point, newTopRight: Point) => {
    if (activeCanvasId && activeCanvas) {
      // Find the layer and update it directly for immediate visual feedback
      const layer = activeCanvas.layers.find(l => l.id === layerId);
      if (layer) {
        // Update the layer position directly for immediate visual feedback
        layer.bottomLeft.x = newBottomLeft.x;
        layer.bottomLeft.y = newBottomLeft.y;
        layer.topRight.x = newTopRight.x;
        layer.topRight.y = newTopRight.y;
        
        // Note: We'll sync to collaborative system on mouse up instead
        // to avoid performance issues during dragging
      }
    }
  }, [activeCanvasId, activeCanvas]);

  // Callback for layer resizing during dragging
  const handleLayerResize = useCallback((layerId: string, newBottomLeft: Point, newTopRight: Point) => {
    if (activeCanvasId && activeCanvas) {
      const layer = activeCanvas.layers.find(l => l.id === layerId);
      if (layer) {
        // Update the layer position directly for immediate visual feedback
        layer.bottomLeft.x = newBottomLeft.x;
        layer.bottomLeft.y = newBottomLeft.y;
        layer.topRight.x = newTopRight.x;
        layer.topRight.y = newTopRight.y;
      }
    }
  }, [activeCanvasId, activeCanvas]);

  // Callback for when layer movement ends (sync to collaborative system)
  const handleLayerMoveEnd = useCallback((layerId: string, newBottomLeft: Point, newTopRight: Point) => {
    if (activeCanvasId) {
      updateLayer(activeCanvasId, layerId, {
        bottomLeft: newBottomLeft,
        topRight: newTopRight
      });
    }
  }, [activeCanvasId, updateLayer]);

  // Callback for when layer resizing ends (sync to collaborative system)
  const handleLayerResizeEnd = useCallback((layerId: string, newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean) => {
    if (activeCanvasId) {
      resizeLayer(activeCanvasId, layerId, newBottomLeft, newTopRight, maintainAspectRatio);
    }
  }, [activeCanvasId, resizeLayer]);

  const {
    mouseMode,
    setMouseMode,
    selectedLayer,
    setSelectedLayer,
    isDragging,
    isResizing,
    mousePosition,
    activeHandle,
    isShiftPressed,
  } = useMouse({
    canvasRef,
    getTopLayerAt: handleGetTopLayerAt,
    mode: 'move',
    onLayerMove: handleLayerMove,
    onLayerResize: handleLayerResize,
    onLayerMoveEnd: handleLayerMoveEnd,
    onLayerResizeEnd: handleLayerResizeEnd,
  });

  const handleImageAdded = useCallback((imageLayer: ImageLayer) => {
    if (activeCanvasId) {
      addLayerToCanvas(activeCanvasId, imageLayer);
    }
  }, [activeCanvasId, addLayerToCanvas]);

  const { uploadImage, isUploading, uploadError } = useImageUpload({
    onImageAdded: handleImageAdded,
  });

  // Sync selectedLayer with the updated layer from canvas state
  React.useEffect(() => {
    if (selectedLayer && activeCanvasLayers) {
      const updatedLayer = activeCanvasLayers.find(layer => layer.id === selectedLayer.id);
      if (updatedLayer && updatedLayer !== selectedLayer) {
        setSelectedLayer(updatedLayer);
      }
    }
  }, [activeCanvasLayers, selectedLayer, setSelectedLayer]);

  const handleLayerDelete = useCallback((layerId: string) => {
    if (activeCanvasId) {
      removeLayerFromCanvas(activeCanvasId, layerId);
      if (selectedLayer?.id === layerId) {
        setSelectedLayer(null);
      }
    }
  }, [activeCanvasId, removeLayerFromCanvas, selectedLayer, setSelectedLayer]);

  const handleMoveLayerUp = useCallback((layerId: string) => {
    if (activeCanvasId) {
      moveLayerUp(activeCanvasId, layerId);
    }
  }, [activeCanvasId, moveLayerUp]);

  const handleMoveLayerDown = useCallback((layerId: string) => {
    if (activeCanvasId) {
      moveLayerDown(activeCanvasId, layerId);
    }
  }, [activeCanvasId, moveLayerDown]);

  const handleCreateCanvasFromImage = useCallback(async (file: File) => {
    try {
      await createCanvasFromImage(file);
    } catch (error) {
      console.error('Failed to create canvas from image:', error);
      throw error; // Re-throw to let the CanvasPanel handle the error display
    }
  }, [createCanvasFromImage]);

  // Zoom functionality
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const renderEmptyState = () => (
    <div className="h-screen flex">
      {/* Left Sidebar - Tools */}
      <ToolPanel
        mouseMode={mouseMode}
        onMouseModeChange={setMouseMode}
        onImageUpload={uploadImage}
        isUploading={isUploading}
        uploadError={uploadError}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        isCollapsed={isToolPanelCollapsed}
        onToggleCollapse={() => setIsToolPanelCollapsed(!isToolPanelCollapsed)}
      />

      {/* Center - Empty State */}
      <div className="flex-1 flex items-center justify-center bg-gray-200">
        <div className="text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Wayang Dalang</h2>
          <p className="text-gray-600 mb-6">Create your first canvas to get started</p>
        </div>
      </div>

      {/* Right Sidebar - Canvas List */}
      <CanvasPanel
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onCanvasSelect={setActiveCanvas}
        onCanvasCreate={createCanvas}
        onCanvasCreateFromImage={handleCreateCanvasFromImage}
        onCanvasDelete={deleteCanvas}
        allowCreate={true}
        allowDelete={true}
        isCollapsed={isCanvasPanelCollapsed}
        onToggleCollapse={() => setIsCanvasPanelCollapsed(!isCanvasPanelCollapsed)}
      />
    </div>
  );

  if (!activeCanvas) {
    return renderEmptyState();
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
                         {isResizing && (
               <div className="text-green-500 text-sm">
                 Resizing layer... {isShiftPressed ? '(Aspect ratio locked)' : '(Hold Shift to maintain aspect ratio)'}
               </div>
             )}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Mode: {mouseMode === 'move' ? 'Move' : 'Pan'}
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-sm flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-orange-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  {isConnected ? 'Connected' : 'Offline'}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  {mode === 'local' ? '📁 Local' : '☁️ Online'}
                </div>
              </div>
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
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          isCollapsed={isToolPanelCollapsed}
          onToggleCollapse={() => setIsToolPanelCollapsed(!isToolPanelCollapsed)}
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
                zoomLevel={zoomLevel}
                maxWidth={1200}
                maxHeight={600}
                mousePosition={mousePosition}
                isDragging={isDragging}
                isResizing={isResizing}
                activeHandle={activeHandle}
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
              layers={activeCanvasLayers}
              selectedLayer={selectedLayer}
              onLayerDelete={handleLayerDelete}
              onLayerSelect={setSelectedLayer}
              onMoveLayerUp={handleMoveLayerUp}
              onMoveLayerDown={handleMoveLayerDown}
            />
          </div>
        </div>

        {/* Right Sidebar - Canvas List */}
        <CanvasPanel
          canvases={canvases}
          activeCanvasId={activeCanvasId}
          onCanvasSelect={setActiveCanvas}
          onCanvasCreate={createCanvas}
          onCanvasCreateFromImage={handleCreateCanvasFromImage}
          onCanvasDelete={deleteCanvas}
          allowCreate={true}
          allowDelete={true}
          isCollapsed={isCanvasPanelCollapsed}
          onToggleCollapse={() => setIsCanvasPanelCollapsed(!isCanvasPanelCollapsed)}
        />
      </div>
    </div>
  );
}
