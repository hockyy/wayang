'use client';

import React from 'react';
import { Canvas, MouseMode, BackgroundConfig } from '@/types/core';
import { ToolPanel } from './ToolPanel';
import { CanvasPanel } from './CanvasPanel';

export interface EmptyCanvasStateProps {
  // Canvas data
  canvases: Canvas[];
  activeCanvasId: string | null;
  
  // UI state
  zoomLevel: number;
  isToolPanelCollapsed: boolean;
  isCanvasPanelCollapsed: boolean;
  mouseMode: MouseMode;
  
  // Upload state
  isUploading: boolean;
  uploadError: string | null;
  
  // Event handlers
  onMouseModeChange: (mode: MouseMode) => void;
  onImageUpload: (file: File) => Promise<any>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleToolPanel: () => void;
  onToggleCanvasPanel: () => void;
  
  // Canvas management
  onCanvasSelect: (canvasId: string) => void;
  onCanvasCreate: (width: number, height: number, bg: BackgroundConfig) => any;
  onCanvasCreateFromImage: (file: File) => Promise<void>;
  onCanvasDelete: (canvasId: string) => void;
}

/**
 * Empty state component shown when no canvas is active
 */
export const EmptyCanvasState: React.FC<EmptyCanvasStateProps> = ({
  canvases,
  activeCanvasId,
  zoomLevel,
  isToolPanelCollapsed,
  isCanvasPanelCollapsed,
  mouseMode,
  isUploading,
  uploadError,
  onMouseModeChange,
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
}) => {
  return (
    <div className="h-screen flex">
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
  );
};
