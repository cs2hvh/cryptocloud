"use client";

import { useState } from "react";
import { Button } from "./button";
import { FaExclamationTriangle, FaQuestion } from "react-icons/fa";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <FaExclamationTriangle className="h-6 w-6 text-red-400" />,
      confirmButton: "bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40"
    },
    warning: {
      icon: <FaExclamationTriangle className="h-6 w-6 text-yellow-400" />,
      confirmButton: "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/40"
    },
    info: {
      icon: <FaQuestion className="h-6 w-6 text-blue-400" />,
      confirmButton: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40"
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-neutral-900 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          {style.icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <p className="text-white/70 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-white/80 hover:text-white"
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={style.confirmButton}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook for easier usage
export function useConfirmation() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: ""
  });

  const confirm = (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
  }) => {
    setState({
      isOpen: true,
      ...options
    });
  };

  const close = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    state.onConfirm?.();
    close();
  };

  return {
    confirm,
    close,
    ConfirmationDialog: () => (
      <ConfirmationDialog
        isOpen={state.isOpen}
        onClose={close}
        onConfirm={handleConfirm}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
      />
    )
  };
}