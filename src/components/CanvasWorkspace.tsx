'use client';

import React, { useRef } from 'react';
import { Canvas, Layer, Point, MouseMode } from '@/types/core';
import { CanvasRenderer } from './CanvasRenderer';
import { ToolPanel } from './ToolPanel';
import { LayerPanel } from './LayerPanel';
import { CanvasPanel } from './CanvasPanel';

export interface CanvasWorkspaceProps {
  // Canvas data
  canvas: Canvas;
  canvases: Canvas[];
  activeCanvasId: string | null;
  activeCanvasLayers: Layer[];
  selectedLayer: Layer | null;
  
  // Connection state
  isConnected: boolean;
  mode: 'online' | 'local';
  
  // UI state
  zoomLevel: number;
  isToolPanelCollapsed: boolean;
  isCanvasPanelCollapsed: boolean;
  mouseMode: MouseMode;
  mousePosition: Point | null;
  isDragging: boolean;
  isResizing: boolean;
  activeHandle: number | null;
  isShiftPressed: boolean;
  
  // Upload state
  isUploading: boolean;
  uploadError: string | null;
  
  // Event handlers
  onCanvasRef: (ref: HTMLCanvasElement | null) => void;
  onMouseModeChange: (mode: MouseMode) => void;
  onLayerSelect: (layer: Layer | null) => void;
  onImageUpload: (file: File) => Promise<any>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleToolPanel: () => void;
  onToggleCanvasPanel: () => void;
  
  // Canvas management
  onCanvasSelect: (canvasId: string) => void;
  onCanvasCreate: (width: number, height: number, bg: any) => void;
  onCanvasCreateFromImage: (file: File) => Promise<void>;
  onCanvasDelete: (canvasId: string) => void;
  
  // Layer management  
  onLayerDelete: (layerId: string) => void;
  onMoveLayerUp: (layerId: string) => void;
  onMoveLayerDown: (layerId: string) => void;
}

/**
 * Main canvas workspace component containing the canvas, tools, and panels
 */
export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  canvas,
  canvases,
  activeCanvasId,
  activeCanvasLayers,
  selectedLayer,
  isConnected,
  mode,
  zoomLevel,
  isToolPanelCollapsed,
  isCanvasPanelCollapsed,
  mouseMode,
  mousePosition,
  isDragging,
  isResizing,
  activeHandle,
  isShiftPressed,
  isUploading,
  uploadError,
  onCanvasRef,
  onMouseModeChange,
  onLayerSelect,
  onImageUpload,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleToolPanel,
  onToggleCanvasPanel,
  onCanvasSelect,
  onCanvasCreate,
  onCanvasCreateFromImage,
  onCanvasDelete,
  onLayerDelete,
  onMoveLayerUp,
  onMoveLayerDown,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
          onMouseModeChange={onMouseModeChange}
          onImageUpload={onImageUpload}
          isUploading={isUploading}
          uploadError={uploadError}
          zoomLevel={zoomLevel}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
          isCollapsed={isToolPanelCollapsed}
          onToggleCollapse={onToggleToolPanel}
        />

        {/* Center - Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Container */}
          <div className="flex-1 bg-gray-200 p-4 overflow-auto">
            <div className="flex items-center justify-center min-h-full">
              <CanvasRenderer
                canvas={canvas}
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
                    canvasRef.current = ref;
                    onCanvasRef(ref);
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
              onLayerDelete={onLayerDelete}
              onLayerSelect={onLayerSelect}
              onMoveLayerUp={onMoveLayerUp}
              onMoveLayerDown={onMoveLayerDown}
            />
          </div>
        </div>

        {/* Right Sidebar - Canvas List */}
        <CanvasPanel
          canvases={canvases}
          activeCanvasId={activeCanvasId}
          onCanvasSelect={onCanvasSelect}
          onCanvasCreate={onCanvasCreate}
          onCanvasCreateFromImage={onCanvasCreateFromImage}
          onCanvasDelete={onCanvasDelete}
          allowCreate={true}
          allowDelete={true}
          isCollapsed={isCanvasPanelCollapsed}
          onToggleCollapse={onToggleCanvasPanel}
        />
      </div>
    </div>
  );
};
