'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/themeContext';
import Loader from '@/components/Loader';

export default function TaxationPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode, isThemeSwitching, toggleTheme } = useTheme();
  const [currentPage] = useState('taxation');

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'inventory', icon: '📦', label: 'Inventory' },
    { id: 'shopsales', icon: '💰', label: 'ShopSales' },
    { id: 'cashflows', icon: '💵', label: 'CashFlows' },
    { id: 'expenses', icon: '📝', label: 'Expenses' },
    { id: 'taxation', icon: '📋', label: 'BIR-Taxation' },
    { id: 'cuts', icon: '✂️', label: 'Kosiedon Cuts' },
    { id: 'settings', icon: '⚙️', label: 'Account Settings' },
  ];

  useEffect(() => {
    setMounted(true);
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }
        setUser(session.user);
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`} style={{
      '--bg-color': isDarkMode ? '#0f0f1e' : '#fff0f5',
      '--card-bg': isDarkMode ? '#1a1a2e' : '#efe5f0',
      '--text-primary': isDarkMode ? '#e8eaed' : '#2c3e50',
      '--text-secondary': isDarkMode ? '#9aa0a6' : '#7f8c8d',
      '--accent-color': '#ff69b4',
      '--accent-hover': '#ff1493',
      '--border-color': isDarkMode ? '#2d2d44' : '#e1e8ed',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    } as React.CSSProperties & any}>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-64 transition-transform duration-300 z-50 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          backgroundColor: isDarkMode ? '#16162a' : '#ffffff',
          borderRight: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`,
        }}>
        <div className="flex items-center gap-3" style={{ height: '70px', padding: '0 20px', borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`, flexShrink: 0 }}>
          <img src="/Logo.jpg" alt="TelaPhoria Logo" className="w-10 h-10 object-cover rounded-lg" />
          <h2 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
            TelaPhoria
          </h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-5">
          {menuItems.map(item => (
            <a
              key={item.id}
              href={item.id === 'dashboard' ? '/dashboard' : `/${item.id}`}
              className="block w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 border-l-4"
              style={{
                backgroundColor: currentPage === item.id ? (isDarkMode ? '#1f1f38' : '#f8f9fa') : 'transparent',
                color: currentPage === item.id ? (isDarkMode ? '#e8eaed' : '#2c3e50') : isDarkMode ? '#9aa0a6' : '#7f8c8d',
                borderLeft: currentPage === item.id ? `4px solid ${isDarkMode ? '#00d4ff' : '#ff69b4'}` : '4px solid transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#2a2a3e' : '#f0f0f0';
                  e.currentTarget.style.color = isDarkMode ? '#e8eaed' : '#2c3e50';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = isDarkMode ? '#9aa0a6' : '#7f8c8d';
                }
              }}>
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium" style={{ color: 'inherit' }}>{item.label}</span>
            </a>
          ))}
        </nav>

        <div style={{ 
          borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`, 
          backgroundColor: isDarkMode ? '#16162a' : '#ffffff',
          padding: '12px 8px',
          flexShrink: 0
        }}>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all font-medium"
            style={{ 
              color: '#ef4444',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              textAlign: 'left'
            }}>
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen md:ml-64">
        <header className="fixed top-0 right-0 left-0 md:left-64 flex items-center justify-between px-6 md:px-8 z-40" style={{
          height: '70px',
          backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
          borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`,
        }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg transition-all"
              style={{
                backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
              }}>
              <img src="/Logo.jpg" alt="Toggle menu" className="w-6 h-6 object-cover rounded" />
            </button>
          </div>

          <style>{`
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
              onChange={toggleTheme}
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
        </header>

        <div className="flex-1 w-full p-6 md:p-8 overflow-auto" style={{ backgroundColor: isDarkMode ? '#0f0f1e' : '#fff0f5', marginTop: '70px' }}>
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-8" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
              📋 BIR-Taxation
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Income Card */}
              <div 
                className="rounded-2xl p-6 shadow-md"
                style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                    Total Income
                  </h3>
                  <span className="text-2xl">💰</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#10b981' }}>
                  ₱0.00
                </p>
              </div>

              {/* Total Expenses Card */}
              <div 
                className="rounded-2xl p-6 shadow-md"
                style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                    Total Expenses
                  </h3>
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#ef4444' }}>
                  ₱0.00
                </p>
              </div>

              {/* Net Income Card */}
              <div 
                className="rounded-2xl p-6 shadow-md"
                style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                    Net Income
                  </h3>
                  <span className="text-2xl">📈</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#3b82f6' }}>
                  ₱0.00
                </p>
              </div>
            </div>

            {/* Expenses Section */}
            <div 
              className="rounded-2xl p-8 shadow-md"
              style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0' }}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                📝 Expenses
              </h2>

              {/* Empty State */}
              <div className="text-center py-12">
                <p className="text-lg" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                  No expenses recorded yet
                </p>
                <p className="text-sm mt-2" style={{ color: isDarkMode ? '#7f8c8d' : '#999999' }}>
                  Add your business expenses to get started
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
