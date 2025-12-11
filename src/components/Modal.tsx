'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  contentClassName?: string;
  style?: React.CSSProperties;
  durationMs?: number;
}

export default function Modal({ isOpen, onClose, children, contentClassName, style, durationMs = 500 }: ModalProps) {
  const [visible, setVisible] = useState(isOpen);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setExiting(false);
    } else if (visible) {
      setExiting(true);
      const t = setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, durationMs);
      return () => clearTimeout(t);
    }
  }, [isOpen, visible, durationMs]);

  if (!visible) return null;

  return createPortal(
    <div className={`modal-overlay ${exiting ? 'modal-overlay--leave' : 'modal-overlay--enter'}`} onClick={onClose}>
      <div
        className={`modal-content ${contentClassName ?? ''} ${exiting ? 'modal-content--leave' : 'modal-content--enter'}`}
        onClick={(e) => e.stopPropagation()}
        style={style}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
