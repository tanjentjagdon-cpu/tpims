'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/themeContext';
import Button from '@/components/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotPasswordAlert, setForgotPasswordAlert] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.log('No active session found');
      }
    };

    checkAuthStatus();
  }, []);

  if (!mounted) {
    return null;
  }

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleThemeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleTheme();
  };

  const handleForgotPassword = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setForgotPasswordAlert('🍌 ASSEMBLE THE MINION SQUAD! PASSWORD RECOVERY MISSION! A-TEAM ACTIVATE: ⚡ GAB ⚡ TANJENT ⚡ COSYNE - THEY KNOW THE SECRET BANANA CODE! WARNING: RAWWWR TREX ON PATROL! 🦖🔍');
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setForgotPasswordAlert('');
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        
        // Auto-dismiss error after 3 seconds
        setTimeout(() => {
          setError('');
        }, 3000);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Oops! Invalid login credentials. Yari ka kay Gab&Cosyne');
        setLoading(false);
        
        // Auto-dismiss error after 3 seconds
        setTimeout(() => {
          setError('');
        }, 3000);
        return;
      }

      if (data.session) {
        setSuccess('Access Granted! by Gab, Jent & Cosy. Ano sabi ng Dinosaur? ErrArrrr. Redirecting you to the dashboard...');
        
        if (remember) {
          localStorage.setItem('rememberUser', email);
        } else {
          localStorage.removeItem('rememberUser');
        }

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --bg-color: #fff0f5;
          --card-bg: #ffffff;
          --text-primary: #333;
          --text-secondary: #666;
          --accent-color: #ff69b4;
          --input-bg: #f5f5f5;
          --input-border: #e0e0e0;
          --input-focus: #ff69b4;
          --shadow: rgba(0, 0, 0, 0.1);
        }

        body.dark-mode {
          --bg-color: #1a1a2e;
          --card-bg: #2d2d44;
          --text-primary: #e0e0e0;
          --text-secondary: #b0b0b0;
          --accent-color: #7aa6f0;
          --input-bg: #3d3d54;
          --input-border: #4d4d64;
          --input-focus: #7aa6f0;
          --shadow: rgba(0, 0, 0, 0.3);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
        }

        body {
          font-family: "Poppins", sans-serif;
          background-color: var(--bg-color);
          transition: background-color 0.3s ease;
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
        }

        .bg-animation {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          bottom: -100px;
          background: var(--accent-color);
          border-radius: 50%;
          opacity: 0.15;
          animation: rise 15s infinite ease-in;
        }

        .bubble:nth-child(1) { width: 40px; height: 40px; left: 10%; animation-duration: 12s; animation-delay: 0s; }
        .bubble:nth-child(2) { width: 60px; height: 60px; left: 25%; animation-duration: 15s; animation-delay: 2s; }
        .bubble:nth-child(3) { width: 50px; height: 50px; left: 40%; animation-duration: 18s; animation-delay: 4s; }
        .bubble:nth-child(4) { width: 70px; height: 70px; left: 60%; animation-duration: 20s; animation-delay: 1s; }
        .bubble:nth-child(5) { width: 45px; height: 45px; left: 75%; animation-duration: 16s; animation-delay: 3s; }
        .bubble:nth-child(6) { width: 55px; height: 55px; left: 90%; animation-duration: 14s; animation-delay: 5s; }

        @keyframes rise {
          0% { bottom: -100px; transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(100px) rotate(180deg); }
          100% { bottom: 110vh; transform: translateX(-100px) rotate(360deg); }
        }

        .login-container {
          width: 100%;
          max-width: 420px;
          background: var(--card-bg);
          border-radius: 20px;
          padding: 40px 35px;
          box-shadow: 0 10px 40px var(--shadow);
          transition: all 0.3s ease;
          position: relative;
          z-index: 10;
          margin: 20px;
        }

        .logo-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 25px;
          animation: floating 3s ease-in-out infinite;
        }

        .logo {
          width: 120px;
          height: 120px;
          background: var(--accent-color);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 48px;
          font-weight: 700;
          color: #fff;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          border: 4px solid var(--accent-color);
        }

        body.dark-mode .logo {
          border: 4px solid var(--accent-color);
        }

        .logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); }
          50% { transform: scale(1.05); box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .login-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: var(--accent-color);
          margin-bottom: 8px;
        }

        .login-header p {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 400;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .form-group input {
          width: 100%;
          padding: 14px 18px;
          font-size: 15px;
          font-family: "Poppins", sans-serif;
          background: var(--input-bg);
          border: 2px solid var(--input-border);
          border-radius: 12px;
          color: var(--text-primary);
          transition: all 0.3s ease;
          outline: none;
        }

        .form-group input:focus {
          border-color: var(--input-focus);
          background: var(--card-bg);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--shadow);
        }

        .form-group input::placeholder {
          color: var(--text-secondary);
          opacity: 0.6;
        }

        .password-wrapper {
          position: relative;
        }

        .password-wrapper input {
          padding-right: 50px;
        }

        .toggle-password {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 18px;
          user-select: none;
          transition: color 0.3s ease;
        }

        .toggle-password:hover {
          color: var(--accent-color);
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          margin-top: -5px;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--text-secondary);
        }

        .remember-me input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent-color);
        }

        .forgot-password {
          color: var(--accent-color);
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.3s ease;
        }

        .forgot-password:hover {
          opacity: 0.8;
        }

        .submit-btn {
          position: relative;
          padding: 12px 32px;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          color: #fff;
          background-color: #fff;
          border: none;
          border-radius: 50px;
          overflow: hidden;
          z-index: 1;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 8px 20px rgba(255, 105, 180, 0.3);
          cursor: pointer;
          display: block;
          margin: 10px auto 0;
          width: 100%;
        }

        .submit-btn::before {
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

        .submit-btn::after {
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

        .submit-btn:hover {
          transform: scale(1.05);
          color: #fff;
          box-shadow: 0 10px 25px rgba(255, 105, 180, 0.4);
        }

        .submit-btn:hover::before {
          right: 100%;
        }

        .submit-btn:hover::after {
          left: 0;
        }

        .submit-btn:active {
          transform: scale(0.9);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        body.dark-mode .submit-btn {
          background-color: #7aa6f0;
          color: #fff;
          box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2);
        }

        body.dark-mode .submit-btn:hover {
          color: #fff;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
          background-color: #7aa6f0;
        }

        body.dark-mode .submit-btn::before {
          background: linear-gradient(to right, #5d93e8, #4a7bd8);
        }

        body.dark-mode .submit-btn::after {
          background: linear-gradient(to right, #7aa6f0, #5d93e8);
        }

        .error-message {
          background: rgba(255, 105, 180, 0.1);
          border: 2px solid #ff69b4;
          border-radius: 12px;
          padding: 15px 20px;
          margin-bottom: 20px;
          color: #ff69b4;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          animation: fadeIn 0.3s ease-in-out;
          box-shadow: 0 4px 12px rgba(255, 105, 180, 0.15);
        }

        .error-message::before {
          content: "⚠️ ";
          margin-right: 8px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100%;
          height: 100%;
          background: var(--bg-color);
          padding: 20px;
          padding-top: 70px;
          overflow-y: auto;
          overflow-x: hidden;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overscroll-behavior: contain;
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
          top: 20px;
          right: 20px;
          z-index: 9999;
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

        body.dark-mode .error-message {
          background: rgba(93, 147, 232, 0.1);
          border-color: #5d93e8;
          color: #5d93e8;
          box-shadow: 0 4px 12px rgba(93, 147, 232, 0.15);
        }

        .success-message {
          background: rgba(76, 175, 80, 0.1);
          border: 2px solid #4CAF50;
          border-radius: 12px;
          padding: 12px 16px;
          color: #2e7d32;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          animation: fadeIn 0.3s ease-in-out;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
          margin-bottom: 16px;
          word-wrap: break-word;
        }

        .success-message::before {
          content: "✓ ";
          margin-right: 8px;
          font-size: 18px;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(-30px);
          }
        }

        body.dark-mode .success-message {
          background: rgba(93, 147, 232, 0.1);
          border-color: #5d93e8;
          color: #4a7bd8;
          box-shadow: 0 4px 12px rgba(93, 147, 232, 0.15);
        }

        .forgot-password-alert {
          background: rgba(255, 105, 180, 0.1);
          border: 2px solid #ff69b4;
          border-radius: 12px;
          padding: 12px 16px;
          color: #ff69b4;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          animation: fadeIn 0.3s ease-in-out;
          box-shadow: 0 4px 12px rgba(255, 105, 180, 0.15);
          margin-bottom: 16px;
          word-wrap: break-word;
        }

        .forgot-password-alert::before {
          content: "ℹ️ ";
          margin-right: 8px;
        }

        body.dark-mode .forgot-password-alert {
          background: rgba(122, 166, 240, 0.1);
          border: 2px solid #7aa6f0;
          color: #4a7bd8;
          box-shadow: 0 4px 12px rgba(122, 166, 240, 0.15);
        }

        @media (max-width: 480px) {
          .login-container { padding: 30px 25px; }
          .logo { width: 100px; height: 100px; font-size: 40px; }
          .login-header h1 { font-size: 28px; }
          .theme-switch { top: 15px; right: 15px; }
          .error-message, .success-message, .forgot-password-alert { padding: 10px 12px; font-size: 13px; }
        }

        @media (max-width: 360px) {
          .login-container { padding: 25px 20px; }
          .logo { width: 80px; height: 80px; font-size: 32px; }
          .form-group input { padding: 12px 16px; font-size: 14px; }
          .submit-btn { padding: 12px; font-size: 15px; }
          .error-message, .success-message, .forgot-password-alert { padding: 8px 10px; font-size: 12px; }
        }
      `}</style>

      

      <div className="bg-animation">
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
      </div>

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

      <div className="login-wrapper">
        <div className="login-container">
          <div className="logo-container">
            <div className="logo">
              <img src="/Logo.jpg" alt="Logo" />
            </div>
          </div>

          <div className="login-header">
            <h1>Welcome Back!</h1>
            <p>Login to continue to Labandero</p>
          </div>

          {forgotPasswordAlert && <div className="forgot-password-alert">{forgotPasswordAlert}</div>}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className="toggle-password" onClick={togglePassword}>
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password" onClick={handleForgotPassword}>
                Forgot Password?
              </a>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              variant="secondary"
              style={{ width: '100%' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
