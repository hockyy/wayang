'use client';

import React from 'react';
import { Tool } from './Tool';

interface MoveToolProps {
  isActive: boolean;
  onClick: () => void;
}

export const MoveTool: React.FC<MoveToolProps> = ({ isActive, onClick }) => {
  return (
    <Tool
      name="Move Tool"
      isActive={isActive}
      onClick={onClick}
      icon="↔️"
      description="Select and move layers around the canvas"
    />
  );
};
