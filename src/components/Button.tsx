'use client';

import React from 'react';
import { useTheme } from '@/lib/themeContext';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'primary' | 'secondary';
  form?: string;
}

export default function Button({
  onClick,
  children,
  type = 'button',
  disabled = false,
  className = '',
  style: customStyle = {},
  variant = 'primary',
  form,
}: ButtonProps) {
  const { isDarkMode } = useTheme();

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: isDarkMode ? '#fff' : '#000',
    backgroundColor: isDarkMode ? '#7aa6f0' : '#fff',
    border: 'none',
    borderRadius: '50px',
    overflow: 'hidden',
    zIndex: 1,
    transition: 'all 0.3s ease-in-out',
    boxShadow: isDarkMode ? '0 6px 10px rgba(0, 0, 0, 0.2)' : '0 6px 10px rgba(0, 0, 0, 0.1)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    display: 'inline-block',
    whiteSpace: 'nowrap',
    ...customStyle,
  };

  return (
    <>
      <style>{`
        .button-element::before {
          content: "";
          position: absolute;
          top: 0;
          right: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, #ff6b9d, #ff9999);
          transition: all 0.85s ease-in-out;
          z-index: -1;
          border-radius: 50px;
        }

        .button-element::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, #ffb6c1, #ff69b4);
          transition: all 0.85s ease-in-out;
          z-index: -2;
          border-radius: 50px;
        }

        .button-element:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .button-element:hover::before {
          right: 100%;
        }

        .button-element:hover::after {
          left: 0;
        }

        .button-element:active {
          transform: scale(0.9);
        }

        body.dark-mode .button-element {
          background-color: #7aa6f0;
          color: #fff;
          box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2);
        }

        body.dark-mode .button-element:hover {
          color: #fff;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        body.dark-mode .button-element::before {
          background: linear-gradient(to right, #5d93e8, #4a7bd8);
        }

        body.dark-mode .button-element::after {
          background: linear-gradient(to right, #7aa6f0, #5d93e8);
        }
      `}</style>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`button-element ${className}`}
        style={baseStyle}
        form={form}
      >
        {children}
      </button>
    </>
  );
}
