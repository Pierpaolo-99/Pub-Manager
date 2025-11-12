import { useState, useEffect, useContext } from 'react';
import { useAuth } from "../../context/AuthContext";
import ProductGrid from './components/ProductGrid';
import OrderSummary from './components/OrderSummary';
import TableSelector from './components/TableSelector';
import CheckoutPanel from './components/CheckoutPanel';
import QuickActions from './components/QuickActions';
import './POS.css';

export default function POS() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('menu'); // menu, order, tables, checkout
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState({
    id: null,
    table_id: null,
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    customer_name: ''
  });
  
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Quick stats per il barista/cassiere
  const [quickStats, setQuickStats] = useState({
    today_sales: 0,
    active_orders: 0,
    tables_occupied: 0,
    pending_items: 0
  });

  useEffect(() => {
    loadActiveOrders();
    loadQuickStats();
  }, []);

  // Auto-refresh ogni 30 secondi per aggiornamenti real-time
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveOrders();
      loadQuickStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadActiveOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=active', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading active orders:', error);
    }
  };

  const loadQuickStats = async () => {
    try {
      const response = await fetch('/api/analytics/pos-stats', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setQuickStats(data.stats || quickStats);
      }
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  };

  const addItemToOrder = (product, variant = null) => {
    const item = {
      id: Date.now() + Math.random(), // Temporary ID
      product_id: product.id,
      variant_id: variant?.id || null,
      name: variant ? `${product.name} - ${variant.name}` : product.name,
      price: variant ? variant.price : product.price,
      quantity: 1,
      notes: ''
    };

    setCurrentOrder(prev => {
      const existingItemIndex = prev.items.findIndex(
        existing => existing.product_id === item.product_id && 
                   existing.variant_id === item.variant_id
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Incrementa quantità se item già presente
        newItems = prev.items.map((existing, index) => 
          index === existingItemIndex 
            ? { ...existing, quantity: existing.quantity + 1 }
            : existing
        );
      } else {
        // Aggiungi nuovo item
        newItems = [...prev.items, item];
      }

      const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.22; // IVA 22%
      const total = subtotal + tax;

      return {
        ...prev,
        items: newItems,
        subtotal,
        tax,
        total
      };
    });

    // Feedback visivo
    setSuccess(`${item.name} aggiunto all'ordine!`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const updateItemQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(itemId);
      return;
    }

    setCurrentOrder(prev => {
      const newItems = prev.items.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );

      const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.22;
      const total = subtotal + tax;

      return {
        ...prev,
        items: newItems,
        subtotal,
        tax,
        total
      };
    });
  };

  const removeItemFromOrder = (itemId) => {
    setCurrentOrder(prev => {
      const newItems = prev.items.filter(item => item.id !== itemId);
      const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.22;
      const total = subtotal + tax;

      return {
        ...prev,
        items: newItems,
        subtotal,
        tax,
        total
      };
    });
  };

  const selectTable = (table) => {
    setSelectedTable(table);
    setCurrentOrder(prev => ({ ...prev, table_id: table.id }));
    setCurrentView('menu');
  };

  const clearOrder = () => {
    if (currentOrder.items.length > 0 && !window.confirm('Cancellare l\'ordine corrente?')) {
      return;
    }

    setCurrentOrder({
      id: null,
      table_id: selectedTable?.id || null,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: '',
      customer_name: ''
    });
    setSuccess('Ordine cancellato');
    setTimeout(() => setSuccess(null), 2000);
  };

  const submitOrder = async (paymentMethod = 'cash') => {
    if (currentOrder.items.length === 0) {
      setError('Aggiungere almeno un prodotto all\'ordine');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderData = {
        ...currentOrder,
        payment_method: paymentMethod,
        status: 'pending',
        order_type: selectedTable ? 'dine_in' : 'takeaway',
        served_by: user.id
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'invio ordine');
      }

      const result = await response.json();
      
      setSuccess(`Ordine #${result.order.id} inviato con successo!`);
      
      // Reset ordine
      setCurrentOrder({
        id: null,
        table_id: selectedTable?.id || null,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: '',
        customer_name: ''
      });

      // Aggiorna statistiche e ordini attivi
      await loadActiveOrders();
      await loadQuickStats();

      // Torna al menu dopo 2 secondi
      setTimeout(() => {
        setCurrentView('menu');
        setSuccess(null);
      }, 2000);

    } catch (error) {
      console.error('Error submitting order:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserRoleDisplay = () => {
    const roleMap = {
      'admin': '👑 Admin',
      'cashier': '💰 Cassiere',
      'waiter': '🍽️ Cameriere', 
      'kitchen': '👨‍🍳 Cucina'
    };
    return roleMap[user.role] || user.role;
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'menu': return selectedTable ? `📋 Menu - ${selectedTable.name}` : '📋 Menu Takeaway';
      case 'order': return `🛒 Ordine (${currentOrder.items.length} item${currentOrder.items.length !== 1 ? 's' : ''})`;
      case 'tables': return '🪑 Selezione Tavolo';
      case 'checkout': return '💰 Cassa';
      default: return 'POS';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  return (
    <div className="pos-interface">
      {/* Header fisso con info essenziali */}
      <header className="pos-header">
        <div className="header-left">
          <div className="user-info">
            <span className="user-role">{getUserRoleDisplay()}</span>
            <span className="user-name">{user.name}</span>
          </div>
        </div>
        
        <div className="header-center">
          <h1 className="view-title">{getViewTitle()}</h1>
          {selectedTable && currentView !== 'tables' && (
            <span className="selected-table">🪑 {selectedTable.name}</span>
          )}
        </div>

        <div className="header-right">
          <div className="quick-stats">
            <span className="stat">💰 {formatCurrency(quickStats.today_sales)}</span>
            <span className="stat">📋 {quickStats.active_orders}</span>
          </div>
        </div>
      </header>

      {/* Banner messaggi */}
      {error && (
        <div className="message-banner error">
          <span className="message-icon">❌</span>
          <span className="message-text">{error}</span>
          <button className="message-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="message-banner success">
          <span className="message-icon">✅</span>
          <span className="message-text">{success}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="pos-main">
        {currentView === 'menu' && (
          <ProductGrid 
            onProductSelect={addItemToOrder}
            loading={loading}
          />
        )}

        {currentView === 'order' && (
          <OrderSummary
            order={currentOrder}
            onUpdateQuantity={updateItemQuantity}
            onRemoveItem={removeItemFromOrder}
            onUpdateNotes={(notes) => setCurrentOrder(prev => ({ ...prev, notes }))}
          />
        )}

        {currentView === 'tables' && (
          <TableSelector
            selectedTable={selectedTable}
            onTableSelect={selectTable}
            activeOrders={activeOrders}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutPanel
            order={currentOrder}
            onSubmitOrder={submitOrder}
            onUpdateCustomerName={(name) => setCurrentOrder(prev => ({ ...prev, customer_name: name }))}
            loading={loading}
          />
        )}
      </main>

      {/* Quick Actions - sempre visibile */}
      <QuickActions
        currentOrder={currentOrder}
        onClearOrder={clearOrder}
        hasItems={currentOrder.items.length > 0}
        currentUser={user}
      />

      {/* Bottom Navigation */}
      <nav className="pos-bottom-nav">
        <button 
          className={`nav-btn ${currentView === 'tables' ? 'active' : ''}`}
          onClick={() => setCurrentView('tables')}
        >
          <span className="nav-icon">🪑</span>
          <span className="nav-label">Tavoli</span>
          {quickStats.tables_occupied > 0 && (
            <span className="nav-badge">{quickStats.tables_occupied}</span>
          )}
        </button>

        <button 
          className={`nav-btn ${currentView === 'menu' ? 'active' : ''}`}
          onClick={() => setCurrentView('menu')}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Menu</span>
        </button>

        <button 
          className={`nav-btn ${currentView === 'order' ? 'active' : ''}`}
          onClick={() => setCurrentView('order')}
        >
          <span className="nav-icon">🛒</span>
          <span className="nav-label">Ordine</span>
          {currentOrder.items.length > 0 && (
            <span className="nav-badge">{currentOrder.items.length}</span>
          )}
        </button>

        <button 
          className={`nav-btn ${currentView === 'checkout' ? 'active' : ''}`}
          onClick={() => setCurrentView('checkout')}
          disabled={currentOrder.items.length === 0}
        >
          <span className="nav-icon">💰</span>
          <span className="nav-label">Cassa</span>
          {currentOrder.total > 0 && (
            <span className="nav-amount">{formatCurrency(currentOrder.total)}</span>
          )}
        </button>
      </nav>
    </div>
  );
}