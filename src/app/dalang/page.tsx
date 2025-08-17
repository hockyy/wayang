'use client';

import React, { useRef, useEffect } from 'react';
import { useCollaborativeCanvas } from '@/hooks/useCollaborativeCanvas';
import { useMouse } from '@/hooks/useMouse';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useLayerInteractions } from '@/hooks/useLayerInteractions';
import { useCanvasWorkspace } from '@/hooks/useCanvasWorkspace';
import { CanvasWorkspace } from '@/components/CanvasWorkspace';
import { EmptyCanvasState } from '@/components/EmptyCanvasState';
import { ImageLayer } from '@/types/core';

export default function DalangPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
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
    moveLayerUp,
    moveLayerDown,
    getTopLayerAt,
  } = useCollaborativeCanvas({ roomId: 'dalang-room', mode: 'online' });

  // Layer interaction handlers
  const layerInteractions = useLayerInteractions({
    activeCanvasId,
    activeCanvas,
    selectedLayer: null, // Will be set by mouse hook
    setSelectedLayer: () => {}, // Will be set by mouse hook
    updateLayer,
    addLayerToCanvas,
    removeLayerFromCanvas,
    moveLayerUp,
    moveLayerDown,
    getTopLayerAt,
  });

  // Canvas workspace state and handlers
  const workspace = useCanvasWorkspace({
    createCanvasFromImage,
  });

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
    getTopLayerAt: layerInteractions.handleGetTopLayerAt,
    mode: 'move',
    onLayerMove: layerInteractions.handleLayerMove,
    onLayerResize: layerInteractions.handleLayerResize,
    onLayerMoveEnd: layerInteractions.handleLayerMoveEnd,
    onLayerResizeEnd: layerInteractions.handleLayerResizeEnd,
  });

  // Image upload handler
  const handleImageAdded = (imageLayer: ImageLayer) => {
    if (activeCanvasId) {
      addLayerToCanvas(activeCanvasId, imageLayer);
    }
  };

  const { uploadImage, isUploading, uploadError } = useImageUpload({
    onImageAdded: handleImageAdded,
  });

  // Sync selectedLayer with the updated layer from canvas state
  useEffect(() => {
    if (selectedLayer && activeCanvasLayers) {
      const updatedLayer = activeCanvasLayers.find(layer => layer.id === selectedLayer.id);
      if (updatedLayer && updatedLayer !== selectedLayer) {
        setSelectedLayer(updatedLayer);
      }
    }
  }, [activeCanvasLayers, selectedLayer, setSelectedLayer]);

  // Layer management handlers that use the selected layer state
  const handleLayerDelete = (layerId: string) => {
    layerInteractions.handleLayerDelete(layerId);
    if (selectedLayer?.id === layerId) {
      setSelectedLayer(null);
    }
  };

  if (!activeCanvas) {
    return (
      <EmptyCanvasState
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        zoomLevel={workspace.zoomLevel}
        isToolPanelCollapsed={workspace.isToolPanelCollapsed}
        isCanvasPanelCollapsed={workspace.isCanvasPanelCollapsed}
        mouseMode={mouseMode}
        isUploading={isUploading}
        uploadError={uploadError}
        onMouseModeChange={setMouseMode}
        onImageUpload={uploadImage}
        onZoomIn={workspace.handleZoomIn}
        onZoomOut={workspace.handleZoomOut}
        onZoomReset={workspace.handleZoomReset}
        onToggleToolPanel={workspace.toggleToolPanel}
        onToggleCanvasPanel={workspace.toggleCanvasPanel}
        onCanvasSelect={setActiveCanvas}
        onCanvasCreate={createCanvas}
        onCanvasCreateFromImage={workspace.handleCreateCanvasFromImage}
        onCanvasDelete={deleteCanvas}
      />
    );
  }

  return (
    <CanvasWorkspace
      canvas={activeCanvas}
      canvases={canvases}
      activeCanvasId={activeCanvasId}
      activeCanvasLayers={activeCanvasLayers}
      selectedLayer={selectedLayer}
      isConnected={isConnected}
      mode={mode}
      zoomLevel={workspace.zoomLevel}
      isToolPanelCollapsed={workspace.isToolPanelCollapsed}
      isCanvasPanelCollapsed={workspace.isCanvasPanelCollapsed}
      mouseMode={mouseMode}
      mousePosition={mousePosition}
      isDragging={isDragging}
      isResizing={isResizing}
      activeHandle={activeHandle}
      isShiftPressed={isShiftPressed}
      isUploading={isUploading}
      uploadError={uploadError}
      onCanvasRef={(ref) => {
        if (canvasRef.current !== ref) {
          canvasRef.current = ref;
        }
      }}
      onMouseModeChange={setMouseMode}
      onLayerSelect={setSelectedLayer}
      onImageUpload={uploadImage}
      onZoomIn={workspace.handleZoomIn}
      onZoomOut={workspace.handleZoomOut}
      onZoomReset={workspace.handleZoomReset}
      onToggleToolPanel={workspace.toggleToolPanel}
      onToggleCanvasPanel={workspace.toggleCanvasPanel}
      onCanvasSelect={setActiveCanvas}
      onCanvasCreate={createCanvas}
      onCanvasCreateFromImage={workspace.handleCreateCanvasFromImage}
      onCanvasDelete={deleteCanvas}
      onLayerDelete={handleLayerDelete}
      onMoveLayerUp={layerInteractions.handleMoveLayerUp}
      onMoveLayerDown={layerInteractions.handleMoveLayerDown}
    />
  );
}
