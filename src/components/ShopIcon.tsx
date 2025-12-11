'use client';

import React from 'react';

interface ShopIconProps {
  platform: 'Shopee' | 'TikTok' | 'Lazada';
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function ShopIcon({ platform, size = 16, color = 'currentColor', className, style }: ShopIconProps) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', xmlns: 'http://www.w3.org/2000/svg', fill: color, className, style } as React.SVGProps<SVGSVGElement>;

  if (platform === 'TikTok') {
    return (
      <svg {...common}>
        <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" />
      </svg>
    );
  }

  if (platform === 'Shopee') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="10" height="9" rx="2" />
        <path d="M5 5a3 3 0 0 1 6 0" fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    );
  }

  if (platform === 'Lazada') {
    return (
      <svg {...common}>
        <path d="M8 14s-5-3.33-5-7a3 3 0 0 1 6 0 3 3 0 0 1 6 0c0 3.67-5 7-5 7z" />
      </svg>
    );
  }

  return null;
}

