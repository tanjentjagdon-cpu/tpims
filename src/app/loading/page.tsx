'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/themeContext';

export default function LoadingPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const timer = setTimeout(() => {
      window.location.href = '/login';
    }, 10800);

    return () => clearTimeout(timer);
  }, []);

  const handleThemeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleTheme();
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap');

        :root {
          --bg-color: #fff0f5;
          --static-text-color: #666;
          --animated-text-color: #ff69b4;
          --row-height: 80px;
        }

        .dark-mode {
          --bg-color: #1a1a2e;
          --static-text-color: #b8b8b8;
          --animated-text-color: #7aa6f0;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background-color: var(--bg-color);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          min-height: 100dvh;
          font-family: "Poppins", sans-serif;
          transition: background-color 0.3s ease;
          overflow: hidden;
        }

        .loader {
          font-family: "Poppins", sans-serif;
          font-size: 30px;
          height: var(--row-height);
          width: 100%;
          max-width: 800px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0;
        }

        .col-left, .col-right {
          flex: 0 0 auto;
          height: var(--row-height);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .col-left {
          align-items: flex-end;
          padding-right: 0;
          color: var(--static-text-color);
          font-weight: 500;
          width: 250px;
        }

        .col-right {
          align-items: flex-start;
          padding-left: 0;
          color: var(--animated-text-color);
          font-weight: 700;
          width: 250px;
        }

        .word {
          height: var(--row-height);
          width: 100%;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          white-space: nowrap;
          box-sizing: border-box;
        }

        .col-left .word {
          justify-content: flex-end;
          text-align: right;
          padding-right: 8px;
        }

        .col-right .word {
          justify-content: flex-start;
          text-align: left;
          padding-left: 8px;
        }

        .col-left::after, .col-right::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            var(--bg-color) 0%,
            transparent 25%,
            transparent 75%,
            var(--bg-color) 100%
          );
          z-index: 20;
          pointer-events: none;
        }

        .slide-left {
          animation: leftSequence 10.3s forwards;
        }

        .slide-right {
          animation: rightSequence 10.3s forwards;
        }

        @keyframes leftSequence {
          0%, 38% { transform: translateY(0px); }
          41%, 58% { transform: translateY(-80px); }
          61%, 100% { transform: translateY(-160px); }
        }

        @keyframes rightSequence {
          0%, 9% { transform: translateY(0px); }
          11%, 19% { transform: translateY(-80px); }
          21%, 48% { transform: translateY(-160px); }
          50%, 77% { transform: translateY(-240px); }
          79%, 100% { transform: translateY(-320px); }
        }

        .theme-switch {
          --toggle-size: 20px;
          --container-width: 3.75em;
          --container-height: 1.67em;
          --container-radius: 6.25em;
          --container-light-bg: #3D7EAE;
          --container-night-bg: #1D1F2C;
          --circle-container-diameter: 2.25em;
          --sun-moon-diameter: 1.42em;
          --sun-bg: #ECCA2F;
          --moon-bg: #C4C9D1;
          --spot-color: #959DB1;
          --circle-container-offset: calc((var(--circle-container-diameter) - var(--container-height)) / 2 * -1);
          --stars-color: #fff;
          --clouds-color: #F3FDFF;
          --back-clouds-color: #AACADF;
          --transition: .5s cubic-bezier(0, -0.02, 0.4, 1.25);
          --circle-transition: .3s cubic-bezier(0, -0.02, 0.35, 1.17);
          position: fixed;
          top: 15px;
          right: 15px;
          z-index: 1000;
        }

        .theme-switch, .theme-switch *, .theme-switch *::before, .theme-switch *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-size: var(--toggle-size);
        }

        .theme-switch__container {
          width: var(--container-width);
          height: var(--container-height);
          background-color: var(--container-light-bg);
          border-radius: var(--container-radius);
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0em -0.062em 0.062em rgba(0, 0, 0, 0.25), 0em 0.062em 0.125em rgba(255, 255, 255, 0.94);
          transition: var(--transition);
          position: relative;
        }

        .theme-switch__container::before {
          content: "";
          position: absolute;
          z-index: 1;
          inset: 0;
          box-shadow: 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset, 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset;
          border-radius: var(--container-radius)
        }

        .theme-switch__checkbox {
          display: none;
        }

        .theme-switch__circle-container {
          width: var(--circle-container-diameter);
          height: var(--circle-container-diameter);
          background-color: rgba(255, 255, 255, 0.1);
          position: absolute;
          left: var(--circle-container-offset);
          top: var(--circle-container-offset);
          border-radius: var(--container-radius);
          box-shadow: inset 0 0 0 2.25em rgba(255, 255, 255, 0.1), inset 0 0 0 2.25em rgba(255, 255, 255, 0.1), 0 0 0 0.42em rgba(255, 255, 255, 0.1), 0 0 0 0.83em rgba(255, 255, 255, 0.1);
          display: flex;
          transition: var(--circle-transition);
          pointer-events: none;
        }

        .theme-switch__sun-moon-container {
          pointer-events: auto;
          position: relative;
          z-index: 2;
          width: var(--sun-moon-diameter);
          height: var(--sun-moon-diameter);
          margin: auto;
          border-radius: var(--container-radius);
          background-color: var(--sun-bg);
          box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.61) inset, 0em -0.062em 0.062em 0em #a1872a inset;
          filter: drop-shadow(0.062em 0.125em 0.125em rgba(0, 0, 0, 0.25)) drop-shadow(0em 0.062em 0.125em rgba(0, 0, 0, 0.25));
          overflow: hidden;
          transition: var(--transition);
        }

        .theme-switch__moon {
          transform: translateX(100%);
          width: 100%;
          height: 100%;
          background-color: var(--moon-bg);
          border-radius: inherit;
          box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.61) inset, 0em -0.062em 0.062em 0em #969696 inset;
          transition: var(--transition);
          position: relative;
        }

        .theme-switch__spot {
          position: absolute;
          top: 0.5em;
          left: 0.21em;
          width: 0.5em;
          height: 0.5em;
          border-radius: var(--container-radius);
          background-color: var(--spot-color);
          box-shadow: 0em 0.021em 0.042em rgba(0, 0, 0, 0.25) inset;
        }

        .theme-switch__spot:nth-of-type(2) {
          width: 0.25em;
          height: 0.25em;
          top: 0.62em;
          left: 0.92em;
        }

        .theme-switch__spot:nth-last-of-type(3) {
          width: 0.17em;
          height: 0.17em;
          top: 0.21em;
          left: 0.54em;
        }

        .theme-switch__clouds {
          width: 0.83em;
          height: 0.83em;
          background-color: var(--clouds-color);
          border-radius: var(--container-radius);
          position: absolute;
          bottom: -0.42em;
          left: 0.21em;
          box-shadow: 0.62em 0.21em var(--clouds-color), -0.21em -0.21em var(--back-clouds-color), 0.96em 0.25em var(--clouds-color), 0.33em -0.08em var(--back-clouds-color), 1.46em 0 var(--clouds-color), 0.83em -0.04em var(--back-clouds-color), 1.96em 0.21em var(--clouds-color), 1.33em -0.21em var(--back-clouds-color), 2.42em -0.04em var(--clouds-color), 1.75em 0em var(--back-clouds-color), 3em -0.21em var(--clouds-color), 2.25em -0.29em var(--back-clouds-color), 3.08em -1.17em 0 0.29em var(--clouds-color), 2.67em -0.42em var(--back-clouds-color), 2.75em -1.42em 0 0.29em var(--back-clouds-color);
          transition: 0.5s cubic-bezier(0, -0.02, 0.4, 1.25);
        }

        .theme-switch__stars-container {
          position: absolute;
          color: var(--stars-color);
          top: -100%;
          left: 0.21em;
          width: 1.83em;
          height: auto;
          font-size: 0.7em;
          transition: var(--transition);
        }

        .theme-switch__checkbox:checked + .theme-switch__container {
          background-color: var(--container-night-bg);
        }

        .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container {
          left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter));
        }

        .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__moon {
          transform: translate(0);
        }

        .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__clouds {
          bottom: -2.71em;
        }

        .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__stars-container {
          top: 50%;
          transform: translateY(-50%);
        }
      `}</style>

      <label className="theme-switch">
        <input 
          type="checkbox" 
          className="theme-switch__checkbox" 
          onChange={handleThemeToggle}
          checked={isDarkMode}
        />
        <div className="theme-switch__container">
          <div className="theme-switch__circle-container">
            <div className="theme-switch__sun-moon-container">
              <div className="theme-switch__moon">
                <div className="theme-switch__spot"></div>
                <div className="theme-switch__spot"></div>
                <div className="theme-switch__spot"></div>
              </div>
            </div>
          </div>
          <div className="theme-switch__clouds"></div>
          <div className="theme-switch__stars-container">★★★</div>
        </div>
      </label>

      <div className="loader">
        <div className="col-left">
          <div className="slide-left">
            <div className="word">Powered by</div>
            <div className="word">Developed by</div>
            <div className="word">Secured by</div>
          </div>
        </div>

        <div className="col-right">
          <div className="slide-right">
            <div className="word">Labandero</div>
            <div className="word">ni</div>
            <div className="word">Kosiedon</div>
            <div className="word">Tanjent</div>
            <div className="word">Gab&Cosyne</div>
          </div>
        </div>
      </div>
    </>
  );
}
