'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/themeContext';
import Button from '@/components/Button';

export default function WelcomePage() {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleGetStarted = () => {
    window.location.href = '/loading';
  };

  const handleThemeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleTheme();
  };

  

  return (
    <>
      <style>{`
        :root {
          --bg-color: #fff0f5;
          --text-primary: #333;
          --text-secondary: #666;
          --accent-color: #ff69b4;
        }

        body.dark-mode {
          --bg-color: #bad2f2;
          --text-primary: #e0e0e0;
          --text-secondary: #b0b0b0;
          --accent-color: #7aa6f0;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          height: 100%;
          overflow: hidden;
          position: fixed;
          width: 100%;
        }

        body {
          font-family: "Poppins", sans-serif;
          background-color: var(--bg-color);
          transition: background-color 0.3s ease;
          margin: 0;
          padding: 0;
          overflow: hidden;
          height: 100%;
          position: fixed;
          width: 100%;
          overscroll-behavior: none;
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

        .loader {
          width: 180px;
          height: 225px;
          background-color: #fff;
          background-repeat: no-repeat;
          background-image: linear-gradient(#ffb6c1 50%, #ff69b4 51%),
            linear-gradient(#ffb6c1, #ffb6c1), linear-gradient(#ffb6c1, #ffb6c1),
            radial-gradient(ellipse at center, #ff69b4 25%, #ffb6c1 26%, #ffb6c1 50%, #0000 55%),
            radial-gradient(ellipse at center, #ff69b4 25%, #ffb6c1 26%, #ffb6c1 50%, #0000 55%),
            radial-gradient(ellipse at center, #ff69b4 25%, #ffb6c1 26%, #ffb6c1 50%, #0000 55%);
          background-position: 0 30px, 67.5px 0, 12px 9px, 82.5px 4.5px, 112.5px 4.5px, 142.5px 4.5px;
          background-size: 100% 6px, 1.5px 34.5px, 45px 12px, 22.5px 22.5px, 22.5px 22.5px, 22.5px 22.5px;
          position: relative;
          border-radius: 6%;
          animation: shake 3s ease-in-out infinite;
          transform-origin: 90px 270px;
          margin: 0 auto 40px auto;
          transition: all 0.3s ease;
        }

        .loader:before {
          content: "";
          position: absolute;
          left: 7.5px;
          top: 100%;
          width: 10.5px;
          height: 7.5px;
          background: #ff69b4;
          border-radius: 0 0 6px 6px;
          box-shadow: 153px 0 #ff69b4;
          transition: all 0.3s ease;
        }

        .loader:after {
          content: "";
          position: absolute;
          width: 142.5px;
          height: 142.5px;
          left: 0;
          right: 0;
          margin: auto;
          bottom: 30px;
          background-color: #ffd1dc;
          background-image: linear-gradient( to right, #0004 0%, #0004 49%, #0000 50%, #0000 100% ),
            linear-gradient(135deg, #ff69b4 50%, #ff1493 51%);
          background-size: 45px 100%, 135px 120px;
          border-radius: 50%;
          background-repeat: repeat, no-repeat;
          background-position: 0 0;
          box-sizing: border-box;
          border: 15px solid #ffb6c1;
          box-shadow: 0 0 0 6px #ff69b4 inset, 0 0 9px 9px #0004 inset;
          animation: spin 3s ease-in-out infinite;
          transition: all 0.3s ease;
        }

        @keyframes spin {
          0% { transform: rotate(0deg) }
          50% { transform: rotate(360deg) }
          75% { transform: rotate(750deg) }
          100% { transform: rotate(1800deg) }
        }

        @keyframes shake {
          65%, 80%, 88%, 96% { transform: rotate(0.5deg) }
          50%, 75%, 84%, 92% { transform: rotate(-0.5deg) }
          0%, 50%, 100% { transform: rotate(0) }
        }

        .button {
          position: relative;
          padding: 12px 32px;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          background-color: #fff;
          border: none;
          border-radius: 50px;
          overflow: hidden;
          z-index: 1;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          display: block;
          margin: 0 auto;
        }

        .button:hover {
          transform: scale(1.05);
          color: #000;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .button:active {
          transform: scale(0.9);
        }

        .button::before {
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

        .button::after {
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

        .button:hover::before {
          right: 100%;
        }

        .button:hover::after {
          left: 0;
        }

        .welcome-text {
          text-align: center;
          margin-bottom: 30px;
          color: var(--text-primary);
        }

        .welcome-text h1 {
          font-size: 2.3rem;
          font-weight: 800;
          margin-bottom: 15px;
          color: #ff69b4;
          text-shadow: 0 3px 6px rgba(255, 105, 180, 0.3);
          letter-spacing: -1px;
          transition: color 0.3s ease, text-shadow 0.3s ease;
        }

        body.dark-mode .welcome-text h1 {
          color: #7aa6f0;
          text-shadow: 0 3px 6px rgba(122, 166, 240, 0.3);
        }

        .center-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          background-color: #fff0f5;
          transition: all 0.3s ease;
          overflow: hidden;
          position: fixed;
          top: 0;
          left: 0;
        }

        body.dark-mode {
          background-color: #bad2f2;
        }

        body.dark-mode .center-container {
          background-color: #bad2f2;
        }

        body.dark-mode .loader {
          background-color: #e3edff;
          background-image: linear-gradient(#a8c6f0 50%, #7aa6f0 51%),
            linear-gradient(#a8c6f0, #a8c6f0), linear-gradient(#a8c6f0, #a8c6f0),
            radial-gradient(ellipse at center, #5d93e8 25%, #7aa6f0 26%, #7aa6f0 50%, #0000 55%),
            radial-gradient(ellipse at center, #5d93e8 25%, #7aa6f0 26%, #7aa6f0 50%, #0000 55%),
            radial-gradient(ellipse at center, #5d93e8 25%, #7aa6f0 26%, #7aa6f0 50%, #0000 55%);
        }

        body.dark-mode .loader:before {
          background: #5d93e8;
          box-shadow: 153px 0 #5d93e8;
        }

        body.dark-mode .loader:after {
          background-color: #b3d4fc;
          background-image: linear-gradient( to right, #0004 0%, #0004 49%, #0000 50%, #0000 100% ),
            linear-gradient(135deg, #5d93e8 50%, #4a7bd8 51%);
          border: 15px solid #a8c6f0;
          box-shadow: 0 0 0 6px #5d93e8 inset, 0 0 9px 9px #0004 inset;
        }

        body.dark-mode .button {
          background-color: #7aa6f0;
          color: #fff;
          box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2);
        }

        body.dark-mode .button:hover {
          color: #fff;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        body.dark-mode .button::before {
          background: linear-gradient(to right, #5d93e8, #4a7bd8);
        }

        body.dark-mode .button::after {
          background: linear-gradient(to right, #7aa6f0, #5d93e8);
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

      <div className="center-container">
        <div className="welcome-text">
          <h1>Welcome To</h1>
          <h1>TelaPhoria Inventory</h1>
          <h1>Management System</h1>
        </div>
        <div className="loader"></div>
        <Button onClick={handleGetStarted}>Get Started</Button>
      </div>
    </>
  );
}
