'use client';

import React from 'react';

export interface ToolProps {
  name: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}

export const Tool: React.FC<ToolProps> = ({
  name,
  isActive = false,
  isDisabled = false,
  onClick,
  icon,
  description,
  children,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full px-3 py-2 text-sm rounded border transition-colors ${
        isDisabled
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300'
          : isActive
          ? 'bg-blue-500 text-white border-blue-500'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
      title={description}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="flex-1 text-left">{name}</span>
        {children}
      </div>
    </button>
  );
};
