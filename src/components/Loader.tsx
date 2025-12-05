'use client';

import { useTheme } from '@/lib/themeContext';
import './loader.css';

export default function Loader() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex min-h-screen items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-zinc-50'}`}>
      <div className="loader" style={{
        color: isDarkMode ? '#e8eaed' : '#2c3e50',
      }}>
        <span className="l">L</span>
        <span className="o">o</span>
        <span className="a">a</span>
        <span className="d">d</span>
        <span className="ispan">i</span>
        <span className="n">n</span>
        <span className="g">g</span>
      </div>
    </div>
  );
}
