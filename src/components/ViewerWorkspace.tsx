'use client';

import React, { useRef } from 'react';
import { Canvas, Layer } from '@/types/core';
import { CanvasRenderer } from './CanvasRenderer';
import { CanvasPanel } from './CanvasPanel';

export interface ViewerWorkspaceProps {
  // Canvas data
  canvas: Canvas;
  canvases: Canvas[];
  activeCanvasId: string | null;
  activeCanvasLayers: Layer[];
  
  // Connection state
  isConnected: boolean;
  mode: 'online' | 'local';
  isCanvasPanelCollapsed: boolean;
  
  // Event handlers
  onCanvasRef: (ref: HTMLCanvasElement | null) => void;
  onCanvasSelect: (canvasId: string) => void;
  onToggleCanvasPanel: () => void;
}

/**
 * Main viewer workspace component - read-only canvas viewing
 */
export const ViewerWorkspace: React.FC<ViewerWorkspaceProps> = ({
  canvas,
  canvases,
  activeCanvasId,
  activeCanvasLayers,
  isConnected,
  mode,
  isCanvasPanelCollapsed,
  onCanvasRef,
  onCanvasSelect,
  onToggleCanvasPanel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Wayang Viewer</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Viewing Mode - Read Only
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-sm flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-orange-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  {isConnected ? 'Live' : 'Offline'}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  {mode === 'local' ? '📁 Local' : '☁️ Online'}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Canvas: {canvas.width}×{canvas.height}
            </div>
            <div className="text-sm text-gray-500">
              Layers: {activeCanvasLayers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Center - Canvas Area (Full width when no tools) */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Container */}
          <div className="flex-1 bg-gray-200 p-4 overflow-auto">
            <div className="flex items-center justify-center min-h-full">
              <CanvasRenderer
                canvas={canvas}
                selectedLayer={null} // No selection in view mode
                className="shadow-lg"
                zoomLevel={100}
                maxWidth={1200}
                maxHeight={600}
                onCanvasRef={(ref) => {
                  if (canvasRef.current !== ref) {
                    canvasRef.current = ref;
                    onCanvasRef(ref);
                  }
                }}
              />
            </div>
          </div>

          {/* Bottom Info Panel */}
          <div className="bg-gray-100 border-t border-gray-300 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Canvas Info:</span> {canvas.width}×{canvas.height} pixels
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Background:</span>
                {canvas.bg.type === 'image' ? (
                  <span className="ml-2">🖼️ Image Background</span>
                ) : (
                  <>
                    <span
                      className="inline-block w-4 h-4 ml-2 border border-gray-300 rounded"
                      style={{ backgroundColor: canvas.bg.color }}
                    />
                    {canvas.bg.color}
                  </>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Layers:</span> {activeCanvasLayers.length}
              </div>
            </div>
            
            {/* Layer List for Viewing */}
            {activeCanvasLayers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="text-sm font-medium text-gray-700 mb-2">Layer Stack (top to bottom):</div>
                <div className="flex flex-wrap gap-2">
                  {[...activeCanvasLayers]
                    .sort((a, b) => b.layerOrder - a.layerOrder)
                    .map((layer, index) => (
                      <div
                        key={layer.id}
                        className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-600"
                      >
                        Layer {index + 1} ({layer.getWidth()}×{layer.getHeight()})
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Canvas List (View Only) */}
        <CanvasPanel
          canvases={canvases}
          activeCanvasId={activeCanvasId}
          onCanvasSelect={onCanvasSelect}
          allowCreate={false} // No creation in view mode
          allowDelete={false} // No deletion in view mode
          isCollapsed={isCanvasPanelCollapsed}
          onToggleCollapse={onToggleCanvasPanel}
        />
      </div>
    </div>
  );
};
