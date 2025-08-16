'use client';

import React from 'react';

interface ToolSectionProps {
  title: string;
  isCollapsed: boolean;
  children: React.ReactNode;
}

export const ToolSection: React.FC<ToolSectionProps> = ({
  title,
  isCollapsed,
  children,
}) => {
  return (
    <div className="space-y-2">
      {!isCollapsed && <h4 className="text-sm font-medium text-gray-700">{title}</h4>}
      <div className={`flex ${isCollapsed ? 'flex-col gap-1' : 'flex-col gap-2'}`}>
        {children}
      </div>
    </div>
  );
};
