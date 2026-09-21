import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'success'
    | 'warning'
    | 'critical'
    | 'info'
    | 'neutral'
    | 'accent'
    | 'SUCCESS'
    | 'WARNING'
    | 'CRITICAL'
    | 'INFO'
    | 'COMPLETED'
    | 'ATTENTION'
    | 'HEALTHY'
    | 'CONNECTED'
    | 'AUDIT_ONLY'
    | 'ANALYZING'
    | 'SYNCING'
    | 'CONNECTION_ERROR'
    | 'DISCONNECTED'
    | 'UNCONNECTED';
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  showDot = false,
  className = '',
  ...props
}) => {
  const normalizedVariant = variant.toLowerCase();

  let styles = 'bg-surface-2 text-text-secondary border-border';
  let dotColor = 'bg-text-tertiary';

  if (
    normalizedVariant === 'success' ||
    normalizedVariant === 'connected' ||
    normalizedVariant === 'healthy'
  ) {
    styles = 'bg-success-soft text-success-text border-transparent';
    dotColor = 'bg-success';
  } else if (
    normalizedVariant === 'warning' ||
    normalizedVariant === 'attention' ||
    normalizedVariant === 'analyzing' ||
    normalizedVariant === 'syncing'
  ) {
    styles = 'bg-warning-soft text-warning-text border-transparent';
    dotColor = 'bg-warning';
  } else if (
    normalizedVariant === 'critical' ||
    normalizedVariant === 'connection_error'
  ) {
    styles = 'bg-critical-soft text-critical-text border-transparent';
    dotColor = 'bg-critical';
  } else if (
    normalizedVariant === 'info' ||
    normalizedVariant === 'audit_only'
  ) {
    styles = 'bg-info-soft text-info-text border-transparent';
    dotColor = 'bg-info';
  } else if (normalizedVariant === 'accent') {
    styles = 'bg-accent-soft text-accent-soft-text border-transparent';
    dotColor = 'bg-accent';
  } else if (
    normalizedVariant === 'disconnected' ||
    normalizedVariant === 'unconnected' ||
    normalizedVariant === 'neutral'
  ) {
    styles = 'bg-surface-2 text-text-tertiary border-border';
    dotColor = 'bg-text-tertiary';
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium gap-1.5',
    md: 'text-xs px-2.5 py-1 font-semibold gap-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeStyles} ${styles} ${className} font-display`}
      {...props}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
};
