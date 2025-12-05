'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/themeContext';
import * as inventoryService from '@/lib/inventoryService';
import * as shopSalesService from '@/lib/shopSalesService';
import Loader from '@/components/Loader';
import Button from '@/components/Button';

interface Product {
  id: string;
  productName: string;
  category: string;
  type: string;
  quantity: number;
}

interface OrderProduct {
  productId: string;
  productName?: string;
  quantity: string;
  itemPrice: number;
}

interface SaleProduct {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Sale {
  id: string;
  shop: 'Shopee' | 'TikTok' | 'Lazada';
  // Buyer info
  buyerName?: string;
  contactNo?: string;
  address?: string;
  // Single product fields (for backwards compatibility)
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  status?: 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled';
  // Released date/time for Delivered status (when money is released)
  releasedDate?: string;
  releasedTime?: string; // Time in HH:mm format
  // Auto-computed: when status will change to Completed (12 hours after released)
  completedAt?: string;
  // Income status: Pending (Shipped) or Released (Delivered/Completed)
  incomeStatus?: 'Pending' | 'Released';
  // Multiple products support
  products?: SaleProduct[];
  // Payment Details
  shippingFeePaidByBuyer?: number;
  estimatedShippingFeeCharged?: number;
  shippingFeeRebate?: number;
  serviceFee?: number;
  transactionFee?: number;
  tax?: number;
  merchandiseSubtotal?: number;
  shippingFee?: number;
  shopeeVoucher?: number;
  sellerVoucher?: number;
  paymentDiscount?: number;
  shopeeCoinRedeem?: number;
  totalBuyerPayment?: number;
  paymentMethod?: string;
}

export default function ShopSalesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode, isThemeSwitching } = useTheme();
  const [currentPage] = useState('shopsales');
  const [showModal, setShowModal] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null); // Track which sale is being edited
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'product' | 'orderId' | 'date' | 'status'>('product');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterOrderDate, setFilterOrderDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedShop, setSelectedShop] = useState<'Shopee' | 'TikTok' | 'Lazada'>('Shopee');
  const [products, setProducts] = useState<Product[]>([]);
  const [alertMessage, setAlertMessage] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  // Import CSV state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sales data - loaded from Supabase
  const [sales, setSales] = useState<Sale[]>([]);

  const [formData, setFormData] = useState({
    shop: 'Shopee' as 'Shopee' | 'TikTok' | 'Lazada',
    buyerName: '',
    contactNo: '',
    address: '',
    orderNumber: '',
    dateOrdered: new Date().toISOString().split('T')[0],
    products: [{ productId: '', quantity: '', itemPrice: 0 }] as OrderProduct[],
    // Payment Details
    estimatedShippingFeeCharged: 0,
    shippingFeeRebate: 0,
    serviceFee: 0,
    transactionFee: 0,
    withholdingTax: 0,
    // Status
    status: 'Delivered' as 'Shipped' | 'Delivered' | 'Cancelled' | 'Completed',
    releasedDate: '', // Date when money is released (for Delivered status)
    releasedTime: '', // Time when money is released
    cancellationReason: '',
  });

  const [expandedSections, setExpandedSections] = useState({
    buyer: true,
    order: true,
    payment: false,
    status: false,
  });

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

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

  // Function to load sales from Supabase
  const loadSalesFromSupabase = async (userId: string) => {
    try {
      const supabaseSales = await shopSalesService.loadShopSales(userId);
      // Convert Supabase format to UI format
      const formattedSales: Sale[] = supabaseSales.map(s => ({
        id: s.order_id,
        shop: s.shop as 'Shopee' | 'TikTok' | 'Lazada',
        buyerName: s.buyer_name || '',
        contactNo: s.buyer_contact || '',
        address: s.buyer_address || '',
        productId: s.id, // Use UUID as productId for now
        productName: s.product_name,
        quantity: s.quantity,
        unitPrice: s.item_price,
        total: s.subtotal,
        date: s.order_date,
        status: s.status as 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled',
        releasedDate: s.released_date || undefined,
        releasedTime: s.released_time || undefined,
        incomeStatus: s.income_status as 'Pending' | 'Released',
        // Payment details from Supabase
        estimatedShippingFeeCharged: s.shipping_fee_charged,
        shippingFeeRebate: s.shipping_fee_rebate,
        serviceFee: s.service_fee,
        transactionFee: s.transaction_fee,
        tax: s.tax,
        merchandiseSubtotal: s.merchandise_subtotal,
        shippingFee: s.shipping_fee,
        shopeeVoucher: s.shopee_voucher,
        sellerVoucher: s.seller_voucher,
        paymentDiscount: s.payment_discount,
        shopeeCoinRedeem: s.shopee_coin_redeem,
        totalBuyerPayment: s.total_buyer_payment,
      }));
      setSales(formattedSales);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  // CSV Import handler
  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setImportLoading(true);
    setImportProgress('Reading file...');

    try {
      const text = await file.text();
      setImportProgress('Parsing CSV...');
      
      const parsedSales = shopSalesService.parseCSVFile(text, user.id);
      
      if (parsedSales.length === 0) {
        setAlertMessage({ message: 'No valid sales found in CSV', type: 'error' });
        setTimeout(() => setAlertMessage(null), 3000);
        setImportLoading(false);
        setShowImportModal(false);
        return;
      }

      setImportProgress(`Importing ${parsedSales.length} sales to Supabase...`);
      
      const result = await shopSalesService.bulkInsertSales(parsedSales);
      
      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
      }

      setImportProgress('Refreshing data...');
      await loadSalesFromSupabase(user.id);

      setAlertMessage({ 
        message: `✅ Successfully imported ${result.inserted} sales!${result.errors.length > 0 ? ` (${result.errors.length} errors)` : ''}`, 
        type: 'success' 
      });
      setTimeout(() => setAlertMessage(null), 5000);
      
    } catch (error) {
      console.error('Import error:', error);
      setAlertMessage({ message: 'Error importing CSV. Please check the file format.', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    } finally {
      setImportLoading(false);
      setImportProgress('');
      setShowImportModal(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clear all sales (for re-import)
  const handleClearAllSales = async () => {
    if (!user) return;
    
    const confirmed = window.confirm('Are you sure you want to delete ALL sales? This cannot be undone.');
    if (!confirmed) return;

    try {
      setImportLoading(true);
      setImportProgress('Deleting all sales...');
      await shopSalesService.deleteAllSales(user.id);
      setSales([]);
      setAlertMessage({ message: 'All sales deleted successfully', type: 'success' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Error clearing sales:', error);
      setAlertMessage({ message: 'Error deleting sales', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    } finally {
      setImportLoading(false);
      setImportProgress('');
      setShowImportModal(false);
    }
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
        
        // Load products from Supabase Inventory
        const inventoryProducts = await inventoryService.loadInventoryProducts(session.user.id);
        const formatted = inventoryProducts.map(p => ({
          id: p.id,
          productName: p.product_name,
          category: p.category,
          type: p.type,
          quantity: p.quantity,
        }));
        setProducts(formatted);

        // Load sales from Supabase
        await loadSalesFromSupabase(session.user.id);
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

  // Auto-update Delivered sales to Completed after 12 hours from released date/time
  useEffect(() => {
    const checkAndUpdateStatus = () => {
      const now = new Date();
      let hasUpdates = false;
      
      const updatedSales = sales.map(sale => {
        // Only check Delivered status with releasedDate
        if (sale.status === 'Delivered' && sale.releasedDate) {
          // Parse released date and time
          const releasedDateTime = new Date(sale.releasedDate);
          if (sale.releasedTime) {
            const [hours, minutes] = sale.releasedTime.split(':').map(Number);
            releasedDateTime.setHours(hours, minutes, 0, 0);
          } else {
            // Default to 00:00 if no time specified
            releasedDateTime.setHours(0, 0, 0, 0);
          }
          
          // Calculate 12 hours later
          const completedTime = new Date(releasedDateTime.getTime() + 12 * 60 * 60 * 1000);
          
          // Check if 12 hours have passed
          if (now >= completedTime) {
            hasUpdates = true;
            return {
              ...sale,
              status: 'Completed' as const,
              completedAt: completedTime.toISOString(),
              incomeStatus: 'Released' as const,
            };
          }
        }
        return sale;
      });
      
      if (hasUpdates) {
        setSales(updatedSales);
      }
    };

    // Check immediately on mount
    checkAndUpdateStatus();
    
    // Check every minute
    const interval = setInterval(checkAndUpdateStatus, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [sales]);

  if (!mounted) {
    return null;
  }

  // Calculate Estimated Order Income based on current form data
  const calculateEstimatedOrderIncome = () => {
    const merchandiseSubtotal = formData.products.reduce(
      (sum, p) => sum + (parseFloat(p.quantity) || 0) * p.itemPrice,
      0
    );
    const shippingFeeSubtotal = formData.estimatedShippingFeeCharged - formData.shippingFeeRebate;
    const totalFees = -(formData.serviceFee + formData.transactionFee + formData.withholdingTax);
    
    return merchandiseSubtotal + shippingFeeSubtotal + totalFees;
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.buyerName || !formData.contactNo || formData.products.length === 0 || !formData.products[0].productId) {
      alert('Please fill in required fields');
      return;
    }

    if (!user) {
      alert('User not authenticated');
      return;
    }

    try {
      // Build products array for the order
      const saleProducts: SaleProduct[] = [];
      let orderTotal = 0;
      let totalQuantity = 0;
      
      for (const prod of formData.products) {
        if (!prod.productId || !prod.quantity) continue;
        
        const selectedProduct = products.find(p => p.id === prod.productId);
        if (!selectedProduct) continue;

        const quantity = parseInt(prod.quantity);
        const unitPrice = prod.itemPrice || 0;
        const subtotal = quantity * unitPrice;

        saleProducts.push({
          productId: prod.productId,
          productName: selectedProduct.productName,
          quantity,
          unitPrice,
          subtotal,
        });

        orderTotal += subtotal;
        totalQuantity += quantity;

        // Handle inventory sync based on status for each product
        try {
          const saleId = formData.orderNumber || `sale_${Date.now()}`;
          if (formData.status === 'Cancelled') {
            await inventoryService.handleOrderCancellation(
              user.id,
              saleId,
              prod.productId,
              quantity
            );
          } else if (['Completed', 'Shipped', 'Delivered'].includes(formData.status)) {
            await inventoryService.syncOrderWithInventory(
              user.id,
              saleId,
              prod.productId,
              quantity,
              formData.status
            );
          }
        } catch (error) {
          console.error('Error syncing inventory for product:', error);
        }
      }

      if (saleProducts.length === 0) {
        alert('No valid products to save');
        return;
      }

      // Check if this is an update (order number already exists)
      const existingSaleIndex = sales.findIndex(s => s.id === formData.orderNumber);
      const isEditing = existingSaleIndex !== -1;

      // Create single sale with all products
      // Determine income status based on order status
      const incomeStatus: 'Pending' | 'Released' = 
        formData.status === 'Shipped' ? 'Pending' : 
        (formData.status === 'Delivered' || formData.status === 'Completed') ? 'Released' : 'Pending';
      
      const newSale: Sale = {
        id: formData.orderNumber || `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shop: formData.shop,
        // Buyer info
        buyerName: formData.buyerName || '',
        contactNo: formData.contactNo || '',
        address: formData.address || '',
        // First product info for backwards compatibility
        productId: saleProducts[0].productId,
        productName: saleProducts.length > 1 
          ? `${saleProducts[0].productName} (+${saleProducts.length - 1} more)`
          : saleProducts[0].productName,
        quantity: totalQuantity,
        unitPrice: saleProducts[0].unitPrice,
        total: orderTotal,
        date: new Date(formData.dateOrdered).toISOString(),
        status: formData.status || 'Delivered',
        // Released date/time and income status
        releasedDate: formData.status === 'Delivered' ? formData.releasedDate : undefined,
        releasedTime: formData.status === 'Delivered' ? formData.releasedTime : undefined,
        incomeStatus: incomeStatus,
        // Store all products
        products: saleProducts,
        // Payment details
        estimatedShippingFeeCharged: formData.estimatedShippingFeeCharged || 0,
        shippingFeeRebate: formData.shippingFeeRebate || 0,
        serviceFee: formData.serviceFee || 0,
        transactionFee: formData.transactionFee || 0,
        tax: formData.withholdingTax || 0,
      };

      // If Completed, create CashFlow entry
      if (formData.status === 'Completed') {
        try {
          const estimatedOrderIncome = calculateEstimatedOrderIncome();
          await inventoryService.createCashFlowEntry(
            user.id,
            'Released Income',
            estimatedOrderIncome,
            `Sale from ${formData.shop} - Order #${newSale.id}`,
            newSale.id
          );
        } catch (error) {
          console.error('Error creating cashflow entry:', error);
        }
      }

      // If Cancelled, add to returned_parcels for restocking later
      if (formData.status === 'Cancelled') {
        try {
          const returnedParcel = {
            id: `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId: newSale.id,
            shop: formData.shop,
            products: saleProducts.map(p => ({
              productId: p.productId,
              productName: p.productName,
              quantity: p.quantity,
            })),
            returnDate: new Date().toISOString(),
            status: 'Pending' as const,
          };
          
          const existingReturns = JSON.parse(localStorage.getItem('returned_parcels') || '[]');
          // Check if this order is already in returns (to avoid duplicates on edit)
          const filteredReturns = existingReturns.filter((r: any) => r.orderId !== newSale.id);
          localStorage.setItem('returned_parcels', JSON.stringify([returnedParcel, ...filteredReturns]));
        } catch (error) {
          console.error('Error saving to returned parcels:', error);
        }
      }

      if (isEditing) {
        // Update existing sale
        const updatedSales = [...sales];
        updatedSales[existingSaleIndex] = newSale;
        setSales(updatedSales);
        setAlertMessage({ message: `Order updated with ${saleProducts.length} product(s) - Updated na ni Gab sa Library ng app natin`, type: 'success' });
      } else {
        // Add new sale
        setSales([newSale, ...sales]);
        setAlertMessage({ message: `Order with ${saleProducts.length} product(s) - Filed and Saved na ni Gab sa Library ng app natin`, type: 'success' });
      }
      setTimeout(() => setAlertMessage(null), 3000);
      setFormData({
        shop: selectedShop,
        buyerName: '',
        contactNo: '',
        address: '',
        orderNumber: '',
        dateOrdered: new Date().toISOString().split('T')[0],
        products: [{ productId: '', quantity: '', itemPrice: 0 }],
        estimatedShippingFeeCharged: 0,
        shippingFeeRebate: 0,
        serviceFee: 0,
        transactionFee: 0,
        withholdingTax: 0,
        status: 'Delivered',
        releasedDate: '',
        releasedTime: '',
        cancellationReason: '',
      });
      setExpandedSections({ buyer: true, order: true, payment: false, status: false });
      setEditingSaleId(null); // Clear editing state
      setShowModal(false);
    } catch (error) {
      console.error('Error adding sale:', error);
      alert('Error adding sale. Please try again.');
    }
  };

  const handleDeleteSale = async (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSale = async () => {
    if (!deleteTargetId) return;
    try {
      const sale = sales.find(s => s.id === deleteTargetId);
      
      // If sale was Completed, also delete its CashFlow entry
      if (sale && sale.status === 'Completed' && user) {
        try {
          await inventoryService.deleteCashFlowByReference(deleteTargetId);
        } catch (error) {
          console.error('Error deleting cashflow entry:', error);
          // Continue with deletion even if cashflow cleanup fails
        }
      }
      
      setSales(sales.filter(s => s.id !== deleteTargetId));
      setExpandedSaleId(null);
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setAlertMessage({ message: 'Tinapon na ni Cosyne', type: 'success' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting sale:', error);
      setAlertMessage({ message: 'Error deleting sale', type: 'error' });
      setTimeout(() => setAlertMessage(null), 3000);
    }
  };

  const handleStatusChange = async (saleId: string, newStatus: string) => {
    try {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;

      const oldStatus = sale.status;

      // Update local state first
      setSales(sales.map(s => 
        s.id === saleId ? { ...s, status: newStatus as any } : s
      ));

      if (!user) return;

      // Handle inventory sync based on status change
      if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
        // Sale was cancelled - add quantity back to inventory
        try {
          await inventoryService.handleOrderCancellation(
            user.id,
            saleId,
            sale.productId,
            sale.quantity
          );
        } catch (error) {
          console.error('Error restoring inventory on cancellation:', error);
        }

        // Add to returned_parcels for restocking later
        try {
          const products = sale.products || [{ productId: sale.productId, productName: sale.productName, quantity: sale.quantity }];
          const returnedParcel = {
            id: `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId: saleId,
            shop: sale.shop,
            products: products.map(p => ({
              productId: p.productId,
              productName: p.productName,
              quantity: p.quantity,
            })),
            returnDate: new Date().toISOString(),
            status: 'Pending' as const,
          };
          
          const existingReturns = JSON.parse(localStorage.getItem('returned_parcels') || '[]');
          const filteredReturns = existingReturns.filter((r: any) => r.orderId !== saleId);
          localStorage.setItem('returned_parcels', JSON.stringify([returnedParcel, ...filteredReturns]));
        } catch (error) {
          console.error('Error saving to returned parcels:', error);
        }
      } else if (newStatus === 'Delivered' && oldStatus === 'Cancelled') {
        // Sale was un-cancelled - deduct quantity again
        try {
          await inventoryService.syncOrderWithInventory(
            user.id,
            saleId,
            sale.productId,
            sale.quantity,
            newStatus
          );
        } catch (error) {
          console.error('Error syncing inventory on un-cancel:', error);
        }

        // Remove from returned_parcels since order is no longer cancelled
        try {
          const existingReturns = JSON.parse(localStorage.getItem('returned_parcels') || '[]');
          const filteredReturns = existingReturns.filter((r: any) => r.orderId !== saleId);
          localStorage.setItem('returned_parcels', JSON.stringify(filteredReturns));
        } catch (error) {
          console.error('Error removing from returned parcels:', error);
        }
      }
    } catch (error) {
      console.error('Error updating sale status:', error);
      alert('Error updating status. Please try again.');
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

  const filteredSales = sales.filter(sale => {
    const matchesShop = sale.shop === selectedShop;
    const matchesProductName = sale.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrderId = sale.id.toLowerCase().includes(filterOrderId.toLowerCase());
    const matchesOrderDate = filterOrderDate ? new Date(sale.date).toISOString().split('T')[0] === filterOrderDate : true;
    const matchesStatus = filterStatus ? sale.status === filterStatus : true;
    
    return matchesShop && matchesProductName && matchesOrderId && matchesOrderDate && matchesStatus;
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);

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

      {alertMessage && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 p-3 md:p-4 rounded-lg flex items-center gap-2 md:gap-3 shadow-lg"
          style={{
            backgroundColor: alertMessage.type === 'success' 
              ? (isDarkMode ? '#1a3a1a' : '#dcfce7')
              : (isDarkMode ? '#3a1a1a' : '#fee2e2'),
            border: `1px solid ${alertMessage.type === 'success'
              ? (isDarkMode ? '#15803d' : '#86efac')
              : (isDarkMode ? '#7c2d2d' : '#fecaca')}`,
            maxWidth: '100%'
          }}>
          <span className="text-2xl">{alertMessage.type === 'success' ? '✅' : '❌'}</span>
          <p style={{
            color: alertMessage.type === 'success'
              ? (isDarkMode ? '#86efac' : '#15803d')
              : (isDarkMode ? '#fca5a5' : '#991b1b'),
            fontWeight: '600',
            fontSize: '14px',
            margin: 0
          }}>
            {alertMessage.message}
          </p>
          <button 
            onClick={() => setAlertMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: alertMessage.type === 'success'
                ? (isDarkMode ? '#86efac' : '#15803d')
                : (isDarkMode ? '#fca5a5' : '#991b1b'),
              marginLeft: 'auto',
              padding: '0 4px'
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
              onChange={() => {
                const newTheme = isDarkMode ? 'light' : 'dark';
                localStorage.setItem('theme', newTheme);
                document.documentElement.setAttribute('data-theme', newTheme);
                if (newTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.body.classList.add('dark-mode');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.body.classList.remove('dark-mode');
                }
                window.location.reload();
              }}
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
            {/* Shop Dropdown and Record Sale Button */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center gap-4">
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value as 'Shopee' | 'TikTok' | 'Lazada')}
                className="w-full md:w-xs px-4 py-3 rounded-lg outline-none transition-all font-semibold relative z-10"
                style={{
                  backgroundColor: isDarkMode ? '#2d2d44' : '#efe5f0',
                  color: isDarkMode ? '#e8eaed' : '#2c3e50',
                  border: `2px solid ${isDarkMode ? '#7aa6f0' : '#ff69b4'}`,
                  cursor: 'pointer',
                }}>
                <option value="Shopee">🛍️ Shopee</option>
                <option value="TikTok">🎵 TikTok</option>
                <option value="Lazada">🛒 Lazada</option>
              </select>
              <Button onClick={() => {
                // Reset form for new sale
                setFormData({
                  shop: selectedShop,
                  buyerName: '',
                  contactNo: '',
                  address: '',
                  orderNumber: '',
                  dateOrdered: new Date().toISOString().split('T')[0],
                  products: [{ productId: '', quantity: '', itemPrice: 0 }],
                  estimatedShippingFeeCharged: 0,
                  shippingFeeRebate: 0,
                  serviceFee: 0,
                  transactionFee: 0,
                  withholdingTax: 0,
                  status: 'Delivered',
                  releasedDate: '',
                  releasedTime: '',
                  cancellationReason: '',
                });
                setEditingSaleId(null); // Not editing, adding new
                setExpandedSections({ buyer: true, order: false, payment: false, status: false });
                setShowModal(true);
              }} variant="secondary">
                + Record Sale
              </Button>
              <Button onClick={() => setShowImportModal(true)} variant="secondary">
                📥 Import CSV
              </Button>
            </div>

            {/* Sales Summary */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Orders</p>
                <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{filteredSales.length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total Items</p>
                <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{totalQuantity}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Gross Sales</p>
                <p className="text-2xl font-bold" style={{ color: '#ff69b4' }}>₱{totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>From Supabase</p>
                <p className="text-lg font-bold" style={{ color: isDarkMode ? '#60a5fa' : '#3b82f6' }}>✓ Real-time</p>
              </div>
            </div>

          {/* Single Search Bar with Dynamic Filter Type */}
          <div className="mb-6 flex flex-col md:flex-row gap-3">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as 'product' | 'orderId' | 'date' | 'status');
                setSearchTerm('');
                setFilterOrderId('');
                setFilterOrderDate('');
                setFilterStatus('');
              }}
              className="px-4 py-3 rounded-lg outline-none transition-all font-semibold md:w-auto w-full relative z-10"
              style={{
                backgroundColor: isDarkMode ? '#2d2d44' : '#efe5f0',
                color: isDarkMode ? '#e8eaed' : '#2c3e50',
                border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                cursor: 'pointer',
              }}>
              <option value="product">📦 Product Name</option>
              <option value="orderId">🏷️ Order ID</option>
              <option value="date">📅 Order Date</option>
              <option value="status">📊 Status</option>
            </select>

            {filterType === 'product' && (
              <input
                type="text"
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                  color: isDarkMode ? '#e8eaed' : '#2c3e50',
                  border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                }}
              />
            )}

            {filterType === 'orderId' && (
              <input
                type="text"
                placeholder="Search order ID..."
                value={filterOrderId}
                onChange={(e) => setFilterOrderId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                  color: isDarkMode ? '#e8eaed' : '#2c3e50',
                  border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                }}
              />
            )}

            {filterType === 'date' && (
              <input
                type="date"
                value={filterOrderDate}
                onChange={(e) => setFilterOrderDate(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                  color: isDarkMode ? '#e8eaed' : '#2c3e50',
                  border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                }}
              />
            )}

            {filterType === 'status' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8',
                  color: isDarkMode ? '#e8eaed' : '#2c3e50',
                  border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                  cursor: 'pointer',
                }}>
                <option value="">All Status</option>
                <option value="Delivered">Delivered</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}
          </div>

          {/* Sales Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <div 
                  key={sale.id}
                  onClick={() => setExpandedSaleId(sale.id)}
                  className="rounded-lg p-5 transition-all hover:shadow-lg cursor-pointer flex flex-col"
                  style={{ 
                    backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#7aa6f0' : '#d1d5db'}`,
                    minHeight: '280px',
                  }}>
                  {/* Order ID & Status Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Order ID</p>
                      <p className="font-bold text-sm" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        {sale.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sale.products && sale.products.length > 1 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                          backgroundColor: isDarkMode ? '#4c1d95' : '#ede9fe',
                          color: isDarkMode ? '#c4b5fd' : '#6d28d9',
                        }}>
                          {sale.products.length} items
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                        backgroundColor: sale.status === 'Shipped' ? '#fef3c7' : sale.status === 'Delivered' ? '#dbeafe' : sale.status === 'Completed' ? '#dcfce7' : '#fee2e2',
                        color: sale.status === 'Shipped' ? '#92400e' : sale.status === 'Delivered' ? '#1e40af' : sale.status === 'Completed' ? '#15803d' : '#991b1b',
                      }}>
                        {sale.status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Shop Badge */}
                  <div className="mb-3 pb-3" style={{ borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#d1d5db'}` }}>
                    <span className="inline-block px-3 py-1 rounded-lg text-sm font-semibold" style={{
                      backgroundColor: isDarkMode ? '#2d2d44' : '#f3f4f6',
                      color: isDarkMode ? '#7aa6f0' : '#ff69b4',
                    }}>
                      {sale.shop === 'Shopee' && '🛍️'} {sale.shop === 'TikTok' && '🎵'} {sale.shop === 'Lazada' && '🛒'} {sale.shop}
                    </span>
                  </div>

                  {/* Products Info - Flex grow to push footer down */}
                  <div className="flex-1">
                    {sale.products && sale.products.length > 1 ? (
                      <div className="mb-3 space-y-2">
                        <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                          Products ({sale.products.length} items)
                        </p>
                        {/* Show first 3 products only in card view */}
                        {sale.products.slice(0, 3).map((prod, idx) => (
                          <div key={`${sale.id}-prod-${idx}`} className="flex justify-between items-center py-1 px-2 rounded" style={{
                            backgroundColor: isDarkMode ? '#2d2d44' : '#f9fafb',
                            border: `1px solid ${isDarkMode ? '#3d3d54' : '#e5e7eb'}`,
                          }}>
                            <div className="flex-1">
                              <p className="font-medium text-sm" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                                {prod.productName}
                              </p>
                              <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                                {prod.quantity} × ₱{prod.unitPrice.toFixed(2)}
                              </p>
                            </div>
                            <p className="font-semibold text-sm" style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>
                              ₱{prod.subtotal.toFixed(2)}
                            </p>
                          </div>
                        ))}
                        {/* Show "and X more" if more than 3 products */}
                        {sale.products.length > 3 && (
                          <div className="text-center py-2 rounded" style={{
                            backgroundColor: isDarkMode ? '#2d2d44' : '#f9fafb',
                            border: `1px solid ${isDarkMode ? '#3d3d54' : '#e5e7eb'}`,
                          }}>
                            <p className="text-xs font-medium" style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>
                              👆 Click to see {sale.products.length - 3} more items
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Single Product Info */}
                        <div className="mb-3">
                          <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Product</p>
                          <p className="font-semibold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            {sale.productName}
                          </p>
                        </div>

                        {/* Quantity & Price */}
                        <div className="grid grid-cols-2 gap-3 mb-3 pb-3" style={{ borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#d1d5db'}` }}>
                          <div>
                            <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Quantity</p>
                            <p className="font-bold text-lg" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              {sale.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Unit Price</p>
                            <p className="font-bold text-lg" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              ₱{sale.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer - Always at bottom */}
                  <div className="mt-auto">
                    {/* Total */}
                    <div className="flex justify-between items-center pt-2" style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#d1d5db'}` }}>
                      <p className="text-sm font-medium" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                        {sale.products && sale.products.length > 1 ? 'Order Total' : 'Total'}
                      </p>
                      <p className="font-bold text-xl" style={{ color: '#ff69b4' }}>
                        ₱{sale.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Date */}
                    <p className="text-xs mt-3 pt-3" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#d1d5db'}` }}>
                      📅 {new Date(sale.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>No sales records found</p>
              </div>
            )}
          </div>
            </div>

          {/* Add Sale Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="rounded-2xl w-full max-w-[95vw] md:max-w-2xl flex flex-col max-h-[90vh] relative" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
                {/* Modal Header - Fixed */}
                <div className="flex justify-between items-center p-6 flex-shrink-0" style={{ borderBottom: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                  <h2 className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                    {editingSaleId ? '✏️ Edit Sale' : '➕ Record Sale'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingSaleId(null);
                    }}
                    className="text-2xl"
                    style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                    ✕
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <form onSubmit={handleAddSale} className="flex-1 overflow-y-auto p-6 space-y-4" id="sale-form">
                  {/* SECTION 1: BUYER INFORMATION - COLLAPSIBLE */}
                  <div style={{ border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, borderRadius: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedSections(expandedSections.buyer ? { buyer: false, order: false, payment: false, status: false } : { buyer: true, order: false, payment: false, status: false })}
                      className="w-full px-4 py-3 flex justify-between items-center hover:opacity-80 transition"
                      style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8' }}>
                      <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        👤 Buyer Information
                      </h3>
                      <span style={{ transform: expandedSections.buyer ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </button>
                    {expandedSections.buyer && (
                      <div className="p-4 space-y-3 border-t" style={{ borderColor: isDarkMode ? '#3d3d54' : '#e1e8ed' }}>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Name
                          </label>
                          <input
                            type="text"
                            value={formData.buyerName}
                            onChange={(e) => setFormData({...formData, buyerName: e.target.value})}
                            placeholder="Enter buyer name"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Contact No.
                          </label>
                          <input
                            type="text"
                            value={formData.contactNo}
                            onChange={(e) => setFormData({...formData, contactNo: e.target.value})}
                            placeholder="Enter contact number"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Address
                          </label>
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="Enter address"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: ORDER INFORMATION - COLLAPSIBLE */}
                  <div style={{ border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, borderRadius: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedSections(expandedSections.order ? { buyer: false, order: false, payment: false, status: false } : { buyer: false, order: true, payment: false, status: false })}
                      className="w-full px-4 py-3 flex justify-between items-center hover:opacity-80 transition"
                      style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8' }}>
                      <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        📦 Order Information
                      </h3>
                      <span style={{ transform: expandedSections.order ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </button>
                    {expandedSections.order && (
                      <div className="p-4 space-y-3 border-t" style={{ borderColor: isDarkMode ? '#3d3d54' : '#e1e8ed' }}>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              Date Ordered
                            </label>
                            <input
                              type="date"
                              value={formData.dateOrdered}
                              onChange={(e) => setFormData({...formData, dateOrdered: e.target.value})}
                              className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                              style={{
                                backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                                color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              Order Number
                            </label>
                            <input
                              type="text"
                              value={formData.orderNumber}
                              onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                              placeholder="Order #"
                              className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                              style={{
                                backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                                color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Products List */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              Products
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, products: [...formData.products, { productId: '', quantity: '', itemPrice: 0 }]})}
                              className="text-xs px-2 py-1 rounded transition-all hover:opacity-90"
                              style={{ 
                                backgroundColor: isDarkMode ? '#3d3d54' : '#d4a5d9',
                                color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              }}>
                              + Add Product
                            </button>
                          </div>
                          <div className="space-y-3">
                            {formData.products.map((prod, idx) => (
                              <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}` }}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-semibold" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                                    Product {idx + 1}
                                  </span>
                                  {formData.products.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setFormData({...formData, products: formData.products.filter((_, i) => i !== idx)})}
                                      className="text-xs text-red-500">
                                      Remove
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <select
                                    value={prod.productId}
                                    onChange={(e) => {
                                      const newProducts = [...formData.products];
                                      newProducts[idx].productId = e.target.value;
                                      setFormData({...formData, products: newProducts});
                                    }}
                                    className="w-full px-3 py-1 rounded text-sm outline-none relative z-10"
                                    style={{
                                      backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                      border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                                    }}>
                                    <option value="">Select product</option>
                                    {products.map(p => (
                                      <option key={p.id} value={p.id}>{p.productName}</option>
                                    ))}
                                  </select>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      value={prod.quantity}
                                      onChange={(e) => {
                                        const newProducts = [...formData.products];
                                        newProducts[idx].quantity = e.target.value;
                                        setFormData({...formData, products: newProducts});
                                      }}
                                      placeholder="Qty"
                                      className="px-3 py-1 rounded text-sm outline-none"
                                      style={{
                                        backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                                      }}
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={prod.itemPrice === 0 ? '' : prod.itemPrice}
                                      onChange={(e) => {
                                        const newProducts = [...formData.products];
                                        newProducts[idx].itemPrice = parseFloat(e.target.value) || 0;
                                        setFormData({...formData, products: newProducts});
                                      }}
                                      placeholder="Item Price"
                                      className="px-3 py-1 rounded text-sm outline-none"
                                      style={{
                                        backgroundColor: isDarkMode ? '#2d2d44' : '#f5f5f5',
                                        color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                        border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* SECTION 3: PAYMENT INFORMATION - COLLAPSIBLE */}
                  <div style={{ border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, borderRadius: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedSections(expandedSections.payment ? { buyer: false, order: false, payment: false, status: false } : { buyer: false, order: false, payment: true, status: false })}
                      className="w-full px-4 py-3 flex justify-between items-center hover:opacity-80 transition"
                      style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8' }}>
                      <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        💳 Payment Information
                      </h3>
                      <span style={{ transform: expandedSections.payment ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </button>
                    {expandedSections.payment && (
                      <div className="p-4 space-y-3 border-t max-h-96 overflow-y-auto" style={{ borderColor: isDarkMode ? '#3d3d54' : '#e1e8ed' }}>
                        
                        {/* Merchandise Subtotal - COMPUTED */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Merchandise Subtotal
                          </label>
                          <div
                            className="w-full px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#f9f9f9',
                              color: isDarkMode ? '#9aa0a6' : '#7f8c8d',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                            }}>
                            ₱{(formData.products.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0) * p.itemPrice, 0)).toFixed(2)}
                          </div>
                        </div>

                        {/* Estimated Shipping Subtotal Header */}
                        <div style={{ paddingTop: '0.5rem', borderTop: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, marginTop: '1rem' }}>
                          <h4 className="text-sm font-semibold mb-3" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            📦 Estimated Shipping Subtotal
                          </h4>
                        </div>

                        {/* Estimated Shipping Fee Charged by Logistic - INPUT */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Estimated Shipping Fee Charged by Logistic
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.estimatedShippingFeeCharged === 0 ? '' : formData.estimatedShippingFeeCharged}
                            onChange={(e) => setFormData({...formData, estimatedShippingFeeCharged: parseFloat(e.target.value) || 0})}
                            placeholder="0.00"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>

                        {/* Estimated Shipping Fee Rebate from Shopee - INPUT */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Estimated Shipping Fee Rebate from Shopee
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.shippingFeeRebate === 0 ? '' : formData.shippingFeeRebate}
                            onChange={(e) => setFormData({...formData, shippingFeeRebate: parseFloat(e.target.value) || 0})}
                            placeholder="0.00"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>

                        {/* Shipping Fee Paid by Buyer - COMPUTED */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Shipping Fee Paid by Buyer
                          </label>
                          <div
                            className="w-full px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#f9f9f9',
                              color: isDarkMode ? '#9aa0a6' : '#7f8c8d',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                            }}>
                            ₱{(formData.estimatedShippingFeeCharged - formData.shippingFeeRebate).toFixed(2)}
                          </div>
                        </div>

                        {/* Fee & Charges Header */}
                        <div style={{ paddingTop: '0.5rem', borderTop: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, marginTop: '1rem' }}>
                          <h4 className="text-sm font-semibold mb-3" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            ⚙️ Fee & Charges
                          </h4>
                        </div>

                        {/* Service Fee - INPUT */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Service Fee
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.serviceFee === 0 ? '' : formData.serviceFee}
                            onChange={(e) => setFormData({...formData, serviceFee: parseFloat(e.target.value) || 0})}
                            placeholder="0.00"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>

                        {/* Transaction Fee - INPUT */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Transaction Fee
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.transactionFee === 0 ? '' : formData.transactionFee}
                            onChange={(e) => setFormData({...formData, transactionFee: parseFloat(e.target.value) || 0})}
                            placeholder="0.00"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>

                        {/* Withholding Tax - INPUT */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Withholding Tax
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.withholdingTax === 0 ? '' : formData.withholdingTax}
                            onChange={(e) => setFormData({...formData, withholdingTax: parseFloat(e.target.value) || 0})}
                            placeholder="0.00"
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                            }}
                          />
                        </div>

                        {/* Total Fee & Charges - COMPUTED */}
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Total Fee & Charges
                          </label>
                          <div
                            className="w-full px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#f9f9f9',
                              color: isDarkMode ? '#9aa0a6' : '#7f8c8d',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                            }}>
                            -₱{(formData.serviceFee + formData.transactionFee + formData.withholdingTax).toFixed(2)}
                          </div>
                        </div>

                        {/* Estimated Order Income - COMPUTED */}
                        <div style={{ paddingTop: '0.5rem', borderTop: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, marginTop: '1rem' }}>
                          <label className="block text-sm font-bold mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            💰 Estimated Order Income
                          </label>
                          <div
                            className="w-full px-4 py-2 rounded-lg font-bold text-lg"
                            style={{
                              backgroundColor: isDarkMode ? '#0f3d2e' : '#e8f5e9',
                              color: isDarkMode ? '#4caf50' : '#2e7d32',
                              border: `2px solid ${isDarkMode ? '#4caf50' : '#81c784'}`,
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                            }}>
                            ₱{(
                              (formData.products.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0) * p.itemPrice, 0)) -
                              (formData.estimatedShippingFeeCharged - formData.shippingFeeRebate) -
                              (formData.serviceFee + formData.transactionFee + formData.withholdingTax)
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: STATUS - COLLAPSIBLE */}
                  <div style={{ border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`, borderRadius: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedSections({...expandedSections, status: !expandedSections.status})}
                      className="w-full px-4 py-3 flex justify-between items-center hover:opacity-80 transition"
                      style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#e8dce8' }}>
                      <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        📊 Status
                      </h3>
                      <span style={{ transform: expandedSections.status ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </button>
                    {expandedSections.status && (
                      <div className="p-4 space-y-3 border-t" style={{ borderColor: isDarkMode ? '#3d3d54' : '#e1e8ed' }}>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            Order Status
                          </label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                            className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                              color: isDarkMode ? '#e8eaed' : '#2c3e50',
                              border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                              cursor: 'pointer',
                            }}>
                            <option value="Shipped">🚚 Shipped</option>
                            <option value="Delivered">📦 Delivered</option>
                            <option value="Completed">✅ Completed</option>
                            <option value="Cancelled">❌ Cancelled</option>
                          </select>
                        </div>

                        {/* Cancellation Reason - Only show when Cancelled is selected */}
                        {formData.status === 'Cancelled' && (
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              Reason for Cancellation
                            </label>
                            <textarea
                              value={formData.cancellationReason}
                              onChange={(e) => setFormData({...formData, cancellationReason: e.target.value})}
                              placeholder="Please provide reason for cancellation..."
                              className="w-full px-4 py-2 rounded-lg outline-none transition-all resize-none"
                              rows={3}
                              style={{
                                backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                                color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                              }}
                            />
                            <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                              ⚠️ Note: Cancelled orders quantity will be recorded to Kosiedon Cuts
                            </p>
                          </div>
                        )}

                        {/* Released Date & Time - Only show when Delivered is selected */}
                        {formData.status === 'Delivered' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                                  📅 Released Date
                                </label>
                                <input
                                  type="date"
                                  value={formData.releasedDate}
                                  onChange={(e) => setFormData({...formData, releasedDate: e.target.value})}
                                  className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                                  style={{
                                    backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                                    color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                    border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                                  🕐 Released Time
                                </label>
                                <input
                                  type="time"
                                  value={formData.releasedTime}
                                  onChange={(e) => setFormData({...formData, releasedTime: e.target.value})}
                                  className="w-full px-4 py-2 rounded-lg outline-none transition-all"
                                  style={{
                                    backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                                    color: isDarkMode ? '#e8eaed' : '#2c3e50',
                                    border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                                  }}
                                />
                              </div>
                            </div>
                            {/* Show auto-complete time */}
                            {formData.releasedDate && formData.releasedTime && (
                              <div className="p-3 rounded-lg" style={{ 
                                backgroundColor: isDarkMode ? '#1a2e1a' : '#ecfdf5',
                                border: `1px solid ${isDarkMode ? '#166534' : '#86efac'}`
                              }}>
                                <p className="text-xs font-medium" style={{ color: isDarkMode ? '#86efac' : '#166534' }}>
                                  ⏰ Auto-Complete Estimate:
                                </p>
                                <p className="text-sm font-bold mt-1" style={{ color: isDarkMode ? '#4ade80' : '#15803d' }}>
                                  {(() => {
                                    const releasedDateTime = new Date(formData.releasedDate);
                                    const [hours, minutes] = formData.releasedTime.split(':').map(Number);
                                    releasedDateTime.setHours(hours, minutes, 0, 0);
                                    const completedTime = new Date(releasedDateTime.getTime() + 12 * 60 * 60 * 1000);
                                    return `✅ Will auto-complete on ${completedTime.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} at ${completedTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`;
                                  })()}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Income Status Indicator */}
                        <div className="mt-3 p-3 rounded-lg" style={{ 
                          backgroundColor: isDarkMode ? '#0f0f1e' : '#f8f9fa',
                          border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`
                        }}>
                          <p className="text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            💰 Income Status:
                          </p>
                          {formData.status === 'Shipped' && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                              ⏳ Pending Income
                            </span>
                          )}
                          {formData.status === 'Delivered' && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                              ✅ Released Income {formData.releasedDate && `(${new Date(formData.releasedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })})`}
                            </span>
                          )}
                          {formData.status === 'Completed' && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                              ✅ Released Income
                            </span>
                          )}
                          {formData.status === 'Cancelled' && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                              ❌ No Income (Qty → Kosiedon Cuts)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buttons - Sticky */}
                  {/* Removed - moved to footer */}
                </form>

                {/* Modal Footer - Fixed */}
                <div className="flex gap-3 p-6 flex-shrink-0" style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}`, backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
                  <Button
                    onClick={() => {
                      setShowModal(false);
                      setEditingSaleId(null);
                    }}
                    variant="primary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="sale-form"
                    variant="secondary"
                    style={{ flex: 1 }}
                  >
                    {editingSaleId ? 'Update Sale' : 'Save Sale'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sale Detail Modal */}
          {expandedSaleId && sales.find(s => s.id === expandedSaleId) && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setExpandedSaleId(null)}>
              <div 
                className="rounded-2xl w-full max-w-[95vw] md:max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }}>
                {(() => {
                  const sale = sales.find(s => s.id === expandedSaleId);
                  if (!sale) return null;
                  
                  // Determine shop icon/color
                  const shopConfig: { [key: string]: { icon: string; color: string } } = {
                    'Shopee': { icon: '🛍️', color: '#ee5a52' },
                    'TikTok': { icon: '🎵', color: '#25f4ee' },
                    'Lazada': { icon: '🛒', color: '#0066cc' },
                  };
                  const shopInfo = shopConfig[sale.shop] || { icon: '🏪', color: '#666' };
                  
                  return (
                    <>
                      {/* Header - Fixed */}
                      <div 
                        className="p-6 flex-shrink-0"
                        style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#efe5f0', borderBottom: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-2xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            {sale.productName}
                          </h2>
                          <span className="text-3xl">{shopInfo.icon}</span>
                        </div>
                        <div className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                          Order ID: {sale.id}
                        </div>
                      </div>

                      {/* Content - Scrollable */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Products List - Show all products for multi-product orders */}
                        {sale.products && sale.products.length > 1 ? (
                          <div>
                            <h3 className="text-lg font-bold mb-3" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              📦 Products ({sale.products.length} items)
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f9f9f9' }}>
                              {sale.products.map((prod, idx) => (
                                <div key={`detail-${sale.id}-${idx}`} className="flex justify-between items-center py-2 px-3 rounded" style={{
                                  backgroundColor: isDarkMode ? '#2d2d44' : '#ffffff',
                                  border: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}`,
                                }}>
                                  <div className="flex-1">
                                    <p className="font-medium" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                                      {prod.productName}
                                    </p>
                                    <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                                      {prod.quantity} pcs × ₱{prod.unitPrice.toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="font-bold" style={{ color: isDarkMode ? '#60a5fa' : '#ff69b4' }}>
                                    ₱{prod.subtotal.toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                            {/* Order Summary */}
                            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#efe5f0' }}>
                              <div className="flex justify-between items-center">
                                <span className="font-medium" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                                  Total Items: {sale.quantity} pcs
                                </span>
                                <span className="font-bold text-xl" style={{ color: '#ec4899' }}>
                                  ₱{sale.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Single Product Order Details */
                          <div>
                            <h3 className="text-lg font-bold mb-3" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              📦 Order Details
                            </h3>
                            <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f9f9f9' }}>
                              <div className="flex justify-between">
                                <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Shop:</span>
                                <span className="font-medium" style={{ color: shopInfo.color }}>{sale.shop}</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Quantity:</span>
                                <span className="font-bold" style={{ color: '#10b981' }}>{sale.quantity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Unit Price:</span>
                                <span className="font-medium" style={{ color: '#3b82f6' }}>₱{sale.unitPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between pt-2" style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                                <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Total:</span>
                                <span className="font-bold text-lg" style={{ color: '#ec4899' }}>₱{sale.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Order Status Section */}
                        <div>
                          <h3 className="text-lg font-bold mb-3" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                            📋 Status
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Order Date:</span>
                              <span className="font-medium" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                                {new Date(sale.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Status:</span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                                backgroundColor: sale.status === 'Shipped' ? '#fef3c7' : sale.status === 'Delivered' ? '#dbeafe' : sale.status === 'Completed' ? '#dcfce7' : '#fee2e2',
                                color: sale.status === 'Shipped' ? '#92400e' : sale.status === 'Delivered' ? '#1e40af' : sale.status === 'Completed' ? '#15803d' : '#991b1b',
                              }}>
                                {sale.status || 'Pending'}
                              </span>
                            </div>
                            {/* Released Date - Show only for Delivered status */}
                            {sale.status === 'Delivered' && sale.releasedDate && (
                              <div className="flex justify-between">
                                <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Released Date:</span>
                                <span className="font-medium" style={{ color: '#10b981' }}>
                                  {new Date(sale.releasedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                            {/* Income Status */}
                            <div className="flex justify-between items-center pt-2 mt-2" style={{ borderTop: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}` }}>
                              <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>💰 Income Status:</span>
                              {(sale.status === 'Shipped') && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                                  ⏳ Pending
                                </span>
                              )}
                              {(sale.status === 'Delivered' || sale.status === 'Completed') && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                                  ✅ Released
                                </span>
                              )}
                              {sale.status === 'Cancelled' && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                                  ❌ No Income
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Payment Details Section */}
                        {(sale.merchandiseSubtotal || sale.shippingFee || sale.totalBuyerPayment) && (
                          <div>
                            <h3 className="text-lg font-bold mb-3" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                              💳 Payment Breakdown
                            </h3>
                            <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f9f9f9' }}>
                              {sale.merchandiseSubtotal && sale.merchandiseSubtotal > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Merchandise Subtotal:</span>
                                  <span>₱{sale.merchandiseSubtotal.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.shippingFee && sale.shippingFee > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Shipping Fee:</span>
                                  <span>₱{sale.shippingFee.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.shippingFeePaidByBuyer && sale.shippingFeePaidByBuyer > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Shipping Fee Paid by Buyer:</span>
                                  <span>₱{sale.shippingFeePaidByBuyer.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.estimatedShippingFeeCharged && sale.estimatedShippingFeeCharged > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Est. Shipping Fee (Logistic):</span>
                                  <span>₱{sale.estimatedShippingFeeCharged.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.shippingFeeRebate && sale.shippingFeeRebate > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Shipping Fee Rebate:</span>
                                  <span style={{ color: '#10b981' }}>-₱{sale.shippingFeeRebate.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.serviceFee && sale.serviceFee > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Service Fee:</span>
                                  <span>₱{sale.serviceFee.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.transactionFee && sale.transactionFee > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Transaction Fee:</span>
                                  <span>₱{sale.transactionFee.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.tax && sale.tax > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Tax:</span>
                                  <span>₱{sale.tax.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.shopeeVoucher && sale.shopeeVoucher > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Shopee Voucher:</span>
                                  <span style={{ color: '#10b981' }}>-₱{sale.shopeeVoucher.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.sellerVoucher && sale.sellerVoucher > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Seller Voucher:</span>
                                  <span style={{ color: '#10b981' }}>-₱{sale.sellerVoucher.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.paymentDiscount && sale.paymentDiscount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Payment Discount:</span>
                                  <span style={{ color: '#10b981' }}>-₱{sale.paymentDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.shopeeCoinRedeem && sale.shopeeCoinRedeem > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Shopee Coin Redeem:</span>
                                  <span style={{ color: '#10b981' }}>-₱{sale.shopeeCoinRedeem.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.totalBuyerPayment && sale.totalBuyerPayment > 0 && (
                                <div className="flex justify-between font-bold pt-2" style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                                  <span style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>Total Buyer Payment:</span>
                                  <span style={{ color: '#ec4899' }}>₱{sale.totalBuyerPayment.toFixed(2)}</span>
                                </div>
                              )}
                              {sale.paymentMethod && (
                                <div className="flex justify-between text-sm pt-2" style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                                  <span style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>Payment Method:</span>
                                  <span style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>{sale.paymentMethod}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer - Fixed */}
                      <div 
                        className="p-6 flex-shrink-0 flex gap-3"
                        style={{ borderTop: `1px solid ${isDarkMode ? '#3d3d54' : '#e1e8ed'}` }}>
                        <Button
                          onClick={() => {
                            // Get the sale data first before closing
                            const saleToEdit = sales.find(s => s.id === expandedSaleId);
                            if (!saleToEdit) return;
                            
                            // Close detail modal first
                            setExpandedSaleId(null);
                            
                            // Load products properly - check if sale has products array
                            const loadedProducts = saleToEdit.products && saleToEdit.products.length > 0
                              ? saleToEdit.products.map(p => ({
                                  productId: p.productId,
                                  quantity: p.quantity.toString(),
                                  itemPrice: p.unitPrice
                                }))
                              : [{ productId: saleToEdit.productId, quantity: saleToEdit.quantity.toString(), itemPrice: saleToEdit.unitPrice }];
                            
                            // Set editing state and form data
                            setEditingSaleId(saleToEdit.id);
                            setFormData({
                              shop: saleToEdit.shop,
                              buyerName: saleToEdit.buyerName || '',
                              contactNo: saleToEdit.contactNo || '',
                              address: saleToEdit.address || '',
                              orderNumber: saleToEdit.id,
                              dateOrdered: new Date(saleToEdit.date).toISOString().split('T')[0],
                              products: loadedProducts,
                              estimatedShippingFeeCharged: saleToEdit.estimatedShippingFeeCharged || 0,
                              shippingFeeRebate: saleToEdit.shippingFeeRebate || 0,
                              serviceFee: saleToEdit.serviceFee || 0,
                              transactionFee: saleToEdit.transactionFee || 0,
                              withholdingTax: saleToEdit.tax || 0,
                              status: saleToEdit.status as any || 'Delivered',
                              releasedDate: saleToEdit.releasedDate || '',
                              releasedTime: saleToEdit.releasedTime || '',
                              cancellationReason: '',
                            });
                            setExpandedSections({ buyer: true, order: true, payment: true, status: true });
                            setShowModal(true);
                          }}
                          variant="secondary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          ✏️ Edit Sale
                        </Button>
                        <Button
                          onClick={() => handleDeleteSale(sale.id)}
                          variant="secondary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          🗑️ Delete Sale
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

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
              <div className="p-6 border-b" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                <h2 className="text-xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                  ⚠️ Delete Sale?
                </h2>
              </div>

              <div className="p-6">
                <p style={{ color: isDarkMode ? '#c5cad1' : '#555555', marginBottom: '24px', lineHeight: '1.5' }}>
                  Are you sure you want to delete this sale? This action cannot be undone.
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
                    onClick={confirmDeleteSale}
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

        {/* Import CSV Modal */}
        {showImportModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !importLoading && setShowImportModal(false)}>
            <div
              className="rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
              }}>
              <div className="p-6 border-b" style={{ borderColor: isDarkMode ? '#2d2d44' : '#e1e8ed' }}>
                <h2 className="text-xl font-bold" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                  📥 Import Sales from CSV
                </h2>
              </div>

              <div className="p-6">
                {importLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#ff69b4' }}></div>
                    <p style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50', fontWeight: '600' }}>{importProgress}</p>
                  </div>
                ) : (
                  <>
                    <p style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d', marginBottom: '16px', fontSize: '14px' }}>
                      Upload your Shopee sales export (CSV format). The file should match the Shopee export format.
                    </p>

                    <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: isDarkMode ? '#2d2d44' : '#f3f4f6' }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        📋 Expected CSV columns:
                      </p>
                      <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                        DATE, Order number, Name, Status, Date, Buyer&apos;s Address, Products, Item Price, quantity, Total, Shipping fees, Service Fee, Transaction Fee, Tax, etc.
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      className="hidden"
                      id="csv-upload"
                    />

                    <label
                      htmlFor="csv-upload"
                      className="block w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all hover:opacity-80"
                      style={{
                        borderColor: isDarkMode ? '#7aa6f0' : '#ff69b4',
                        backgroundColor: isDarkMode ? '#1f1f38' : '#fff0f5',
                      }}>
                      <span className="text-3xl block mb-2">📂</span>
                      <span style={{ color: isDarkMode ? '#e8eaed' : '#2c3e50', fontWeight: '600' }}>
                        Click to select CSV file
                      </span>
                      <span className="block text-xs mt-1" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                        or drag and drop
                      </span>
                    </label>

                    {sales.length > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${isDarkMode ? '#2d2d44' : '#e1e8ed'}` }}>
                        <p className="text-sm mb-2" style={{ color: isDarkMode ? '#9aa0a6' : '#7f8c8d' }}>
                          Current: {sales.length} sales in database
                        </p>
                        <button
                          onClick={handleClearAllSales}
                          className="text-sm px-4 py-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: isDarkMode ? '#3a1a1a' : '#fee2e2',
                            color: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                          }}>
                          🗑️ Clear all sales (for re-import)
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowImportModal(false)}
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
                        }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
