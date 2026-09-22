'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  // document.body isn't available during SSR, so only portal after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  }[maxWidth] || 'max-w-md';

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/*
        Modal Dialog Box: fixed + transform-centered directly, with its own
        max-height and internal scroll.
      */}
      <div
        className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] sm:w-full ${maxWidthClass} max-h-[85vh] flex flex-col bg-surface border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0 bg-surface rounded-t-xl">
            <div>
              {title && <h3 className="text-base font-semibold text-text-primary font-display">{title}</h3>}
              {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors ml-4 flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </>
  );

  // Render via a portal directly into document.body. This is the actual fix:
  // the modal used to render as a descendant of the app <header>, which has
  // `backdrop-blur-md` (backdrop-filter). Per the CSS spec, filter/backdrop-filter
  // on an ancestor creates a NEW CONTAINING BLOCK for `position: fixed`
  // descendants, so the modal's "fixed" box was being positioned relative to
  // that 56px-tall header bar instead of the real viewport -- which is why it
  // kept getting clipped no matter what centering CSS was used inside the
  // modal itself. Portaling to document.body sidesteps this permanently,
  // regardless of what styling ends up on any future ancestor.
  return createPortal(modalContent, document.body);
};
