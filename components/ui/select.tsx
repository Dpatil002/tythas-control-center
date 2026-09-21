import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, hint, id, children, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`
            block w-full rounded-md border bg-surface text-text-primary text-sm transition-colors duration-150
            px-3 py-2
            ${error ? 'border-critical focus:border-critical focus:ring-critical/20' : 'border-border hover:border-border-strong focus:border-accent focus:ring-accent/20'}
            focus:outline-none focus:ring-2
            disabled:bg-surface-2 disabled:text-text-tertiary disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-critical font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
