'use client';

import React, { useState } from 'react';
import { MouseMode } from '@/types/core';
import {
  MoveTool,
  PanTool,
  PaintBrushTool,
  TextTool,
  ImageUploadTool,
  ShapeTool,
} from '@/components/tools';

interface ToolPanelProps {
  mouseMode: MouseMode;
  onMouseModeChange: (mode: MouseMode) => void;
  onImageUpload: (file: File) => void;
  isUploading: boolean;
  uploadError?: string | null;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  mouseMode,
  onMouseModeChange,
  onImageUpload,
  isUploading,
  uploadError,
}) => {
  // State for future tool implementations
  const [activeTool, setActiveTool] = useState<'paint' | 'text' | 'shape' | null>(null);
  const [paintSettings, setPaintSettings] = useState({
    brushSize: 10,
    opacity: 100,
    color: '#000000',
  });
  const [textSettings, setTextSettings] = useState({
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
    isBold: false,
    isItalic: false,
  });
  const [shapeSettings, setShapeSettings] = useState<{
    selectedShape: 'rectangle' | 'circle' | 'triangle' | 'line';
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
  }>({
    selectedShape: 'rectangle',
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
  });

  return (
    <div className="w-64 bg-gray-100 border-r border-gray-300 p-4 flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-800">Tools</h3>
      
      {/* Mouse Mode Tools */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Mouse Mode</h4>
        <div className="flex flex-col gap-2">
          <MoveTool
            isActive={mouseMode === 'move'}
            onClick={() => onMouseModeChange('move')}
          />
          <PanTool
            isActive={mouseMode === 'pan'}
            onClick={() => onMouseModeChange('pan')}
          />
        </div>
      </div>

      {/* Content Tools */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Content</h4>
        <div className="flex flex-col gap-2">
          <ImageUploadTool
            onImageUpload={onImageUpload}
            isUploading={isUploading}
            uploadError={uploadError}
          />
        </div>
      </div>

      {/* Drawing Tools */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Drawing</h4>
        <div className="flex flex-col gap-2">
          <PaintBrushTool
            isActive={activeTool === 'paint'}
            onClick={() => setActiveTool(activeTool === 'paint' ? null : 'paint')}
            isDisabled={true} // Still disabled as per requirements
            brushSize={paintSettings.brushSize}
            onBrushSizeChange={(size) => setPaintSettings(prev => ({ ...prev, brushSize: size }))}
            opacity={paintSettings.opacity}
            onOpacityChange={(opacity) => setPaintSettings(prev => ({ ...prev, opacity }))}
            color={paintSettings.color}
            onColorChange={(color) => setPaintSettings(prev => ({ ...prev, color }))}
          />
          
          <TextTool
            isActive={activeTool === 'text'}
            onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
            isDisabled={true} // Coming soon
            fontSize={textSettings.fontSize}
            onFontSizeChange={(size) => setTextSettings(prev => ({ ...prev, fontSize: size }))}
            fontFamily={textSettings.fontFamily}
            onFontFamilyChange={(family) => setTextSettings(prev => ({ ...prev, fontFamily: family }))}
            color={textSettings.color}
            onColorChange={(color) => setTextSettings(prev => ({ ...prev, color }))}
            isBold={textSettings.isBold}
            onBoldChange={(bold) => setTextSettings(prev => ({ ...prev, isBold: bold }))}
            isItalic={textSettings.isItalic}
            onItalicChange={(italic) => setTextSettings(prev => ({ ...prev, isItalic: italic }))}
          />
          
          <ShapeTool
            isActive={activeTool === 'shape'}
            onClick={() => setActiveTool(activeTool === 'shape' ? null : 'shape')}
            isDisabled={true} // Coming soon
            selectedShape={shapeSettings.selectedShape}
            onShapeChange={(shape) => setShapeSettings(prev => ({ ...prev, selectedShape: shape }))}
            fillColor={shapeSettings.fillColor}
            onFillColorChange={(color) => setShapeSettings(prev => ({ ...prev, fillColor: color }))}
            strokeColor={shapeSettings.strokeColor}
            onStrokeColorChange={(color) => setShapeSettings(prev => ({ ...prev, strokeColor: color }))}
            strokeWidth={shapeSettings.strokeWidth}
            onStrokeWidthChange={(width) => setShapeSettings(prev => ({ ...prev, strokeWidth: width }))}
          />
        </div>
      </div>
    </div>
  );
};
