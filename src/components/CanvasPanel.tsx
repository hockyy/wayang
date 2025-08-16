'use client';

import React, { useState } from 'react';
import { Canvas, BackgroundConfig } from '@/types/core';

interface CanvasPanelProps {
  canvases: Canvas[];
  activeCanvasId: string | null;
  onCanvasSelect: (canvasId: string) => void;
  onCanvasCreate?: (width: number, height: number, bg: BackgroundConfig) => void;
  allowCreate?: boolean;
}

export const CanvasPanel: React.FC<CanvasPanelProps> = ({
  canvases,
  activeCanvasId,
  onCanvasSelect,
  onCanvasCreate,
  allowCreate = false,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCanvasWidth, setNewCanvasWidth] = useState(800);
  const [newCanvasHeight, setNewCanvasHeight] = useState(600);
  const [newCanvasBgColor, setNewCanvasBgColor] = useState('#ffffff');

  const handleCreateCanvas = () => {
    if (onCanvasCreate) {
      onCanvasCreate(newCanvasWidth, newCanvasHeight, { color: newCanvasBgColor });
      setShowCreateForm(false);
    }
  };

  return (
    <div className="w-64 bg-gray-100 border-l border-gray-300 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Canvases</h3>
        {allowCreate && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            +
          </button>
        )}
      </div>

      {/* Create Canvas Form */}
      {showCreateForm && allowCreate && (
        <div className="mb-4 p-3 bg-white border border-gray-300 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">New Canvas</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600">Width (px)</label>
              <input
                type="number"
                value={newCanvasWidth}
                onChange={(e) => setNewCanvasWidth(parseInt(e.target.value) || 800)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="100"
                max="4000"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Height (px)</label>
              <input
                type="number"
                value={newCanvasHeight}
                onChange={(e) => setNewCanvasHeight(parseInt(e.target.value) || 600)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="100"
                max="4000"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Background</label>
              <input
                type="color"
                value={newCanvasBgColor}
                onChange={(e) => setNewCanvasBgColor(e.target.value)}
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateCanvas}
                className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas List */}
      {canvases.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          {allowCreate ? 'No canvases yet. Click + to create one.' : 'No canvases available.'}
        </p>
      ) : (
        <div className="space-y-2">
          {canvases.map((canvas, index) => (
            <div
              key={canvas.id}
              onClick={() => onCanvasSelect(canvas.id)}
              className={`p-3 rounded border cursor-pointer transition-colors ${
                activeCanvasId === canvas.id
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">
                Canvas {index + 1}
              </div>
              <div className="text-xs text-gray-500">
                {canvas.width}×{canvas.height}
              </div>
              <div className="text-xs text-gray-400">
                {canvas.layers.length} layer{canvas.layers.length !== 1 ? 's' : ''}
              </div>
              <div
                className="w-4 h-4 mt-1 border border-gray-300 rounded"
                style={{ backgroundColor: canvas.bg.color }}
                title={`Background: ${canvas.bg.color}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
