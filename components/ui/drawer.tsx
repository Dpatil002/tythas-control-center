'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'left',
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[size] || 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={`fixed inset-y-0 ${position === 'left' ? 'left-0' : 'right-0'} max-w-full flex z-10`}
      >
        <div className={`w-screen ${sizeClass} bg-surface border-l border-border text-text-primary shadow-2xl flex flex-col animate-in ${position === 'left' ? 'slide-in-from-left' : 'slide-in-from-right'} duration-200`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            {title && <span className="font-display font-semibold text-base text-text-primary">{title}</span>}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors ml-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};
