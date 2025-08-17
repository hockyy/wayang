import { useState, useCallback } from 'react';

export interface UseCanvasWorkspaceProps {
  createCanvasFromImage: (file: File) => Promise<unknown>;
}

export interface UseCanvasWorkspaceReturn {
  // UI State
  zoomLevel: number;
  isToolPanelCollapsed: boolean;
  isCanvasPanelCollapsed: boolean;
  
  // Zoom controls
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  
  // Panel controls  
  toggleToolPanel: () => void;
  toggleCanvasPanel: () => void;
  
  // Canvas operations
  handleCreateCanvasFromImage: (file: File) => Promise<void>;
}

/**
 * Hook to manage canvas workspace state and operations
 */
export const useCanvasWorkspace = ({
  createCanvasFromImage,
}: UseCanvasWorkspaceProps): UseCanvasWorkspaceReturn => {
  
  // UI State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isToolPanelCollapsed, setIsToolPanelCollapsed] = useState(false);
  const [isCanvasPanelCollapsed, setIsCanvasPanelCollapsed] = useState(false);

  // Zoom functionality
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  // Panel controls
  const toggleToolPanel = useCallback(() => {
    setIsToolPanelCollapsed(prev => !prev);
  }, []);

  const toggleCanvasPanel = useCallback(() => {
    setIsCanvasPanelCollapsed(prev => !prev);
  }, []);

  // Canvas operations
  const handleCreateCanvasFromImage = useCallback(async (file: File) => {
    try {
      await createCanvasFromImage(file);
    } catch (error) {
      console.error('Failed to create canvas from image:', error);
      throw error; // Re-throw to let the component handle error display
    }
  }, [createCanvasFromImage]);

  return {
    zoomLevel,
    isToolPanelCollapsed,
    isCanvasPanelCollapsed,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    toggleToolPanel,
    toggleCanvasPanel,
    handleCreateCanvasFromImage,
  };
};
