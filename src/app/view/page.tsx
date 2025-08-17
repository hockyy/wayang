'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useCollaborativeCanvas } from '@/hooks/useCollaborativeCanvas';
import { ViewerWorkspace } from '@/components/ViewerWorkspace';
import { ViewerEmptyState } from '@/components/ViewerEmptyState';

export default function ViewPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCanvasPanelCollapsed, setIsCanvasPanelCollapsed] = useState(false);
  
  const {
    canvases,
    activeCanvas,
    activeCanvasId,
    activeCanvasLayers,
    isConnected,
    mode,
    setActiveCanvas,
  } = useCollaborativeCanvas({ roomId: 'dalang-room', mode: 'online' });

  // Auto-select the first canvas when available
  useEffect(() => {
    if (!activeCanvasId && canvases.length > 0) {
      setActiveCanvas(canvases[0].id);
    }
  }, [activeCanvasId, canvases, setActiveCanvas]);

  // Panel control handlers
  const toggleCanvasPanel = () => {
    setIsCanvasPanelCollapsed(prev => !prev);
  };

  if (!activeCanvas) {
    return (
      <ViewerEmptyState
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        isConnected={isConnected}
        isCanvasPanelCollapsed={isCanvasPanelCollapsed}
        onCanvasSelect={setActiveCanvas}
        onToggleCanvasPanel={toggleCanvasPanel}
      />
    );
  }

  return (
    <ViewerWorkspace
      canvas={activeCanvas}
      canvases={canvases}
      activeCanvasId={activeCanvasId}
      activeCanvasLayers={activeCanvasLayers}
      isConnected={isConnected}
      mode={mode}
      isCanvasPanelCollapsed={isCanvasPanelCollapsed}
      onCanvasRef={(ref) => {
        if (canvasRef.current !== ref) {
          canvasRef.current = ref;
        }
      }}
      onCanvasSelect={setActiveCanvas}
      onToggleCanvasPanel={toggleCanvasPanel}
    />
  );
}
