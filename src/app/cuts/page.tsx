'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/themeContext';
import * as inventoryService from '@/lib/inventoryService';
import Loader from '@/components/Loader';
import Button from '@/components/Button';

interface Product {
  id: string;
  productName: string;
  category: string;
  type: string;
  quantity: number;
}

// Fabric cuts - separate entries per yard (NOT combined)
interface CutRecord {
  id: string;
  productId: string;
  productName: string;
  yards: number;
  date: string;
}

// Returned parcels from cancelled orders
interface ReturnedParcel {
  id: string;
  orderId: string;
  shop: 'Shopee' | 'TikTok' | 'Lazada';
  products: {
    productId: string;
    productName: string;
    quantity: number;
  }[];
  returnDate: string;
  restockedDate?: string;
  status: 'Pending' | 'Restocked';
}

export default function CutsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode, isThemeSwitching } = useTheme();
  const [currentPage] = useState('cuts');
  const [activeTab, setActiveTab] = useState<'cuts' | 'returns'>('cuts');
  const [products, setProducts] = useState<Product[]>([]);
  const [cuts, setCuts] = useState<CutRecord[]>([]);
  const [returnedParcels, setReturnedParcels] = useState<ReturnedParcel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  // Simple form: Product + Yards only
  const [formData, setFormData] = useState({
    productId: '',
    yards: '',
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
        await loadProducts(session.user.id);
        loadCuts();
        loadReturnedParcels();
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

  const loadProducts = async (userId: string) => {
    try {
      const prods = await inventoryService.loadInventoryProducts(userId);
      const formatted = prods.map((p: any) => ({
        id: p.id,
        productName: p.product_name,
        category: p.category,
        type: p.type,
        quantity: p.quantity,
      }));
      setProducts(formatted);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCuts = () => {
    const storedCuts = localStorage.getItem('kosiedon_cuts_v2');
    if (storedCuts) {
      setCuts(JSON.parse(storedCuts));
    }
  };

  const loadReturnedParcels = () => {
    const storedReturns = localStorage.getItem('returned_parcels');
    if (storedReturns) {
      setReturnedParcels(JSON.parse(storedReturns));
    }
  };

  const handleAddCut = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || !formData.yards) {
      setAlertMessage({ message: 'Please fill in Product and Yards', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
      return;
    }

    if (!user) {
      setAlertMessage({ message: 'User not authenticated', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
      return;
    }

    try {
      const yards = parseFloat(formData.yards);
      const selectedProduct = products.find(p => p.id === formData.productId);

      if (!selectedProduct) {
        setAlertMessage({ message: 'Product not found', type: 'error' });
        setTimeout(() => setAlertMessage(null), 3000);
        return;
      }

      if (yards > selectedProduct.quantity) {
        setAlertMessage({ message: `Not enough stock! Available: ${selectedProduct.quantity} yards`, type: 'error' });
        setTimeout(() => setAlertMessage(null), 3000);
        return;
      }

      // Create new cut record (SEPARATE entry, not combined)
      const newCut: CutRecord = {
        id: `cut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: formData.productId,
        productName: selectedProduct.productName,
        yards,
        date: new Date().toISOString(),
      };

      // Deduct from inventory
      try {
        await inventoryService.recordFabricCut(
          user.id,
          newCut.id,
          formData.productId,
          yards
        );
        await loadProducts(user.id);
      } catch (error) {
        console.error('Error recording fabric cut:', error);
      }

      // Add to cuts list (each cut is SEPARATE)
      const updatedCuts = [newCut, ...cuts];
      setCuts(updatedCuts);
      localStorage.setItem('kosiedon_cuts_v2', JSON.stringify(updatedCuts));

      // Reset form
      setFormData({ productId: '', yards: '' });
      setShowModal(false);
      setAlertMessage({ message: `✂️ Cut: ${selectedProduct.productName} - ${yards} yards`, type: 'success' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Error adding cut:', error);
      setAlertMessage({ message: 'Error recording cut', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    }
  };

  // Mark cut as "Nagamit Na!" - removes from list
  const handleMarkAsUsed = (cutId: string) => {
    const cut = cuts.find(c => c.id === cutId);
    const updatedCuts = cuts.filter(c => c.id !== cutId);
    setCuts(updatedCuts);
    localStorage.setItem('kosiedon_cuts_v2', JSON.stringify(updatedCuts));
    setAlertMessage({ message: `✅ ${cut?.productName} - ${cut?.yards} yards nagamit na!`, type: 'success' });
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const handleRestockParcel = async (parcel: ReturnedParcel) => {
    if (!user) {
      setAlertMessage({ message: 'User not authenticated', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
      return;
    }

    try {
      // Add quantities back to inventory
      for (const product of parcel.products) {
        const existingProduct = products.find(p => p.id === product.productId);
        if (existingProduct) {
          await inventoryService.updateProductQuantity(
            product.productId,
            existingProduct.quantity + product.quantity
          );
        }
      }

      await loadProducts(user.id);

      // Remove from list instead of updating status
      const updatedParcels = returnedParcels.filter(p => p.id !== parcel.id);
      setReturnedParcels(updatedParcels);
      localStorage.setItem('returned_parcels', JSON.stringify(updatedParcels));

      const totalQty = parcel.products.reduce((sum, p) => sum + p.quantity, 0);
      setAlertMessage({ message: `✅ Restocked ${totalQty} items back to inventory!`, type: 'success' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Error restocking parcel:', error);
      setAlertMessage({ message: 'Error restocking', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    }
  };

  const pendingReturns = returnedParcels.filter(r => r.status === 'Pending');

  if (!mounted) return null;

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
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Alert */}
      {alertMessage && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 p-3 md:p-4 rounded-lg flex items-center gap-2 md:gap-3 shadow-lg"
          style={{
            backgroundColor: alertMessage.type === 'success' ? (isDarkMode ? '#1a3a1a' : '#dcfce7') : (isDarkMode ? '#3a1a1a' : '#fee2e2'),
            border: `1px solid ${alertMessage.type === 'success' ? (isDarkMode ? '#15803d' : '#86efac') : (isDarkMode ? '#7c2d2d' : '#fecaca')}`,
            maxWidth: '100%'
          }}>
          <span className="text-xl md:text-2xl">{alertMessage.type === 'success' ? '✅' : '❌'}</span>
          <p style={{ color: alertMessage.type === 'success' ? (isDarkMode ? '#86efac' : '#15803d') : (isDarkMode ? '#fca5a5' : '#991b1b'), fontWeight: '600', fontSize: '13px' }}>
            {alertMessage.message}
          </p>
          <button onClick={() => setAlertMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 transition-transform duration-300 z-50 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ backgroundColor: isDarkMode ? '#16162a' : '#ffffff', borderRight: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
        <div className="flex items-center gap-3" style={{ height: '70px', padding: '0 20px', borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`, flexShrink: 0 }}>
          <img src="/Logo.jpg" alt="TelaPhoria Logo" className="w-10 h-10 object-cover rounded-lg" />
          <h2 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>TelaPhoria</h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-5">
          {menuItems.map(item => (
            <a key={item.id} href={item.id === 'dashboard' ? '/dashboard' : `/${item.id}`}
              className="block w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 border-l-4"
              style={{
                backgroundColor: currentPage === item.id ? (isDarkMode ? '#1f1f38' : '#f8f9fa') : 'transparent',
                color: currentPage === item.id ? (isDarkMode ? '#e8eaed' : '#2c3e50') : isDarkMode ? '#9aa0a6' : '#7f8c8d',
                borderLeft: currentPage === item.id ? `4px solid ${isDarkMode ? '#00d4ff' : '#ff69b4'}` : '4px solid transparent',
                cursor: 'pointer',
              }}>
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        <div style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`, padding: '12px 8px', flexShrink: 0 }}>
          <button onClick={handleLogout} className="w-full px-4 py-3 flex items-center gap-3 rounded-lg font-medium"
            style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', textAlign: 'left' }}>
            <span>🚪</span><span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:ml-64">
        <header className="fixed top-0 right-0 left-0 md:left-64 flex items-center justify-between px-6 md:px-8 z-40"
          style={{ height: '70px', backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded-lg"
            style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8' }}>
            <img src="/Logo.jpg" alt="Toggle menu" className="w-6 h-6 object-cover rounded" />
          </button>

          {/* Theme Toggle */}
          <label className="theme-switch">
            <input type="checkbox" className="theme-switch__checkbox" checked={isDarkMode}
              onChange={() => { localStorage.setItem('theme', isDarkMode ? 'light' : 'dark'); window.dispatchEvent(new Event('storage')); }} />
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
            </div>
          </label>
          <style>{`
            .theme-switch { --toggle-size: 20px; position: fixed; top: 15px; right: 15px; z-index: 1000; }
            .theme-switch__container { width: 3.75em; height: 1.67em; background-color: #3D7EAE; border-radius: 6.25em; cursor: pointer; transition: .5s; position: relative; font-size: var(--toggle-size); }
            .theme-switch__checkbox:checked + .theme-switch__container { background-color: #1D1F2C; }
            .theme-switch__checkbox { display: none; }
            .theme-switch__circle-container { width: 2.25em; height: 2.25em; position: absolute; left: calc((2.25em - 1.67em) / 2 * -1); top: calc((2.25em - 1.67em) / 2 * -1); border-radius: 6.25em; display: flex; transition: .3s; font-size: var(--toggle-size); }
            .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container { left: calc(100% - 2.25em + (2.25em - 1.67em) / 2); }
            .theme-switch__sun-moon-container { width: 1.42em; height: 1.42em; margin: auto; border-radius: 6.25em; background-color: #ECCA2F; transition: .5s; overflow: hidden; font-size: var(--toggle-size); }
            .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__sun-moon-container { background-color: #C4C9D1; }
            .theme-switch__moon { transform: translateX(100%); width: 100%; height: 100%; background-color: #C4C9D1; border-radius: inherit; transition: .5s; position: relative; }
            .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__moon { transform: translateX(0); }
            .theme-switch__spot { position: absolute; background-color: #959DB1; border-radius: 50%; }
            .theme-switch__spot:nth-child(1) { width: 0.35em; height: 0.35em; top: 0.25em; left: 0.4em; }
            .theme-switch__spot:nth-child(2) { width: 0.2em; height: 0.2em; top: 0.6em; left: 0.2em; }
            .theme-switch__spot:nth-child(3) { width: 0.25em; height: 0.25em; top: 0.65em; left: 0.6em; }
          `}</style>
        </header>

        <div className="flex-1 overflow-y-auto pt-[90px] pb-8 px-4 md:px-8" style={{ backgroundColor: isDarkMode ? '#0f0f1e' : '#fff0f5' }}>
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
              ✂️ Kosiedon Cuts & Returns
            </h1>
            <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Track fabric cuts and manage returned parcels</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab('cuts')} className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{ backgroundColor: activeTab === 'cuts' ? '#ff69b4' : (isDarkMode ? '#2d2d44' : '#e8dce8'), color: activeTab === 'cuts' ? '#fff' : (isDarkMode ? '#e8eaed' : '#2c3e50'), border: 'none', cursor: 'pointer' }}>
              ✂️ Fabric Cuts ({cuts.length})
            </button>
            <button onClick={() => setActiveTab('returns')} className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{ backgroundColor: activeTab === 'returns' ? '#ff69b4' : (isDarkMode ? '#2d2d44' : '#e8dce8'), color: activeTab === 'returns' ? '#fff' : (isDarkMode ? '#e8eaed' : '#2c3e50'), border: 'none', cursor: 'pointer' }}>
              📦 Returned Parcels ({pendingReturns.length})
            </button>
          </div>

          {/* ============ CUTS TAB ============ */}
          {activeTab === 'cuts' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}` }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Cuts</p>
                  <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{cuts.length}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}` }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Yards</p>
                  <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{cuts.reduce((sum, c) => sum + c.yards, 0).toFixed(1)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}` }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Products</p>
                  <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{new Set(cuts.map(c => c.productId)).size}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}` }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>This Month</p>
                  <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{cuts.filter(c => new Date(c.date).getMonth() === new Date().getMonth()).length}</p>
                </div>
              </div>

              {/* Add Button */}
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowModal(true)}>+ Record Cut</Button>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: isDarkMode ? '#1a2a3a' : '#e0f2fe', border: `1px solid ${isDarkMode ? '#2d4a5a' : '#7dd3fc'}` }}>
                <p style={{ color: isDarkMode ? '#7dd3fc' : '#0369a1', fontSize: '14px' }}>
                  💡 <strong>Note:</strong> Each cut is recorded separately. Click "Nagamit Na!" when the cut fabric has been used.
                </p>
              </div>

              {/* Cuts CARD GRID */}
              {cuts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">✂️</div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>No Cuts Yet</h3>
                  <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Record your first fabric cut</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {cuts.map((cut) => (
                    <div key={cut.id} className="rounded-xl overflow-hidden flex flex-col"
                      style={{ 
                        backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', 
                        border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}`,
                        minHeight: '200px'
                      }}>
                      {/* Card Header with Icon */}
                      <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0" 
                          style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#fce7f3' }}>
                          ✂️
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            {cut.productName}
                          </h3>
                          <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                            {new Date(cut.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div className="text-center mb-4">
                          <p className="text-3xl font-bold" style={{ color: '#ff69b4' }}>{cut.yards}</p>
                          <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>yards</p>
                        </div>

                        {/* Nagamit Na! Button */}
                        <button
                          onClick={() => handleMarkAsUsed(cut.id)}
                          className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                          style={{
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                          }}>
                          ✅ Nagamit Na!
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ============ RETURNS TAB ============ */}
          {activeTab === 'returns' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}` }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Pending Returns</p>
                  <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{pendingReturns.length}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}` }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Items</p>
                  <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    {pendingReturns.reduce((sum, r) => sum + r.products.reduce((s, p) => s + p.quantity, 0), 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#d1c4d1'}` }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Products</p>
                  <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    {pendingReturns.reduce((sum, r) => sum + r.products.length, 0)}
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: isDarkMode ? '#1a2a3a' : '#e0f2fe', border: `1px solid ${isDarkMode ? '#2d4a5a' : '#7dd3fc'}` }}>
                <p style={{ color: isDarkMode ? '#7dd3fc' : '#0369a1', fontSize: '14px' }}>
                  💡 <strong>How it works:</strong> Cancelled orders from ShopSales appear here. Click "Restock to Inventory" when the parcel arrives.
                </p>
              </div>

              {/* Returns CARD GRID */}
              {pendingReturns.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>No Returned Parcels</h3>
                  <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Cancelled orders will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingReturns.map((parcel) => (
                    <div key={parcel.id} className="rounded-xl overflow-hidden flex flex-col"
                      style={{ 
                        backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', 
                        border: `2px solid #f59e0b`,
                        minHeight: '280px'
                      }}>
                      {/* Card Header */}
                      <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0" 
                          style={{ backgroundColor: '#fef3c7' }}>
                          📦
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Order #{parcel.orderId.slice(-8)}
                          </h3>
                          <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                            {parcel.shop} • {new Date(parcel.returnDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                          Pending
                        </span>
                      </div>

                      {/* Products List */}
                      <div className="p-4 flex-1">
                        <p className="text-xs font-medium mb-2" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Products to Restock:</p>
                        <div className="space-y-2 max-h-[120px] overflow-y-auto">
                          {parcel.products.map((product, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-lg"
                              style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5' }}>
                              <span className="text-sm truncate" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                                {product.productName}
                              </span>
                              <span className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: '#ff69b4' }}>
                                x{product.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Restock Button */}
                      <div className="p-4 border-t" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                        <button
                          onClick={() => handleRestockParcel(parcel)}
                          className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                          style={{
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                          }}>
                          ✅ Restock to Inventory
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add Cut Modal - Simple: Product + Yards only */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
            <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>✂️ Record Fabric Cut</h2>
                <p className="text-sm mt-1" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Each cut is recorded separately</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-2xl hover:opacity-70 transition-opacity"
                style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', cursor: 'pointer', background: 'none', border: 'none', padding: '0', lineHeight: '1' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCut} className="p-6 space-y-4">
              {/* Product */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>Product *</label>
                <select value={formData.productId} onChange={(e) => setFormData({...formData, productId: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5', color: isDarkMode ? '#e8eaed' : '#2c3e50', border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, cursor: 'pointer' }}>
                  <option value="">Choose product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.productName} (Stock: {p.quantity})</option>
                  ))}
                </select>
              </div>

              {/* Yards */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>Yards *</label>
                <input type="number" step="0.1" value={formData.yards} onChange={(e) => setFormData({...formData, yards: e.target.value})}
                  placeholder="e.g., 3"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5', color: isDarkMode ? '#e8eaed' : '#2c3e50', border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}` }} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }}>Cancel</Button>
                <Button type="submit" style={{ flex: 1 }}>✂️ Record Cut</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(loading || isThemeSwitching) && <Loader />}
    </div>
  );
}
