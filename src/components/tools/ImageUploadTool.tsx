'use client';

import React, { useRef, useCallback } from 'react';
import { Tool } from './Tool';

interface ImageUploadToolProps {
  onImageUpload: (file: File) => void;
  isUploading: boolean;
  uploadError?: string | null;
}

export const ImageUploadTool: React.FC<ImageUploadToolProps> = ({
  onImageUpload,
  isUploading,
  uploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onImageUpload]);

  const handleToolClick = useCallback(() => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isUploading]);

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />
      <Tool
        name={isUploading ? "Uploading..." : "Add Image"}
        isDisabled={isUploading}
        icon="🖼️"
        description="Upload and add image layers (JPG, PNG, GIF, WebP)"
        onClick={handleToolClick}
      />
      
      {uploadError && (
        <div className="ml-4 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-600">{uploadError}</p>
        </div>
      )}
      
      <div className="ml-4">
        <p className="text-xs text-gray-500">
          Supports JPG, PNG, GIF, WebP
        </p>
      </div>
    </div>
  );
};
