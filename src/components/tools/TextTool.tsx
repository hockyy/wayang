'use client';

import React, { useCallback, useMemo } from 'react';
import { Tool } from './Tool';

interface TextToolProps {
  isActive?: boolean;
  onClick?: () => void;
  isDisabled?: boolean;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  fontFamily?: string;
  onFontFamilyChange?: (family: string) => void;
  color?: string;
  onColorChange?: (color: string) => void;
  isBold?: boolean;
  onBoldChange?: (bold: boolean) => void;
  isItalic?: boolean;
  onItalicChange?: (italic: boolean) => void;
}

export const TextTool: React.FC<TextToolProps> = ({
  isActive = false,
  onClick,
  isDisabled = true,
  fontSize = 16,
  onFontSizeChange,
  fontFamily = 'Arial',
  onFontFamilyChange,
  color = '#000000',
  onColorChange,
  isBold = false,
  onBoldChange,
  isItalic = false,
  onItalicChange,
}) => {
  const fontOptions = useMemo(() => [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 
    'Verdana', 'Comic Sans MS', 'Impact', 'Courier New'
  ], []);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFontSizeChange?.(parseInt(e.target.value) || 16);
  }, [onFontSizeChange]);

  const handleFontFamilyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFontFamilyChange?.(e.target.value);
  }, [onFontFamilyChange]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange?.(e.target.value);
  }, [onColorChange]);

  const handleBoldToggle = useCallback(() => {
    onBoldChange?.(!isBold);
  }, [onBoldChange, isBold]);

  const handleItalicToggle = useCallback(() => {
    onItalicChange?.(!isItalic);
  }, [onItalicChange, isItalic]);

  return (
    <div className="space-y-2">
      <Tool
        name="Text Tool"
        isActive={isActive}
        isDisabled={isDisabled}
        onClick={onClick}
        icon="📝"
        description={isDisabled ? "Coming soon - Add text layers" : "Add text layers to the canvas"}
      />
      
      {/* Text Controls - Only show if tool is active and not disabled */}
      {isActive && !isDisabled && (
        <div className="ml-4 space-y-2 p-2 bg-gray-50 rounded border">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Font Family</label>
            <select
              value={fontFamily}
              onChange={handleFontFamilyChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            >
              {fontOptions.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Font Size</label>
            <input
              type="number"
              min="8"
              max="72"
              value={fontSize}
              onChange={handleFontSizeChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
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
          
          <div className="flex gap-2">
            <button
              onClick={handleBoldToggle}
              className={`flex-1 px-2 py-1 text-xs rounded border font-bold ${
                isBold 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              B
            </button>
            <button
              onClick={handleItalicToggle}
              className={`flex-1 px-2 py-1 text-xs rounded border italic ${
                isItalic 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              I
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
