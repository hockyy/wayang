import { useState, useCallback } from 'react';
import { ImageLayer, Point } from '@/types/core';

export interface UseImageUploadProps {
  onImageAdded?: (imageLayer: ImageLayer) => void;
  mode?: 'online' | 'local';
}

export interface UseImageUploadReturn {
  uploadImage: (file: File) => Promise<ImageLayer | null>;
  isUploading: boolean;
  uploadError: string | null;
}

export const useImageUpload = ({ onImageAdded, mode = 'local' }: UseImageUploadProps = {}): UseImageUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<ImageLayer | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPG, PNG, GIF, or WebP files.');
      }

      if (mode === 'local') {
        // Local mode: Use file path for better performance
        const objectUrl = URL.createObjectURL(file);
        
        // Load the image to get dimensions
        const img = new Image();
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              // Create ImageLayer with reasonable size (scale down large images)
              const maxSize = 400; // Maximum width or height for new layers
              let layerWidth = img.naturalWidth;
              let layerHeight = img.naturalHeight;
              
              // Scale down if too large
              if (layerWidth > maxSize || layerHeight > maxSize) {
                const scale = Math.min(maxSize / layerWidth, maxSize / layerHeight);
                layerWidth = layerWidth * scale;
                layerHeight = layerHeight * scale;
              }
              
              const imageLayer = new ImageLayer(
                new Point(50, 50), // Default position
                new Point(50 + layerWidth, 50 + layerHeight),
                Date.now(), // Use timestamp as layer order
                img.naturalWidth, // Keep original dimensions for aspect ratio
                img.naturalHeight,
                objectUrl, // Use blob URL for local mode
                file.type, // mimeType
                file.type === 'image/gif' // isAnimated
              );
              
              onImageAdded?.(imageLayer);
              resolve(imageLayer);
            } catch (error) {
              reject(error);
            } finally {
              setIsUploading(false);
            }
          };

          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
            setIsUploading(false);
          };

          img.src = objectUrl;
        });
      } else {
        // Online mode: Convert to base64 for persistence across tabs
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = () => {
            const dataUrl = reader.result as string;
            
            // Load the image to get dimensions
            const img = new Image();
            
            img.onload = () => {
              try {
                // Create ImageLayer with reasonable size (scale down large images)
                const maxSize = 400; // Maximum width or height for new layers
                let layerWidth = img.naturalWidth;
                let layerHeight = img.naturalHeight;
                
                // Scale down if too large
                if (layerWidth > maxSize || layerHeight > maxSize) {
                  const scale = Math.min(maxSize / layerWidth, maxSize / layerHeight);
                  layerWidth = layerWidth * scale;
                  layerHeight = layerHeight * scale;
                }
                
                const imageLayer = new ImageLayer(
                  new Point(50, 50), // Default position
                  new Point(50 + layerWidth, 50 + layerHeight),
                  Date.now(), // Use timestamp as layer order
                  img.naturalWidth, // Keep original dimensions for aspect ratio
                  img.naturalHeight,
                  dataUrl, // Use data URL for online mode
                  file.type, // mimeType
                  file.type === 'image/gif' // isAnimated
                );
                
                onImageAdded?.(imageLayer);
                resolve(imageLayer);
              } catch (error) {
                reject(error);
              } finally {
                setIsUploading(false);
              }
            };

            img.onerror = () => {
              reject(new Error('Failed to load image'));
              setIsUploading(false);
            };

            img.src = dataUrl;
          };

          reader.onerror = () => {
            reject(new Error('Failed to read file'));
            setIsUploading(false);
          };

          reader.readAsDataURL(file);
        });
      }

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsUploading(false);
      return null;
    }
  }, [onImageAdded]);

  return {
    uploadImage,
    isUploading,
    uploadError,
  };
};
