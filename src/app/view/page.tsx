'use client';

import React, { useRef } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasRenderer } from '@/components/CanvasRenderer';
import { CanvasPanel } from '@/components/CanvasPanel';

export default function ViewPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    canvases,
    activeCanvas,
    activeCanvasId,
    setActiveCanvas,
  } = useCanvas();

  // No default canvas creation - let users start with empty state

  if (!activeCanvas) {
    return (
      <div className="h-screen flex">
        {/* Center - Empty State */}
        <div className="flex-1 flex items-center justify-center bg-gray-200">
          <div className="text-center">
            <div className="text-6xl mb-4">👁️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Wayang Viewer</h2>
            <p className="text-gray-600 mb-6">No canvases available to view</p>
            <p className="text-sm text-gray-500">Ask a Dalang to create some canvases first</p>
          </div>
        </div>

        {/* Right Sidebar - Canvas List */}
        <CanvasPanel
          canvases={canvases}
          activeCanvasId={activeCanvasId}
          onCanvasSelect={setActiveCanvas}
          allowCreate={false}
          allowDelete={false}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Wayang Viewer</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Viewing Mode - Read Only
            </div>
            <div className="text-sm text-gray-500">
              Canvas: {activeCanvas.width}×{activeCanvas.height}
            </div>
            <div className="text-sm text-gray-500">
              Layers: {activeCanvas.layers.length}
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
                canvas={activeCanvas}
                selectedLayer={null} // No selection in view mode
                className="shadow-lg"
                onCanvasRef={(ref) => {
                  if (canvasRef.current !== ref) {
                    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = ref;
                  }
                }}
              />
            </div>
          </div>

          {/* Bottom Info Panel */}
          <div className="bg-gray-100 border-t border-gray-300 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Canvas Info:</span> {activeCanvas.width}×{activeCanvas.height} pixels
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Background:</span>
                {activeCanvas.bg.type === 'image' ? (
                  <span className="ml-2">🖼️ Image Background</span>
                ) : (
                  <>
                    <span
                      className="inline-block w-4 h-4 ml-2 border border-gray-300 rounded"
                      style={{ backgroundColor: activeCanvas.bg.color }}
                    />
                    {activeCanvas.bg.color}
                  </>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Layers:</span> {activeCanvas.layers.length}
              </div>
            </div>
            
            {/* Layer List for Viewing */}
            {activeCanvas.layers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="text-sm font-medium text-gray-700 mb-2">Layer Stack (top to bottom):</div>
                <div className="flex flex-wrap gap-2">
                  {[...activeCanvas.layers]
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
          onCanvasSelect={setActiveCanvas}
          allowCreate={false} // No creation in view mode
        />
      </div>
    </div>
  );
}
