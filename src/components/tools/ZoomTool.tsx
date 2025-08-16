'use client';

import React, { useCallback, useMemo } from 'react';
import { Tool } from './Tool';

interface ZoomToolProps {
  isActive: boolean;
  onClick: () => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

export const ZoomTool: React.FC<ZoomToolProps> = ({
  isActive,
  onClick,
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}) => {
  const handleZoomIn = useCallback(() => {
    onZoomIn?.();
  }, [onZoomIn]);

  const handleZoomOut = useCallback(() => {
    onZoomOut?.();
  }, [onZoomOut]);

  const handleZoomReset = useCallback(() => {
    onZoomReset?.();
  }, [onZoomReset]);

  const zoomDisplayText = useMemo(() => `${zoomLevel}%`, [zoomLevel]);

  return (
    <div className="space-y-2">
      <Tool
        name="Zoom Tool"
        isActive={isActive}
        onClick={onClick}
        icon="🔍"
        description="Zoom in and out of the canvas"
      />
      
      {/* Zoom Controls - Always show for quick access */}
      <div className="ml-4 space-y-2 p-2 bg-gray-50 rounded border">
        <div className="text-xs text-gray-600 text-center">
          {zoomDisplayText}
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={handleZoomOut}
            className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={handleZoomReset}
            className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            title="Reset Zoom (100%)"
          >
            ⌂
          </button>
          <button
            onClick={handleZoomIn}
            className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            title="Zoom In"
          >
            +
          </button>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Click canvas to zoom
        </div>
      </div>
    </div>
  );
};
