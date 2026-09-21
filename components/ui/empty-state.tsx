import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-surface border border-border border-dashed rounded-lg ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-text-secondary mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-text-primary font-display">{title}</h4>
      <p className="text-sm text-text-secondary max-w-sm mt-1 mb-4">{description}</p>
      {action ? (
        <div>{action}</div>
      ) : actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};
