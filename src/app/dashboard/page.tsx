'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/themeContext';
import Loader from '@/components/Loader';

interface StatCardData {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

interface ActivityItem {
  time: string;
  text: string;
}

interface Sale {
  id: string;
  shop: 'Shopee' | 'TikTok' | 'Lazada';
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  status?: 'Delivered' | 'Processing' | 'Shipped' | 'Cancelled';
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode, isThemeSwitching, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{page: string, icon: string, label: string, matches: string[]}[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Mock sales data - Actual Shopee orders from user
  const [sales] = useState<Sale[]>([
    {
      id: '251030EMXU4GVB',
      shop: 'Shopee',
      productId: '31',
      productName: 'Olive Green-Noraisa',
      quantity: 3,
      unitPrice: 39.00,
      total: 117.00,
      date: new Date('2025-10-30').toISOString(),
      status: 'Delivered',
    },
    {
      id: '251031HVHGQH1T',
      shop: 'Shopee',
      productId: '8',
      productName: 'Lavender',
      quantity: 20,
      unitPrice: 29.00,
      total: 580.00,
      date: new Date('2025-10-31').toISOString(),
      status: 'Delivered',
    },
    {
      id: '251101KMFF9RUE',
      shop: 'Shopee',
      productId: '28',
      productName: 'Errose-Pink',
      quantity: 1,
      unitPrice: 39.00,
      total: 39.00,
      date: new Date('2025-11-01').toISOString(),
      status: 'Delivered',
    },
    {
      id: '251101KVEB53A0',
      shop: 'Shopee',
      productId: '29',
      productName: 'Esther PP-Pink',
      quantity: 4,
      unitPrice: 39.00,
      total: 156.00,
      date: new Date('2025-11-01').toISOString(),
      status: 'Shipped',
    },
    {
      id: '251101M5RR9X6C',
      shop: 'Shopee',
      productId: '12',
      productName: 'Off-White',
      quantity: 5,
      unitPrice: 29.00,
      total: 145.00,
      date: new Date('2025-11-01').toISOString(),
      status: 'Shipped',
    },
    {
      id: '251101M9P956BU',
      shop: 'Shopee',
      productId: '4',
      productName: 'Dark Grey',
      quantity: 10,
      unitPrice: 29.00,
      total: 290.00,
      date: new Date('2025-11-01').toISOString(),
      status: 'Processing',
    },
    {
      id: '251101MC9JQ6NC',
      shop: 'Shopee',
      productId: '23',
      productName: 'Desiree-Red',
      quantity: 11,
      unitPrice: 39.00,
      total: 429.00,
      date: new Date('2025-11-01').toISOString(),
      status: 'Processing',
    },
    {
      id: '251101MHCYNSSV',
      shop: 'Shopee',
      productId: '25',
      productName: 'Drake-Grey',
      quantity: 3,
      unitPrice: 39.00,
      total: 117.00,
      date: new Date('2025-11-01').toISOString(),
      status: 'Shipped',
    },
    {
      id: '251101MHQECM8Q',
      shop: 'Shopee',
      productId: '4',
      productName: 'Dark Grey',
      quantity: 5,
      unitPrice: 30.00,
      total: 150.00,
      date: new Date('2025-11-01').toISOString(),
      status: 'Processing',
    },
    {
      id: '251102NAMEH8K7',
      shop: 'Shopee',
      productId: '20',
      productName: 'Christmas Eve Red',
      quantity: 3,
      unitPrice: 39.00,
      total: 117.00,
      date: new Date('2025-11-02').toISOString(),
      status: 'Delivered',
    },
    {
      id: '251102NTQB59WP',
      shop: 'Shopee',
      productId: '20',
      productName: 'Christmas Eve Red',
      quantity: 6,
      unitPrice: 39.00,
      total: 234.00,
      date: new Date('2025-11-02').toISOString(),
      status: 'Delivered',
    },
    {
      id: '251102P1VGWW9Y',
      shop: 'Shopee',
      productId: '31',
      productName: 'Olive Green-Noraisa',
      quantity: 2,
      unitPrice: 39.00,
      total: 78.00,
      date: new Date('2025-11-02').toISOString(),
      status: 'Delivered',
    },
    {
      id: '251102PDK9C0AQ',
      shop: 'Shopee',
      productId: '22',
      productName: 'Desiree-Lavender',
      quantity: 10,
      unitPrice: 39.00,
      total: 390.00,
      date: new Date('2025-11-02').toISOString(),
      status: 'Processing',
    },
  ]);



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

  // Searchable content for each page
  const searchableContent = [
    { 
      page: 'inventory', 
      icon: '📦', 
      label: 'Inventory',
      keywords: ['inventory', 'products', 'stock', 'items', 'quantity', 'category', 'add product', 'edit product', 'delete product', 'hijab', 'plain', 'printed', 'accessories']
    },
    { 
      page: 'shopsales', 
      icon: '💰', 
      label: 'ShopSales',
      keywords: ['sales', 'orders', 'shopee', 'tiktok', 'lazada', 'buyer', 'shipping', 'payment', 'transaction', 'delivered', 'shipped', 'cancelled', 'order number', 'record sale']
    },
    { 
      page: 'cashflows', 
      icon: '💵', 
      label: 'CashFlows',
      keywords: ['cashflow', 'cash flow', 'income', 'money', 'released', 'pending', 'balance', 'total income', 'add cashflow']
    },
    { 
      page: 'expenses', 
      icon: '📝', 
      label: 'Expenses',
      keywords: ['expenses', 'expense', 'cost', 'spending', 'purchase', 'bills', 'payment', 'total expense', 'add expense', 'receipt', 'image']
    },
    { 
      page: 'taxation', 
      icon: '📋', 
      label: 'BIR-Taxation',
      keywords: ['tax', 'taxation', 'bir', 'vat', 'percentage tax', 'withholding', 'tax computation', 'quarterly', 'annual']
    },
    { 
      page: 'cuts', 
      icon: '✂️', 
      label: 'Kosiedon Cuts',
      keywords: ['cuts', 'kosiedon', 'commission', 'share', 'percentage', 'partner', 'split', 'record cuts']
    },
    { 
      page: 'settings', 
      icon: '⚙️', 
      label: 'Account Settings',
      keywords: ['settings', 'account', 'profile', 'password', 'email', 'preferences', 'theme', 'dark mode', 'light mode']
    },
  ];

  // Search handler
  const handleGlobalSearch = (query: string) => {
    setGlobalSearch(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = searchableContent
      .filter(item => 
        item.label.toLowerCase().includes(lowerQuery) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
      )
      .map(item => ({
        page: item.page,
        icon: item.icon,
        label: item.label,
        matches: item.keywords.filter(k => k.toLowerCase().includes(lowerQuery)).slice(0, 3)
      }));

    setSearchResults(results);
    setShowSearchResults(true);
  };

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
      }
    };

    checkAuth();

    // Handle responsive sidebar
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Close search results when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    document.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleClickOutside);
    };
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
      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 transition-transform duration-300 z-50 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          backgroundColor: isDarkMode ? '#16162a' : '#ffffff',
          borderRight: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`,
        }}>
        {/* Sidebar Header */}
        <div className="flex items-center gap-3" style={{ height: '70px', padding: '0 20px', borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`, flexShrink: 0 }}>
          <img src="/Logo.jpg" alt="TelaPhoria Logo" className="w-10 h-10 object-cover rounded-lg" />
          <h2 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
            TelaPhoria
          </h2>
        </div>

        {/* Sidebar Menu */}
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

        {/* Sidebar Footer - Sticky at bottom */}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Header */}
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

        {/* Dashboard Content */}
        <div className="flex-1 w-full p-6 md:p-8 overflow-auto" style={{ backgroundColor: isDarkMode ? '#0f0f1e' : '#fff0f5', marginTop: '70px' }}>
          <div className="max-w-6xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8 p-6 rounded-lg" style={{
              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`
            }}>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                Welcome to TelaPhoria IMS
              </h1>
              <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                You are logged in as <strong style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>{user?.email}</strong>
              </p>

              {/* Global Search Bar */}
              <div className="mt-4 relative search-container">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => handleGlobalSearch(e.target.value)}
                    onFocus={() => globalSearch && setShowSearchResults(true)}
                    placeholder="Search pages... (e.g., inventory, sales, expenses, tax)"
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all"
                    style={{
                      backgroundColor: isDarkMode ? '#0f0f1e' : '#f8f9fa',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      border: `2px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      fontSize: '16px',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowSearchResults(false);
                        setGlobalSearch('');
                      }
                    }}
                  />
                  {globalSearch && (
                    <button
                      onClick={() => {
                        setGlobalSearch('');
                        setSearchResults([]);
                        setShowSearchResults(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-lg hover:opacity-70"
                      style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div 
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{
                      backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                    }}
                  >
                    {searchResults.map((result) => (
                      <a
                        key={result.page}
                        href={`/${result.page}`}
                        className="flex items-center gap-4 p-4 transition-all hover:opacity-90"
                        style={{
                          backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                          borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#f0f0f0'}`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#2a2a3e' : '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#1a1a2e' : '#ffffff';
                        }}
                      >
                        <span className="text-2xl">{result.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            {result.label}
                          </p>
                          {result.matches.length > 0 && (
                            <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                              Matches: {result.matches.join(', ')}
                            </p>
                          )}
                        </div>
                        <span style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>→</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* No Results Message */}
                {showSearchResults && globalSearch && searchResults.length === 0 && (
                  <div 
                    className="absolute top-full left-0 right-0 mt-2 p-4 rounded-xl text-center"
                    style={{
                      backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      color: isDarkMode ? '#9aa0a6' : '#7f8c8d',
                    }}
                  >
                    No pages found for &quot;{globalSearch}&quot;
                  </div>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-lg p-6" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0', border: `1px solid ${isDarkMode ? '#7aa6f0' : '#10b981'}` }}>
                <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Sales</p>
                <h2 className="text-3xl font-bold mt-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                  ₱{sales.reduce((sum, sale) => sum + sale.total, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="rounded-lg p-6" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0', border: `1px solid ${isDarkMode ? '#7aa6f0' : '#10b981'}` }}>
                <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Items Sold</p>
                <h2 className="text-3xl font-bold mt-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                  {sales.reduce((sum, sale) => sum + sale.quantity, 0)}
                </h2>
              </div>
              <div className="rounded-lg p-6" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0', border: `1px solid ${isDarkMode ? '#7aa6f0' : '#10b981'}` }}>
                <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Transactions</p>
                <h2 className="text-3xl font-bold mt-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                  {sales.length}
                </h2>
              </div>
              <div className="rounded-lg p-6" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0', border: `1px solid ${isDarkMode ? '#ef4444' : '#ef4444'}` }}>
                <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Expenses</p>
                <h2 className="text-3xl font-bold mt-2" style={{ color: '#ef4444' }}>
                  ₱{(() => {
                    const storedExpenses = typeof window !== 'undefined' ? localStorage.getItem('expenses') : null;
                    if (storedExpenses) {
                      const expensesData = JSON.parse(storedExpenses);
                      return expensesData.reduce((sum: number, exp: any) => sum + exp.total, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                    return '0.00';
                  })()}
                </h2>
              </div>
            </div>

            <style>{`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              .animate-fade-in {
                animation: fadeIn 0.5s ease-out forwards;
              }
            `}</style>
          </div>
        </div>
      </main>
    </div>
  );
}
