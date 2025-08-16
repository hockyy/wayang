'use client';

import React, { useCallback, useMemo } from 'react';
import { Tool } from './Tool';

interface ShapeToolProps {
  isActive?: boolean;
  onClick?: () => void;
  isDisabled?: boolean;
  selectedShape?: 'rectangle' | 'circle' | 'triangle' | 'line';
  onShapeChange?: (shape: 'rectangle' | 'circle' | 'triangle' | 'line') => void;
  fillColor?: string;
  onFillColorChange?: (color: string) => void;
  strokeColor?: string;
  onStrokeColorChange?: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
}

export const ShapeTool: React.FC<ShapeToolProps> = ({
  isActive = false,
  onClick,
  isDisabled = true,
  selectedShape = 'rectangle',
  onShapeChange,
  fillColor = '#ffffff',
  onFillColorChange,
  strokeColor = '#000000',
  onStrokeColorChange,
  strokeWidth = 2,
  onStrokeWidthChange,
}) => {
  const shapes = useMemo(() => [
    { value: 'rectangle', label: 'Rectangle', icon: '⬜' },
    { value: 'circle', label: 'Circle', icon: '⭕' },
    { value: 'triangle', label: 'Triangle', icon: '🔺' },
    { value: 'line', label: 'Line', icon: '📏' },
  ] as const, []);

  const handleShapeChange = useCallback((shape: 'rectangle' | 'circle' | 'triangle' | 'line') => {
    onShapeChange?.(shape);
  }, [onShapeChange]);

  const handleFillColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFillColorChange?.(e.target.value);
  }, [onFillColorChange]);

  const handleStrokeColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onStrokeColorChange?.(e.target.value);
  }, [onStrokeColorChange]);

  const handleStrokeWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onStrokeWidthChange?.(parseInt(e.target.value));
  }, [onStrokeWidthChange]);

  return (
    <div className="space-y-2">
      <Tool
        name="Shape Tool"
        isActive={isActive}
        isDisabled={isDisabled}
        onClick={onClick}
        icon="🔷"
        description={isDisabled ? "Coming soon - Draw geometric shapes" : "Draw geometric shapes"}
      />
      
      {/* Shape Controls - Only show if tool is active and not disabled */}
      {isActive && !isDisabled && (
        <div className="ml-4 space-y-2 p-2 bg-gray-50 rounded border">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Shape Type</label>
            <div className="grid grid-cols-2 gap-1">
              {shapes.map(shape => (
                <button
                  key={shape.value}
                  onClick={() => handleShapeChange(shape.value)}
                  className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${
                    selectedShape === shape.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>{shape.icon}</span>
                  <span className="truncate">{shape.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fill Color</label>
            <input
              type="color"
              value={fillColor}
              onChange={handleFillColorChange}
              className="w-full h-6 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Stroke Color</label>
            <input
              type="color"
              value={strokeColor}
              onChange={handleStrokeColorChange}
              className="w-full h-6 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Stroke Width</label>
            <input
              type="range"
              min="0"
              max="10"
              value={strokeWidth}
              onChange={handleStrokeWidthChange}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{strokeWidth}px</span>
          </div>
        </div>
      )}
    </div>
  );
};
