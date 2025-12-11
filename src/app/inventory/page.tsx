'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/themeContext';
import * as inventoryService from '@/lib/inventoryService';
import * as imageService from '@/lib/imageService';
import Loader from '@/components/Loader';
import Button from '@/components/Button';
import ImageUpload from '@/components/ImageUpload';
import Modal from '@/components/Modal';

interface Product {
  id: string;
  productName: string;
  category: string;
  type: string;
  quantity: number;
  image?: string;
  createdAt: string;
}

export default function InventoryPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode, isThemeSwitching, toggleTheme } = useTheme();
  const [currentPage] = useState('inventory');
  const [showModal, setShowModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [carouselPosition, setCarouselPosition] = useState<{[key: string]: number}>({});
  
  // Cascading dropdown data structure
  const catalogData = {
    'Geena Cloth': {
      'Plain': [
        'Apple Green',
        'Black',
        'Cream',
        'Dark Grey',
        'Emerald',
        'Fuschia Pink',
        'Green',
        'Lavender',
        'Light Blue',
        'Light Pink',
        'Maroon',
        'Off-White',
        'Olive Green',
        'Pink',
        'Purple',
        'Red',
        'White',
        'Yellow',
        'Yellow Gold',
        'Royal Blue',
        'Aqua Blue',
      ],
      'Printed': [
        'Christmas Eve Cream',
        'Christmas Eve Red',
        'Desiree-Lavender',
        'Desiree-Red',
        'Drake-Grey',
        'Drake-Red',
        'Errose-Apple Green',
        'Errose-Blue',
        'Errose-Pink',
        'Esther PP-Pink',
        'Esther PP-Red',
        'Olive Green-Noraisa',
        'Yellow-Sidnilyn',
        'Esther Blue',
        'Drake Royal Blue',
        'Paloma Red',
      ],
    },
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    category: '',
    type: '',
    productName: '',
    quantity: '',
    image: null as File | null,
  });
  const [addQuantity, setAddQuantity] = useState('');
  const [showQuickPrintedModal, setShowQuickPrintedModal] = useState(false);
  const [quickAddQtyMap, setQuickAddQtyMap] = useState<{[name: string]: string}>({});
  const [showQuickPlainModal, setShowQuickPlainModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Compute available types based on selected category
  const availableTypes = formData.category ? Object.keys(catalogData[formData.category as keyof typeof catalogData] || {}) : [];
  
  // Compute available product names based on selected category and type (dynamic from both catalogData and products)
  const getAvailableProductNames = () => {
    if (!formData.category || !formData.type) return [];
    
    // Get names from catalogData if they exist
    const catalogNames = (catalogData[formData.category as keyof typeof catalogData] as any)?.[formData.type] || [];
    
    // Get names from products that match category and type
    const productNames = products
      .filter(p => p.category === formData.category && p.type === formData.type)
      .map(p => p.productName);
    
    // Combine and remove duplicates
    return Array.from(new Set([...catalogNames, ...productNames])).sort();
  };

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
        
        // Load products from Supabase
        const data = await inventoryService.loadInventoryProducts(session.user.id);
        const formatted = data.map(p => ({
          id: p.id,
          productName: p.product_name,
          category: p.category,
          type: p.type,
          quantity: p.quantity,
          image: p.image_url,
          createdAt: p.created_at
        }));
        setProducts(formatted);
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login';
      } finally {
        setLoading(false);
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

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.category || !formData.type || !formData.productName || !formData.quantity) {
      alert('Please fill in all fields');
      return;
    }

    if (!user) {
      alert('User not authenticated');
      return;
    }

    try {
      // Check if product already exists (same category, type, and name)
      const existingProduct = products.find(p => 
        p.category === formData.category && 
        p.type === formData.type && 
        p.productName === formData.productName
      );

      if (existingProduct) {
        // Update existing product quantity in Supabase
        const newQty = existingProduct.quantity + parseInt(formData.quantity);
        await inventoryService.updateProductQuantity(existingProduct.id, newQty);
        
        // Update local state
        setProducts(products.map(p => 
          p.id === existingProduct.id ? {
            ...p,
            quantity: newQty,
          } : p
        ));
        alert(`Quantity added! Total: ${newQty} units`);
      } else {
        // Upload image if provided
        let imageUrl: string | null = null;
        if (formData.image) {
          const uploadResult = await imageService.uploadImage(formData.image);
          if (uploadResult.success && uploadResult.url) {
            imageUrl = uploadResult.url;
          } else {
            console.warn('Image upload failed:', uploadResult.error);
            // Continue without image
          }
        }

        // Create new product in Supabase
        const savedProduct = await inventoryService.saveProduct(user.id, {
          productName: formData.productName,
          category: formData.category,
          type: formData.type,
          quantity: parseInt(formData.quantity),
          image: imageUrl,
        });

        // Add to local state with formatted response
        const newProduct: Product = {
          id: savedProduct.id,
          productName: savedProduct.product_name,
          category: savedProduct.category,
          type: savedProduct.type,
          quantity: savedProduct.quantity,
          image: savedProduct.image_url,
          createdAt: savedProduct.created_at
        };
        setProducts([...products, newProduct]);
        setAlertMessage({ message: 'Filed and Saved na ni Gab sa Library ng app natin', type: 'success' });
        setTimeout(() => setAlertMessage(null), 3000);
      }

      // Reset form
      setFormData({
        category: '',
        type: '',
        productName: '',
        quantity: '',
        image: null,
      });
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    }
  };
  const handleDeleteProduct = async (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTargetId) return;
    try {
      await inventoryService.deleteProduct(deleteTargetId);
      setProducts(products.filter(p => p.id !== deleteTargetId));
      setExpandedProductId(null);
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setAlertMessage({ message: 'Tinapon na ni Cosyne', type: 'success' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setAlertMessage({ message: 'Error deleting product', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    }
  };

  // Export inventory to Excel
  const handleExport = async () => {
    if (products.length === 0) {
      setAlertMessage({ message: 'No products to export', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
      return;
    }

    setExportLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tpimis-backend.onrender.com';
      
      const exportData = products.map(p => ({
        productName: p.productName,
        category: p.category,
        type: p.type,
        quantity: p.quantity,
        createdAt: p.createdAt,
      }));

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `TelaPhoria_Inventory_${dateStr}`;

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

  const handleEditProduct = (product: Product) => {
    setFormData({
      category: product.category,
      type: product.type,
      productName: product.productName,
      quantity: product.quantity.toString(),
      image: null,
    });
    setAddQuantity('');
    setEditingProductId(product.id);
    setShowModal(true);
    setExpandedProductId(null);
  };

  const handleAddQuantity = async (productId: string, amount: number) => {
    try {
      const target = products.find(p => p.id === productId);
      if (!target) return;
      const increment = Math.max(0, Math.floor(amount || 0));
      if (!increment) {
        setAlertMessage({ message: 'Enter a valid quantity', type: 'error' });
        setTimeout(() => setAlertMessage(null), 2000);
        return;
      }
      const newQty = (target.quantity || 0) + increment;
      await inventoryService.updateProductQuantity(productId, newQty);
      setProducts(products.map(p => p.id === productId ? { ...p, quantity: newQty } : p));
      setAlertMessage({ message: `Added ${increment} yards. Total: ${newQty}`, type: 'success' });
      setTimeout(() => setAlertMessage(null), 3000);
      setAddQuantity('');
    } catch (error) {
      console.error('Error updating quantity:', error);
      setAlertMessage({ message: 'Update failed. Please try again.', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    }
  };

  const handleQuickAddPrinted = async (name: string, amount: number) => {
    try {
      if (!user) return;
      const increment = Math.max(0, Math.floor(amount || 0));
      if (!increment) {
        setAlertMessage({ message: 'Enter a valid quantity', type: 'error' });
        setTimeout(() => setAlertMessage(null), 2000);
        return;
      }
      const existingProduct = products.find(p => p.category === 'Geena Cloth' && p.type === 'Printed' && p.productName === name);
      if (existingProduct) {
        const newQty = (existingProduct.quantity || 0) + increment;
        await inventoryService.updateProductQuantity(existingProduct.id, newQty);
        setProducts(products.map(p => p.id === existingProduct.id ? { ...p, quantity: newQty } : p));
        setAlertMessage({ message: `Added ${increment} to ${name}. Total: ${newQty}`, type: 'success' });
      } else {
        const saved = await inventoryService.saveProduct(user.id, {
          productName: name,
          category: 'Geena Cloth',
          type: 'Printed',
          quantity: increment,
          image: null,
        });
        const newProduct: Product = {
          id: saved.id,
          productName: saved.product_name,
          category: saved.category,
          type: saved.type,
          quantity: saved.quantity,
          image: saved.image_url,
          createdAt: saved.created_at,
        };
        setProducts([...products, newProduct]);
        setAlertMessage({ message: `Created ${name} with ${increment} qty`, type: 'success' });
      }
      setTimeout(() => setAlertMessage(null), 3000);
      setQuickAddQtyMap(prev => ({ ...prev, [name]: '' }));
    } catch (error) {
      console.error('Error quick-adding printed:', error);
      setAlertMessage({ message: 'Operation failed. Please try again.', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    }
  };

  const handleQuickAddPlain = async (name: string, amount: number) => {
    try {
      if (!user) return;
      const increment = Math.max(0, Math.floor(amount || 0));
      if (!increment) {
        setAlertMessage({ message: 'Enter a valid quantity', type: 'error' });
        setTimeout(() => setAlertMessage(null), 2000);
        return;
      }
      const existingProduct = products.find(p => p.category === 'Geena Cloth' && p.type === 'Plain' && p.productName === name);
      if (existingProduct) {
        const newQty = (existingProduct.quantity || 0) + increment;
        await inventoryService.updateProductQuantity(existingProduct.id, newQty);
        setProducts(products.map(p => p.id === existingProduct.id ? { ...p, quantity: newQty } : p));
        setAlertMessage({ message: `Added ${increment} to ${name}. Total: ${newQty}`, type: 'success' });
      } else {
        const saved = await inventoryService.saveProduct(user.id, {
          productName: name,
          category: 'Geena Cloth',
          type: 'Plain',
          quantity: increment,
          image: null,
        });
        const newProduct: Product = {
          id: saved.id,
          productName: saved.product_name,
          category: saved.category,
          type: saved.type,
          quantity: saved.quantity,
          image: saved.image_url,
          createdAt: saved.created_at,
        };
        setProducts([...products, newProduct]);
        setAlertMessage({ message: `Created ${name} with ${increment} qty`, type: 'success' });
      }
      setTimeout(() => setAlertMessage(null), 3000);
      setQuickAddQtyMap(prev => ({ ...prev, [name]: '' }));
    } catch (error) {
      console.error('Error quick-adding plain:', error);
      setAlertMessage({ message: 'Operation failed. Please try again.', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group products by type (Printed first, then Plain)
  const groupedProducts = filteredProducts.reduce((acc: {[key: string]: Product[]}, product) => {
    if (!acc[product.type]) {
      acc[product.type] = [];
    }
    acc[product.type].push(product);
    return acc;
  }, {});

  // Sort groups: Printed first, then Plain
  const sortedGroups = Object.entries(groupedProducts).sort(([typeA], [typeB]) => {
    if (typeA === 'Printed' && typeB === 'Plain') return -1;
    if (typeA === 'Plain' && typeB === 'Printed') return 1;
    return 0;
  });

  // ProductCard Component
  const ProductCard = ({ product, isDarkMode, onSelect }: { product: Product; isDarkMode: boolean; onSelect: () => void }) => (
    <div
      onClick={onSelect}
      className="rounded-xl overflow-hidden transition-transform hover:scale-105 cursor-pointer"
      style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0', border: `1px solid ${isDarkMode ? '#7aa6f0' : '#10b981'}` }}>
      {/* Image */}
      <div className="w-full h-40 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-4xl">
        {product.image ? (
          <img src={product.image} alt={product.productName} className="w-full h-full object-cover" />
        ) : (
          '📦'
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Category */}
        <div className="mb-2">
          <span className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
            Category
          </span>
          <p className="text-sm font-medium" style={{ color: '#ff69b4' }}>
            {product.category}
          </p>
        </div>

        {/* Type */}
        <div className="mb-2">
          <span className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
            Type
          </span>
          <p className="text-sm font-medium" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
            {product.type}
          </p>
        </div>

        {/* Product Name */}
        <div className="mb-3">
          <span className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
            Product
          </span>
          <h3 className="font-bold text-sm" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
            {product.productName}
          </h3>
        </div>

        {/* Quantity with Color-Coded Bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
              Qty
            </span>
            <span className="text-xs font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
              {product.quantity}
            </span>
          </div>
          {/* Color-coded rounded bar */}
          <div 
            className="h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              backgroundColor: product.quantity === 0 ? '#000000' : 
                              product.quantity <= 50 ? '#ef4444' : 
                              product.quantity <= 100 ? '#eab308' : 
                              '#10b981',
              width: '100%'
            }}>
            {product.quantity === 0 ? 'Out of Stock' : 
             product.quantity <= 50 ? 'Low Stock' : 
             product.quantity <= 100 ? 'Medium Stock' : 
             'In Stock'}
          </div>
        </div>

        <p className="text-xs text-center mt-3" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
          Click to edit or delete
        </p>
      </div>
    </div>
  );

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
            maxWidth: '100%',
          }}>
          <span className="text-2xl">
            {alertMessage.type === 'success' ? '✅' : '❌'}
          </span>
          <p style={{
            color: alertMessage.type === 'success'
              ? (isDarkMode ? '#86efac' : '#15803d')
              : (isDarkMode ? '#fca5a5' : '#991b1b'),
            fontWeight: '600',
            fontSize: '14px'
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
              fontSize: '20px',
              color: 'inherit',
            }}>
            ✕
          </button>
        </div>
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
            top: 20px;
            right: 20px;
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
            {/* Search Bar and Add Product Button */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0', border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
              <span className="text-lg">🔍</span>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none"
                style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}
              />
            </div>
            
            <Button 
              onClick={() => setShowModal(true)}
              variant="secondary"
            >
              Add Product
            </Button>
            <Button
              onClick={handleExport}
              variant="secondary"
              disabled={exportLoading || products.length === 0}
            >
              {exportLoading ? '⏳...' : '📤 Export'}
            </Button>
          </div>

          {/* Products Grid - Grouped by Type with Mobile Carousel */}
          {filteredProducts.length > 0 ? (
            <div className="space-y-8">
              {sortedGroups.map(([type, groupProducts]) => (
                <div key={type} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      {type}
                    </h3>
                    <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#ff69b4', color: '#ffffff' }}>
                      {groupProducts.length}
                    </span>
                    {type === 'Plain' && (
                      <Button onClick={() => setShowQuickPlainModal(true)} variant="secondary">
                        Quick Add Plain
                      </Button>
                    )}
                    {type === 'Printed' && (
                      <Button onClick={() => setShowQuickPrintedModal(true)} variant="secondary">
                        Quick Add Printed
                      </Button>
                    )}
                  </div>

                  {/* Desktop Grid / Mobile Carousel */}
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupProducts.map(product => (
                      <ProductCard 
                        key={product.id}
                        product={product}
                        isDarkMode={isDarkMode}
                        onSelect={() => setExpandedProductId(product.id)}
                      />
                    ))}
                  </div>

                  {/* Mobile Carousel */}
                  <div className="md:hidden -mx-6">
                    <div className="relative">
                      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide" 
                        style={{
                          scrollBehavior: 'smooth',
                        }}>
                        <div className="flex gap-4 pb-4 px-6" style={{ width: 'max-content' }}>
                          {groupProducts.map((product) => (
                            <div key={product.id} className="snap-start flex-shrink-0" style={{ width: 'calc(100vw - 48px)' }}>
                              <ProductCard 
                                product={product}
                                isDarkMode={isDarkMode}
                                onSelect={() => setExpandedProductId(product.id)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-center mt-2" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                        Swipe to see more →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                {searchTerm ? 'No products found' : 'No products yet. Add one to get started!'}
              </p>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* Product Detail Modal - Pop Out Card */}
      <Modal isOpen={!!(expandedProductId && products.find(p => p.id === expandedProductId))} onClose={() => setExpandedProductId(null)} contentClassName="max-w-md overflow-hidden" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#efe5f0' }}>
            {(() => {
              const product = products.find(p => p.id === expandedProductId);
              if (!product) return null;
              return (
                <>
                  {/* Product Image with Close Button */}
                  <div className="w-full h-48 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-6xl relative">
                    {product.image ? (
                      <img src={product.image} alt={product.productName} className="w-full h-full object-cover" />
                    ) : (
                      '📦'
                    )}
                    <button
                      onClick={() => setExpandedProductId(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-lg hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff', cursor: 'pointer', border: 'none' }}>
                      ✕
                    </button>
                  </div>

                  {/* Product Details */}
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      {product.productName}
                    </h2>

                    <div className="space-y-3 mb-6 pb-6" style={{ borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                      <div className="flex justify-between items-center">
                        <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Category:</span>
                        <span className="font-medium" style={{ color: '#ff69b4' }}>{product.category}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Type:</span>
                        <span className="font-medium" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{product.type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Quantity:</span>
                        <span className="font-bold text-lg" style={{ color: product.quantity > 0 ? '#10b981' : '#ef4444' }}>
                          {product.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => handleEditProduct(product)}
                        variant="secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1 }}>
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(product.id)}
                        variant="secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1 }}>
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
      </Modal>

      {/* Add Product Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
            {/* Modal Header - Fixed */}
            <div className="flex justify-between items-center p-4 md:p-6 flex-shrink-0" style={{ borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
              <h2 className="text-xl md:text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                {editingProductId ? 'Adjust Quantity' : 'Add Product'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProductId(null);
                  setFormData({ category: '', type: '', productName: '', quantity: '', image: null });
                }}
                className="text-2xl"
                style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            {editingProductId ? (
              <div className="modal-scroll flex-1 p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Add Yards
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(e.target.value)}
                      placeholder="Enter yards to add"
                      className="flex-1 px-4 py-2 rounded-lg outline-none transition-all"
                      style={{
                        backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      }}
                    />
                    <Button onClick={() => handleAddQuantity(editingProductId!, parseInt(addQuantity || '0'))} variant="secondary">
                      Add Quantity
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={() => handleAddQuantity(editingProductId!, 50)} variant="secondary">+50</Button>
                    <Button onClick={() => handleAddQuantity(editingProductId!, 100)} variant="secondary">+100</Button>
                    <Button onClick={() => handleAddQuantity(editingProductId!, 150)} variant="secondary">+150</Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddProduct} className="modal-scroll flex-1 p-4 md:p-6 space-y-4" id="product-form">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Category
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const selected = e.target.value;
                        if (selected) {
                          setFormData({...formData, category: selected, type: '', productName: ''});
                        }
                      }}
                      className="w-full md:flex-1 px-4 py-2 rounded-lg outline-none transition-all"
                      style={{
                        backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      }}>
                      <option value="">Select from list...</option>
                      {Array.from(new Set([...Object.keys(catalogData), ...products.map(p => p.category)])).sort().map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="or type..."
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full md:flex-1 px-4 py-2 rounded-lg outline-none transition-all"
                      style={{
                        backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value, productName: ''})}
                    disabled={!formData.category}
                    className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      opacity: !formData.category ? 0.5 : 1,
                      cursor: !formData.category ? 'not-allowed' : 'pointer',
                    }}>
                    <option value="">Select a type</option>
                    <option value="Plain">Plain</option>
                    <option value="Printed">Printed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Product Name
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <select
                      value={formData.productName}
                      onChange={(e) => {
                        const selected = e.target.value;
                        if (selected) {
                          setFormData({...formData, productName: selected});
                        }
                      }}
                      disabled={!formData.type}
                      className="w-full md:flex-1 px-4 py-2 rounded-lg outline-none transition-all"
                      style={{
                        backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                        opacity: !formData.type ? 0.5 : 1,
                        cursor: !formData.type ? 'not-allowed' : 'pointer',
                      }}>
                      <option value="">Select from list...</option>
                      {getAvailableProductNames().map((product: string) => (
                        <option key={product} value={product}>{product}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="or type..."
                      value={formData.productName}
                      onChange={(e) => setFormData({...formData, productName: e.target.value})}
                      className="w-full md:flex-1 px-4 py-2 rounded-lg outline-none transition-all"
                      style={{
                        backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="Enter quantity"
                    className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                    }}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    Image (Optional)
                  </label>
                  <ImageUpload 
                    onImageSelect={(file) => setFormData({...formData, image: file})}
                    accept="image/*"
                  />
                </div>
              </form>
            )}

            {/* Modal Footer - Fixed */}
            <div className="flex gap-3 p-6 flex-shrink-0" style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`, backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
              <Button 
                onClick={() => {
                  setShowModal(false);
                  setEditingProductId(null);
                  setFormData({ category: '', type: '', productName: '', quantity: '', image: null });
                  setAddQuantity('');
                }}
                variant="primary"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              {editingProductId ? (
                <Button 
                  onClick={() => handleAddQuantity(editingProductId!, parseInt(addQuantity || '0'))}
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  Add Quantity
                </Button>
              ) : (
                <Button 
                  type="submit"
                  form="product-form"
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  Save Product
                </Button>
              )}
            </div>
      </Modal>

      {/* Quick Add Printed Modal */}
      <Modal isOpen={showQuickPrintedModal} onClose={() => setShowQuickPrintedModal(false)} style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
        <div className="flex justify-between items-center p-4 md:p-6" style={{ borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>Quick Add: Printed</h2>
          <button onClick={() => setShowQuickPrintedModal(false)} className="text-2xl" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>✕</button>
        </div>
        <div className="p-4 md:p-6 space-y-3">
          {((catalogData['Geena Cloth'] as any)['Printed'] as string[]).map((name) => {
            const existing = products.find(p => p.category === 'Geena Cloth' && p.type === 'Printed' && p.productName === name);
            const currentQty = existing?.quantity || 0;
            return (
              <div key={name} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{name}</div>
                  <div className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Current: {currentQty}</div>
                </div>
                <input
                  type="number"
                  value={quickAddQtyMap[name] || ''}
                  onChange={(e) => setQuickAddQtyMap(prev => ({ ...prev, [name]: e.target.value }))}
                  placeholder="yards"
                  className="w-24 px-3 py-2 rounded-lg outline-none"
                  style={{
                    backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                    color: isDarkMode ? '#e8eaed' : '#2c3e50',
                    border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                  }}
                />
                <Button onClick={() => handleQuickAddPlain(name, parseInt(quickAddQtyMap[name] || '0'))} variant="secondary">Add</Button>
                <Button onClick={() => handleQuickAddPlain(name, 50)} variant="secondary">+50</Button>
                <Button onClick={() => handleQuickAddPlain(name, 100)} variant="secondary">+100</Button>
                <Button onClick={() => handleQuickAddPlain(name, 150)} variant="secondary">+150</Button>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Quick Add Plain Modal */}
      <Modal isOpen={showQuickPlainModal} onClose={() => setShowQuickPlainModal(false)} style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
        <div className="flex justify-between items-center p-4 md:p-6" style={{ borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>Quick Add: Plain</h2>
          <button onClick={() => setShowQuickPlainModal(false)} className="text-2xl" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>✕</button>
        </div>
        <div className="p-4 md:p-6 space-y-3">
          {((catalogData['Geena Cloth'] as any)['Plain'] as string[]).map((name) => {
            const existing = products.find(p => p.category === 'Geena Cloth' && p.type === 'Plain' && p.productName === name);
            const currentQty = existing?.quantity || 0;
            return (
              <div key={name} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{name}</div>
                  <div className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Current: {currentQty}</div>
                </div>
                <input
                  type="number"
                  value={quickAddQtyMap[name] || ''}
                  onChange={(e) => setQuickAddQtyMap(prev => ({ ...prev, [name]: e.target.value }))}
                  placeholder="yards"
                  className="w-24 px-3 py-2 rounded-lg outline-none"
                  style={{
                    backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                    color: isDarkMode ? '#e8eaed' : '#2c3e50',
                    border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                  }}
                />
                <Button onClick={() => handleQuickAddPrinted(name, parseInt(quickAddQtyMap[name] || '0'))} variant="secondary">Add</Button>
                <Button onClick={() => handleQuickAddPrinted(name, 50)} variant="secondary">+50</Button>
                <Button onClick={() => handleQuickAddPrinted(name, 100)} variant="secondary">+100</Button>
                <Button onClick={() => handleQuickAddPrinted(name, 150)} variant="secondary">+150</Button>
              </div>
            );
          })}
        </div>
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
                ⚠️ Delete Product?
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
                Are you sure you want to delete this product? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="primary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmDeleteProduct}
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  🗑️ Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
