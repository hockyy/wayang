'use client';

import React, { useCallback } from 'react';
import { Tool } from './Tool';

interface PaintBrushToolProps {
  isActive?: boolean;
  onClick?: () => void;
  isDisabled?: boolean;
  brushSize?: number;
  onBrushSizeChange?: (size: number) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  color?: string;
  onColorChange?: (color: string) => void;
}

export const PaintBrushTool: React.FC<PaintBrushToolProps> = ({
  isActive = false,
  onClick,
  isDisabled = true,
  brushSize = 10,
  onBrushSizeChange,
  opacity = 100,
  onOpacityChange,
  color = '#000000',
  onColorChange,
}) => {
  const handleBrushSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onBrushSizeChange?.(parseInt(e.target.value));
  }, [onBrushSizeChange]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onOpacityChange?.(parseInt(e.target.value));
  }, [onOpacityChange]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange?.(e.target.value);
  }, [onColorChange]);

  return (
    <div className="space-y-2">
      <Tool
        name="Paint Brush"
        isActive={isActive}
        isDisabled={isDisabled}
        onClick={onClick}
        icon="🖌️"
        description={isDisabled ? "Coming soon - Paint with brush strokes" : "Paint with brush strokes"}
      />
      
      {/* Brush Controls - Only show if tool is active and not disabled */}
      {isActive && !isDisabled && (
        <div className="ml-4 space-y-2 p-2 bg-gray-50 rounded border">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Brush Size</label>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={handleBrushSizeChange}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{brushSize}px</span>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Opacity</label>
            <input
              type="range"
              min="1"
              max="100"
              value={opacity}
              onChange={handleOpacityChange}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{opacity}%</span>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={handleColorChange}
              className="w-full h-6 border border-gray-300 rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
