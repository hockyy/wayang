'use client';

import React, { useState } from 'react';
import { MouseMode } from '@/types/core';
import {
  MoveTool,
  PanTool,
  ZoomTool,
  PaintBrushTool,
  TextTool,
  ImageUploadTool,
  ShapeTool,
  CollapsedToolButton,
} from '@/components/tools';
import { ToolSection } from '@/components/ToolSection';

interface ToolPanelProps {
  mouseMode: MouseMode;
  onMouseModeChange: (mode: MouseMode) => void;
  onImageUpload: (file: File) => void;
  isUploading: boolean;
  uploadError?: string | null;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  mouseMode,
  onMouseModeChange,
  onImageUpload,
  isUploading,
  uploadError,
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isCollapsed = false,
  onToggleCollapse,
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

  // Tool configurations for collapsed mode
  const mouseTools = [
    {
      mode: 'move' as const,
      icon: '↔️',
      title: 'Move Tool',
    },
    {
      mode: 'pan' as const,
      icon: '✋',
      title: 'Pan Tool',
    },
    {
      mode: 'zoom' as const,
      icon: '🔍',
      title: 'Zoom Tool',
    },
  ];

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-64'} bg-gray-100 border-r border-gray-300 transition-all duration-300 flex flex-col`}>
      {/* Header with collapse toggle */}
      <div className="p-2 border-b border-gray-300 flex items-center justify-between">
        {!isCollapsed && <h3 className="text-lg font-semibold text-gray-800">Tools</h3>}
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-200 rounded"
          title={isCollapsed ? 'Expand Tools' : 'Collapse Tools'}
        >
          <svg
            className="w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </div>

      <div className={`${isCollapsed ? 'p-1' : 'p-4'} flex flex-col gap-4 flex-1`}>
      
      {/* Mouse Mode Tools */}
      <ToolSection title="Mouse Mode" isCollapsed={isCollapsed}>
        {isCollapsed ? (
          mouseTools.map(tool => (
            <CollapsedToolButton
              key={tool.mode}
              icon={tool.icon}
              isActive={mouseMode === tool.mode}
              onClick={() => onMouseModeChange(tool.mode)}
              title={tool.title}
            />
          ))
        ) : (
          <>
            <MoveTool
              isActive={mouseMode === 'move'}
              onClick={() => onMouseModeChange('move')}
            />
            <PanTool
              isActive={mouseMode === 'pan'}
              onClick={() => onMouseModeChange('pan')}
            />
            <ZoomTool
              isActive={mouseMode === 'zoom'}
              onClick={() => onMouseModeChange('zoom')}
              zoomLevel={zoomLevel}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onZoomReset={onZoomReset}
            />
          </>
        )}
      </ToolSection>

      {!isCollapsed && (
        <>
          {/* Content Tools */}
          <ToolSection title="Content" isCollapsed={isCollapsed}>
            <ImageUploadTool
              onImageUpload={onImageUpload}
              isUploading={isUploading}
              uploadError={uploadError}
            />
          </ToolSection>

          {/* Drawing Tools */}
          <ToolSection title="Drawing" isCollapsed={isCollapsed}>
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
          </ToolSection>
        </>
      )}
      </div>
    </div>
  );
};
