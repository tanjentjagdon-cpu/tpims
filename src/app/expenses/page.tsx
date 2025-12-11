'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/themeContext';
import Loader from '@/components/Loader';
import Button from '@/components/Button';
import ImageUpload from '@/components/ImageUpload';
import Modal from '@/components/Modal';
import * as imageService from '@/lib/imageService';
import * as inventoryService from '@/lib/inventoryService';

interface Expense {
  id: string;
  date: string;
  name: string;
  type: 'Government' | 'Petrol' | 'Food' | 'Parking' | 'Materials' | 'Ads' | 'Others';
  fee: number;
  deliveryFee?: number;
  total: number;
  image?: string;
}

export default function ExpensesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode, isThemeSwitching, toggleTheme } = useTheme();
  const [currentPage] = useState('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [alertMessage, setAlertMessage] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  const [formData, setFormData] = useState<{
    date: string;
    name: string;
    type: Expense['type'];
    fee: number;
    deliveryFee: number;
    image: File | null;
  }>({
    date: new Date().toISOString().split('T')[0],
    name: '',
    type: 'Government' as Expense['type'],
    fee: 0,
    deliveryFee: 0,
    image: null,
  });

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
        const data = await inventoryService.loadExpenses(session.user.id);
        setExpenses(data);
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

  // Export expenses to Excel
  const handleExport = async () => {
    if (expenses.length === 0) {
      setAlertMessage({ message: 'No expenses to export', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
      return;
    }

    setExportLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tpimis-backend.onrender.com';
      
      const exportData = expenses.map(exp => ({
        date: exp.date,
        name: exp.name,
        type: exp.type,
        fee: exp.fee,
        deliveryFee: exp.deliveryFee || 0,
        total: exp.total,
      }));

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `TelaPhoria_Expenses_${dateStr}`;

      const response = await fetch(`${API_URL}/api/excel/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: exportData, template: 'default', filename }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setAlertMessage({ message: '✅ Export successful!', type: 'success' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setAlertMessage({ message: 'Export failed. Please try again.', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    } finally {
      setExportLoading(false);
    }
  };

  // Filter expenses based on search term and type
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.date.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || expense.type === filterType;
    return matchesSearch && matchesType;
  });

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

      {/* UI Alert */}
      {alertMessage && (
        <div 
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 p-3 md:p-4 rounded-lg flex items-center gap-2 md:gap-3 shadow-lg transition-all"
          style={{
            backgroundColor: alertMessage.type === 'success' 
              ? (isDarkMode ? '#1a3a1a' : '#dcfce7')
              : (isDarkMode ? '#3a1a1a' : '#fee2e2'),
            border: `1px solid ${alertMessage.type === 'success'
              ? (isDarkMode ? '#15803d' : '#86efac')
              : (isDarkMode ? '#7c2d2d' : '#fecaca')}`,
            maxWidth: '100%'
          }}>
          <span className="text-xl md:text-2xl">
            {alertMessage.type === 'success' ? '✅' : '❌'}
          </span>
          <p style={{
            color: alertMessage.type === 'success'
              ? (isDarkMode ? '#86efac' : '#15803d')
              : (isDarkMode ? '#fca5a5' : '#991b1b'),
            fontWeight: '600',
            fontSize: '13px'
          }}>
            {alertMessage.message}
          </p>
          <button
            onClick={() => setAlertMessage(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: 'inherit',
            }}>
            ✕
          </button>
        </div>
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

        <div className="flex-1 w-full p-6 md:p-8 overflow-auto" style={{ backgroundColor: isDarkMode ? '#0f0f1e' : '#fff0f5', marginTop: '70px' }}>
          <div className="max-w-6xl mx-auto">
            {/* Total Expenses Summary */}
            <div className="mb-6 p-6 rounded-lg" style={{
              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#7aa6f0' : '#10b981'}`
            }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Expenses</p>
                  <h2 className="text-3xl font-bold mt-1" style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>
                    ₱{expenses.reduce((sum, exp) => sum + exp.total, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Records</p>
                  <h2 className="text-2xl font-bold mt-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    {expenses.length}
                  </h2>
                </div>
              </div>
            </div>

            {/* Search Bar and Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                {/* Search Input */}
                <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0', border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                  <span className="text-lg">🔍</span>
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent outline-none"
                    style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}
                  />
                </div>

                {/* Type Filter Dropdown */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0',
                    color: isDarkMode ? '#e8eaed' : '#2c3e50',
                    border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`,
                    cursor: 'pointer',
                    minWidth: '150px',
                    fontWeight: '500',
                  }}>
                  <option value="All">All Types</option>
                  <option value="Government">🏛️ Government</option>
                  <option value="Petrol">⛽ Petrol</option>
                  <option value="Food">🍔 Food</option>
                  <option value="Parking">🅿️ Parking</option>
                  <option value="Materials">📦 Materials</option>
                  <option value="Ads">📢 Ads</option>
                  <option value="Others">📌 Others</option>
                </select>

                {/* Add Expense Button */}
                <Button
                  onClick={() => setShowModal(true)}
                  variant="secondary"
                >
                  Add Expense
                </Button>
                <Button
                  onClick={handleExport}
                  variant="secondary"
                  disabled={exportLoading || expenses.length === 0}
                >
                  {exportLoading ? '⏳...' : '📤 Export'}
                </Button>
              </div>

              {/* Expenses Grid */}
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', borderRadius: '12px', border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                  <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', fontSize: '16px' }}>
                    {searchTerm || filterType !== 'All' ? 'No matching expenses found.' : 'No expenses recorded yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="rounded-lg border cursor-pointer transition-all hover:shadow-md"
                      onClick={() => {
                        setEditingExpenseId(expense.id);
                        setFormData({
                          date: expense.date,
                          name: expense.name,
                          type: expense.type,
                          fee: expense.fee,
                          deliveryFee: expense.deliveryFee || 0,
                          image: null,
                        });
                        setShowModal(true);
                      }}
                      style={{
                        backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                        borderColor: isDarkMode ? '#7aa6f0' : '#10b981',
                        borderWidth: '1px',
                      }}>
                      {/* Receipt Image */}
                      {expense.image && (
                        <div className="w-full h-32 overflow-hidden rounded-t-lg">
                          <img 
                            src={expense.image} 
                            alt="Receipt" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              {expense.name}
                            </h3>
                            <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', fontSize: '12px' }}>
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          <span style={{
                            backgroundColor: isDarkMode ? '#3b82f6' : '#fee2e2',
                            color: isDarkMode ? '#ffffff' : '#991b1b',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {expense.type}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            <span>Fee:</span>
                            <span className="font-semibold">₱{expense.fee.toFixed(2)}</span>
                          </div>
                          {expense.deliveryFee !== undefined && expense.deliveryFee > 0 && (
                            <div className="flex justify-between" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              <span>Delivery:</span>
                              <span className="font-semibold">₱{expense.deliveryFee.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2 mt-2" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            <span className="font-semibold">Total:</span>
                            <span className="font-bold text-lg" style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>₱{expense.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Summary */}
              {expenses.length > 0 && (
                <div className="mt-8 p-6 rounded-lg" style={{
                  backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`
                }}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      Total Expenses
                    </h3>
                    <p className="text-3xl font-bold" style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>
                      ₱{expenses.reduce((sum, exp) => sum + exp.total, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
              <div className="p-4 md:p-8 border-b flex justify-between items-center" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                <h2 className="text-xl md:text-3xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                  {editingExpenseId ? '✏️ Edit Expense' : '➕ Add Expense'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpenseId(null);
                  }}
                  className="text-2xl hover:opacity-70 transition-opacity"
                  style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', cursor: 'pointer', background: 'none', border: 'none', padding: '0', lineHeight: '1' }}>
                  ✕
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!formData.name || !formData.fee) {
                    alert('Please fill in required fields');
                    return;
                  }

                  const total = formData.type === 'Materials' 
                    ? formData.fee + (formData.deliveryFee || 0)
                    : formData.fee;

                  let imageUrl: string | undefined = undefined;
                  if (formData.image) {
                    const upload = await imageService.uploadImage(formData.image);
                    if (upload.success && upload.url) {
                      imageUrl = upload.url;
                    }
                  }

                  if (editingExpenseId) {
                    await inventoryService.updateExpense(editingExpenseId, {
                      date: formData.date,
                      name: formData.name,
                      type: formData.type,
                      fee: formData.fee,
                      deliveryFee: formData.type === 'Materials' ? formData.deliveryFee : 0,
                      total,
                      image: imageUrl || undefined,
                    });
                    const data = await inventoryService.loadExpenses(user.id);
                    setExpenses(data);
                    setAlertMessage({ message: 'Updated na ni Tanjent', type: 'success' });
                    setTimeout(() => setAlertMessage(null), 3000);
                  } else {
                    const saved = await inventoryService.saveExpense(user.id, {
                      date: formData.date,
                      name: formData.name,
                      type: formData.type,
                      fee: formData.fee,
                      deliveryFee: formData.type === 'Materials' ? formData.deliveryFee : 0,
                      total,
                      image: imageUrl || null,
                    });
                    setExpenses([saved, ...expenses]);
                    setAlertMessage({ message: 'Filed and Saved na ni Gab sa Library ng app natin', type: 'success' });
                    setTimeout(() => setAlertMessage(null), 3000);
                  }

                  setFormData({
                    date: new Date().toISOString().split('T')[0],
                    name: '',
                    type: 'Government',
                    fee: 0,
                    deliveryFee: 0,
                    image: null,
                  });
                  setEditingExpenseId(null);
                  setShowModal(false);
                }}
                className="modal-scroll p-6 md:p-8 space-y-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                    }}
                  />
                </div>

                {/* Expense Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Expense Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Monthly Rent, Gas Fill-up"
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                    }}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as Expense['type']})}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      cursor: 'pointer',
                    }}>
                    <option value="Government">🏛️ Government</option>
                    <option value="Petrol">⛽ Petrol</option>
                    <option value="Food">🍔 Food</option>
                    <option value="Parking">🅿️ Parking</option>
                    <option value="Materials">📦 Materials</option>
                    <option value="Ads">📢 Ads</option>
                    <option value="Others">📌 Others</option>
                  </select>
                </div>

                {/* Fee */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Fee *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fee}
                    onChange={(e) => setFormData({...formData, fee: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                    }}
                  />
                </div>

                {/* Delivery Fee (only for Materials) */}
                {formData.type === 'Materials' && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      Delivery Fee
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.deliveryFee}
                      onChange={(e) => setFormData({...formData, deliveryFee: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                      style={{
                        backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      }}
                    />
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Receipt Image (Optional)
                  </label>
                  <ImageUpload 
                    onImageSelect={(file) => setFormData({...formData, image: file})}
                    accept="image/*"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-6 border-t" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                  <Button
                    type="submit"
                    style={{ flex: 1 }}
                  >
                    {editingExpenseId ? 'Update Expense' : 'Add Expense'}
                  </Button>
                  {editingExpenseId && (
                    <Button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(true);
                      }}
                      style={{ flex: 1 }}
                    >
                      🗑️ Delete
                    </Button>
                  )}
                </div>
              </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}>
            <div
              className="rounded-2xl shadow-2xl max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
              }}>
              <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                <h2 className="text-xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                  ⚠️ Delete Expense?
                </h2>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-2xl hover:opacity-70 transition-opacity"
                  style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', cursor: 'pointer', background: 'none', border: 'none', padding: '0', lineHeight: '1' }}>
                  ✕
                </button>
              </div>

              <div className="p-6">
                <p style={{ color: isDarkMode ? '#c5cad1' : '#555555', marginBottom: '24px', lineHeight: '1.5' }}>
                  Are you sure you want to delete this expense? This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      backgroundColor: isDarkMode ? '#2d2d44' : '#e1e8ed',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (editingExpenseId) {
                        await inventoryService.deleteExpense(editingExpenseId);
                        const data = await inventoryService.loadExpenses(user.id);
                        setExpenses(data);
                      }
                      setFormData({
                        date: new Date().toISOString().split('T')[0],
                        name: '',
                        type: 'Government',
                        fee: 0,
                        deliveryFee: 0,
                        image: null,
                      });
                      setEditingExpenseId(null);
                      setShowModal(false);
                      setShowDeleteConfirm(false);
                      setAlertMessage({ message: 'Tinapon na ni Cosyne', type: 'success' });
                      setTimeout(() => setAlertMessage(null), 3000);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
