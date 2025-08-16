'use client';

import React from 'react';
import { Tool } from './Tool';

interface PanToolProps {
  isActive: boolean;
  onClick: () => void;
}

export const PanTool: React.FC<PanToolProps> = ({ isActive, onClick }) => {
  return (
    <Tool
      name="Pan Tool"
      isActive={isActive}
      onClick={onClick}
      icon="✋"
      description="Pan around the canvas viewport"
    />
  );
};
