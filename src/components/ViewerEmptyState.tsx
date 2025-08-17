'use client';

import React from 'react';
import { Canvas } from '@/types/core';
import { CanvasPanel } from './CanvasPanel';

export interface ViewerEmptyStateProps {
  // Canvas data
  canvases: Canvas[];
  activeCanvasId: string | null;
  isConnected: boolean;
  isCanvasPanelCollapsed: boolean;
  
  // Event handlers
  onCanvasSelect: (canvasId: string) => void;
  onToggleCanvasPanel: () => void;
}

/**
 * Empty state component for the viewer when no canvas is active
 */
export const ViewerEmptyState: React.FC<ViewerEmptyStateProps> = ({
  canvases,
  activeCanvasId,
  isConnected,
  isCanvasPanelCollapsed,
  onCanvasSelect,
  onToggleCanvasPanel,
}) => {
  return (
    <div className="h-screen flex">
      {/* Center - Empty State */}
      <div className="flex-1 flex items-center justify-center bg-gray-200">
        <div className="text-center">
          <div className="text-6xl mb-4">👁️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Wayang Viewer</h2>
          <p className="text-gray-600 mb-6">No canvases available to view</p>
          <p className="text-sm text-gray-500">Ask a Dalang to create some canvases first</p>
          <div className={`mt-4 text-sm flex items-center justify-center gap-2 ${isConnected ? 'text-green-600' : 'text-orange-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            {isConnected ? 'Connected to Dalang' : 'Waiting for connection...'}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Canvas List */}
      <CanvasPanel
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onCanvasSelect={onCanvasSelect}
        allowCreate={false}
        allowDelete={false}
        isCollapsed={isCanvasPanelCollapsed}
        onToggleCollapse={onToggleCanvasPanel}
      />
    </div>
  );
};
