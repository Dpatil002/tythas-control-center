import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`
              block w-full rounded-md border bg-surface text-text-primary text-sm transition-colors duration-150
              placeholder:text-text-tertiary px-3 py-2
              ${leftIcon ? 'pl-9' : ''}
              ${rightIcon ? 'pr-9' : ''}
              ${error ? 'border-critical focus:border-critical focus:ring-critical/20' : 'border-border hover:border-border-strong focus:border-accent focus:ring-accent/20'}
              focus:outline-none focus:ring-2
              disabled:bg-surface-2 disabled:text-text-tertiary disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-critical font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
