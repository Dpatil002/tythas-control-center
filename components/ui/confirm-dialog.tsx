'use client';

import React from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center">
        {isDestructive && (
          <div className="w-12 h-12 rounded-full bg-critical-soft text-critical flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
        )}
        <h3 className="text-base font-semibold text-text-primary font-display mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-6">{description}</p>
        <div className="flex items-center gap-3 w-full justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
