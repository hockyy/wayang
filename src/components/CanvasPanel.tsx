'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Canvas, BackgroundConfig } from '@/types/core';
import { ConfirmDialog } from './ConfirmDialog';

interface CanvasPanelProps {
  canvases: Canvas[];
  activeCanvasId: string | null;
  onCanvasSelect: (canvasId: string) => void;
  onCanvasCreate?: (width: number, height: number, bg: BackgroundConfig) => void;
  onCanvasCreateFromImage?: (file: File) => Promise<void>;
  onCanvasDelete?: (canvasId: string) => void;
  allowCreate?: boolean;
  allowDelete?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CanvasPanel: React.FC<CanvasPanelProps> = ({
  canvases,
  activeCanvasId,
  onCanvasSelect,
  onCanvasCreate,
  onCanvasCreateFromImage,
  onCanvasDelete,
  allowCreate = false,
  allowDelete = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createMode, setCreateMode] = useState<'blank' | 'image'>('blank');
  const [newCanvasWidth, setNewCanvasWidth] = useState<number>(800);
  const [newCanvasHeight, setNewCanvasHeight] = useState<number>(600);
  const [newCanvasBgColor, setNewCanvasBgColor] = useState<string>('#ffffff');
  const [isCreatingFromImage, setIsCreatingFromImage] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; canvasId: string; canvasName: string }>({
    isOpen: false,
    canvasId: '',
    canvasName: '',
  });
  
  // Ref for file input to properly reset it
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateCanvas = useCallback(() => {
    if (onCanvasCreate) {
      onCanvasCreate(newCanvasWidth, newCanvasHeight, { type: 'color', color: newCanvasBgColor });
      setShowCreateForm(false);
      // Reset form values
      setNewCanvasWidth(800);
      setNewCanvasHeight(600);
      setNewCanvasBgColor('#ffffff');
      setCreateMode('blank');
    }
  }, [onCanvasCreate, newCanvasWidth, newCanvasHeight, newCanvasBgColor]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onCanvasCreateFromImage) {
      setIsCreatingFromImage(true);
      try {
        await onCanvasCreateFromImage(file);
        setShowCreateForm(false);
        // Reset form values
        setNewCanvasWidth(800);
        setNewCanvasHeight(600);
        setNewCanvasBgColor('#ffffff');
        setCreateMode('blank');
      } catch (error) {
        console.error('Failed to create canvas from image:', error);
        // Could add error state here
      } finally {
        setIsCreatingFromImage(false);
        // Reset the file input properly
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  }, [onCanvasCreateFromImage]);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
    // Reset form values to prevent controlled/uncontrolled issues
    setNewCanvasWidth(800);
    setNewCanvasHeight(600);
    setNewCanvasBgColor('#ffffff');
    setCreateMode('blank');
    setIsCreatingFromImage(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDeleteCanvas = useCallback((canvasId: string, canvasName: string) => {
    setDeleteConfirm({
      isOpen: true,
      canvasId,
      canvasName,
    });
  }, []);

  const confirmDeleteCanvas = useCallback(() => {
    if (onCanvasDelete && deleteConfirm.canvasId) {
      onCanvasDelete(deleteConfirm.canvasId);
    }
    setDeleteConfirm({ isOpen: false, canvasId: '', canvasName: '' });
  }, [onCanvasDelete, deleteConfirm.canvasId]);

  const cancelDeleteCanvas = useCallback(() => {
    setDeleteConfirm({ isOpen: false, canvasId: '', canvasName: '' });
  }, []);

  const sortedCanvases = useMemo(() => {
    // Fallback to simple string comparison if localeCompare is not available
    return canvases.slice().sort((a, b) => {
      if (typeof a.id === 'string' && typeof b.id === 'string' && a.id.localeCompare) {
        return a.id.localeCompare(b.id);
      }
      // fallback: compare as strings
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  }, [canvases]);

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-64'} bg-gray-100 border-l border-gray-300 transition-all duration-300 flex flex-col`}>
      {/* Header with collapse toggle */}
      <div className="p-2 border-b border-gray-300 flex items-center justify-between">
        {!isCollapsed && <h3 className="text-lg font-semibold text-gray-800">Canvases</h3>}
        <div className="flex items-center gap-2">
          {!isCollapsed && allowCreate && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Create new canvas"
            >
              +
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-200 rounded"
            title={isCollapsed ? 'Expand Canvases' : 'Collapse Canvases'}
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
                d={isCollapsed ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={`${isCollapsed ? 'p-1' : 'p-4'} flex-1 overflow-y-auto`}>

      {/* Create Canvas Form */}
      {showCreateForm && allowCreate && (
        <div className="mb-4 p-3 bg-white border border-gray-300 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">New Canvas</h4>
          
          {/* Mode Selection */}
          <div className="mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setCreateMode('blank')}
                className={`flex-1 px-2 py-1 text-xs rounded border ${
                  createMode === 'blank'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Blank Canvas
              </button>
              <button
                onClick={() => setCreateMode('image')}
                className={`flex-1 px-2 py-1 text-xs rounded border ${
                  createMode === 'image'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                From Image
              </button>
            </div>
          </div>

          {createMode === 'blank' ? (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600">Width (px)</label>
                <input
                  type="number"
                  value={newCanvasWidth}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setNewCanvasWidth(800);
                    } else {
                      const numValue = parseInt(value);
                      setNewCanvasWidth(isNaN(numValue) ? 800 : Math.max(100, Math.min(4000, numValue)));
                    }
                  }}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setNewCanvasHeight(600);
                    } else {
                      const numValue = parseInt(value);
                      setNewCanvasHeight(isNaN(numValue) ? 600 : Math.max(100, Math.min(4000, numValue)));
                    }
                  }}
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
                  onChange={(e) => setNewCanvasBgColor(e.target.value || '#ffffff')}
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
                  onClick={handleCancelCreate}
                  className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Background Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isCreatingFromImage}
                  className="w-full text-xs border border-gray-300 rounded p-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Canvas will auto-size to image dimensions
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelCreate}
                  className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  disabled={isCreatingFromImage}
                >
                  Cancel
                </button>
              </div>
              {isCreatingFromImage && (
                <div className="text-xs text-blue-600 text-center">
                  Creating canvas from image...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isCollapsed && (
        <>
          {/* Canvas List */}
          {sortedCanvases.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              {allowCreate ? 'No canvases yet. Click + to create one.' : 'No canvases available.'}
            </p>
          ) : (
            <div className="space-y-2">
              {sortedCanvases.map((canvas, index) => (
            <div
              key={canvas.id}
              className={`p-3 rounded border transition-colors ${
                activeCanvasId === canvas.id
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onCanvasSelect(canvas.id)}
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
                  <div className="flex items-center gap-1 mt-1">
                    {canvas.bg.type === 'image' ? (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        🖼️ Image BG
                      </div>
                    ) : (
                      <>
                        <div
                          className="w-4 h-4 border border-gray-300 rounded"
                          style={{ backgroundColor: canvas.bg.color }}
                          title={`Background: ${canvas.bg.color}`}
                        />
                        <span className="text-xs text-gray-500">Color BG</span>
                      </>
                    )}
                  </div>
                </div>
                
                {allowDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCanvas(canvas.id, `Canvas ${index + 1}`);
                    }}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete canvas"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Collapsed Canvas List - just show active canvas indicator */}
      {isCollapsed && sortedCanvases.length > 0 && (
        <div className="space-y-1">
          {sortedCanvases.map((canvas, index) => (
            <button
              key={canvas.id}
              onClick={() => onCanvasSelect(canvas.id)}
              className={`w-full p-2 rounded border text-xs transition-colors ${
                activeCanvasId === canvas.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={`Canvas ${index + 1} (${canvas.width}×${canvas.height})`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Canvas"
        message={`Are you sure you want to delete "${deleteConfirm.canvasName}"? This action cannot be undone and will permanently remove the canvas and all its layers.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteCanvas}
        onCancel={cancelDeleteCanvas}
        type="danger"
      />
      </div>
    </div>
  );
};
