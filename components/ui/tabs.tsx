'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-border space-x-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 font-display transition-colors
              ${
                isActive
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
              }
            `}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`
                  text-[11px] px-1.5 py-0.2 rounded-full font-mono
                  ${isActive ? 'bg-accent-soft text-accent-soft-text' : 'bg-surface-2 text-text-tertiary'}
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
