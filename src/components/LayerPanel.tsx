'use client';

import React from 'react';
import { Layer, ImageLayer } from '@/types/core';

interface LayerPanelProps {
  layers: Layer[];
  selectedLayer: Layer | null;
  onLayerSelect: (layer: Layer | null) => void;
  onLayerDelete: (layerId: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayer,
  onLayerSelect,
  onLayerDelete,
}) => {
  const getLayerName = (layer: Layer): string => {
    if (layer instanceof ImageLayer) {
      const fileName = layer.srcPath.split('/').pop() || 'Image';
      return fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName;
    }
    return `Layer ${layer.layerOrder}`;
  };

  const getLayerType = (layer: Layer): string => {
    if (layer instanceof ImageLayer) {
      return 'Image';
    }
    return 'Unknown';
  };

  // Sort layers by layer order (highest first for display)
  const sortedLayers = [...layers].sort((a, b) => b.layerOrder - a.layerOrder);

  return (
    <div className="w-64 bg-gray-100 border-l border-gray-300 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Layers</h3>
      
      {sortedLayers.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No layers yet</p>
      ) : (
        <div className="space-y-2">
          {sortedLayers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => onLayerSelect(layer)}
              className={`p-3 rounded border cursor-pointer transition-colors ${
                selectedLayer?.id === layer.id
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {getLayerName(layer)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getLayerType(layer)} • Order: {layer.layerOrder}
                  </div>
                  <div className="text-xs text-gray-400">
                    Size: {layer.getWidth()}×{layer.getHeight()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDelete(layer.id);
                  }}
                  className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Delete layer"
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
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Layer controls */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <p className="text-xs text-gray-500 mb-2">Layer Controls</p>
        <div className="space-y-1">
          <button
            onClick={() => onLayerSelect(null)}
            className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Deselect All
          </button>
        </div>
      </div>
    </div>
  );
};
