'use client';

import React from 'react';

interface CollapsedToolButtonProps {
  icon: string;
  isActive: boolean;
  onClick: () => void;
  title: string;
}

export const CollapsedToolButton: React.FC<CollapsedToolButtonProps> = ({
  icon,
  isActive,
  onClick,
  title,
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded border text-lg transition-colors ${
        isActive
          ? 'bg-blue-500 text-white border-blue-500'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
      title={title}
    >
      {icon}
    </button>
  );
};
