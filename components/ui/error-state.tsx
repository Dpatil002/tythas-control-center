import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center bg-critical-soft/50 border border-critical-soft rounded-lg ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-critical-soft flex items-center justify-center text-critical mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-critical-text font-display">{title}</h4>
      <p className="text-xs text-text-secondary max-w-sm mt-1 mb-3">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
