import { useState, useEffect } from "react";
import "./OrdersSection.css";

export default function OrdersSection() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [tableFilter, setTableFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [viewMode, setViewMode] = useState('cards');
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  
  // ✅ ENHANCED: PAGINATION STATE
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: true
  });

  useEffect(() => {
    loadOrders();
    loadStats();
    // Aggiorna ogni 30 secondi
    const interval = setInterval(() => {
      loadOrders();
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // ✅ ENHANCED: Reset pagination when filters change
    setPagination(prev => ({ ...prev, offset: 0 }));
    loadOrders(true); // Reset load
  }, [statusFilter, dateFilter, tableFilter, paymentFilter]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm]);

  // ✅ ENHANCED: PROPER BACKEND INTEGRATION
  const loadOrders = async (reset = false) => {
    try {
      setError(null);
      if (reset) {
        setLoading(true);
        setOrders([]);
      }
      
      const params = new URLSearchParams();
      
      // ✅ ENHANCED: Add all supported backend filters
      if (statusFilter) params.append('status', statusFilter);
      if (tableFilter && tableFilter !== 'all' && tableFilter !== 'null') {
        params.append('table_id', tableFilter);
      }
      if (paymentFilter) params.append('payment_method', paymentFilter);
      
      // ✅ ENHANCED: Date filtering backend-side
      if (dateFilter && dateFilter !== 'all') {
        const dates = getDateRange(dateFilter);
        if (dates.from) params.append('date_from', dates.from);
        if (dates.to) params.append('date_to', dates.to);
      }
      
      // ✅ ENHANCED: Pagination
      params.append('limit', pagination.limit.toString());
      params.append('offset', reset ? '0' : pagination.offset.toString());
      
      console.log('📡 Loading orders with params:', params.toString());
      
      // ✅ FIXED: RELATIVE URL
      const response = await fetch(`/api/orders?${params}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Orders response:', data);
      
      // ✅ ENHANCED: Handle backend response structure
      const responseOrders = data.success ? data.orders : (Array.isArray(data) ? data : []);
      const responsePagination = data.pagination || {};
      
      if (reset) {
        setOrders(responseOrders);
      } else {
        // Append for pagination
        setOrders(prev => [...prev, ...responseOrders]);
      }
      
      // ✅ ENHANCED: Update pagination state
      setPagination(prev => ({
        ...prev,
        offset: reset ? responseOrders.length : prev.offset + responseOrders.length,
        total: responsePagination.total || responseOrders.length,
        hasMore: responseOrders.length === pagination.limit
      }));
      
    } catch (error) {
      console.error('❌ Network error loading orders:', error);
      setError('Errore di connessione: ' + error.message);
      if (reset) setOrders([]);
    } finally {
      if (reset) setLoading(false);
    }
  };

  // ✅ NEW: Date range calculation for backend
  const getDateRange = (filter) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (filter) {
      case 'today':
        return { from: todayStr, to: todayStr };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return { from: yesterdayStr, to: yesterdayStr };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { from: weekAgo.toISOString().split('T')[0], to: todayStr };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: monthStart.toISOString().split('T')[0], to: todayStr };
      default:
        return { from: null, to: null };
    }
  };

  // ✅ ENHANCED: PROPER STATS HANDLING
  const loadStats = async () => {
    try {
      // ✅ FIXED: RELATIVE URL
      const response = await fetch('/api/orders/stats', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📈 Stats response:', data);
      
      // ✅ ENHANCED: Handle backend response structure
      setStats(data.success ? data.stats : data);
      
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      setStats({
        total_orders: 0,
        today_orders: 0,
        pending_orders: 0,
        ready_orders: 0,
        completed_orders: 0,
        today_revenue: 0
      });
    }
  };

  // ✅ ENHANCED: Client-side filtering for search only
  const filterOrders = () => {
    if (!Array.isArray(orders)) {
      setFilteredOrders([]);
      return;
    }

    let filtered = [...orders];

    // Only search term filtering (other filters handled backend-side)
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id?.toString().includes(searchTerm) ||
        order.table_number?.toString().includes(searchTerm) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone?.includes(searchTerm) ||
        order.waiter_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  // ✅ ENHANCED: PROPER STATUS UPDATE
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      console.log('🔄 Updating order status:', { orderId, newStatus });
      
      // ✅ FIXED: RELATIVE URL
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Status update result:', result);
      
      // ✅ ENHANCED: Update order in state
      setOrders(orders.map(order => 
        order.id === orderId ? { 
          ...order, 
          status: newStatus,
          updated_at: new Date().toISOString()
        } : order
      ));
      
      // Reload stats
      loadStats();
      
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      alert(`Errore aggiornamento stato: ${error.message}`);
    }
  };

  // ✅ ENHANCED: PROPER DELETE
  const deleteOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    
    if (!confirm(`Sei sicuro di voler eliminare l'ordine #${orderId}?${order?.table_number ? ` (Tavolo ${order.table_number})` : ''}`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting order:', orderId);
      
      // ✅ FIXED: RELATIVE URL
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // ✅ ENHANCED: Remove from state
      setOrders(orders.filter(order => order.id !== orderId));
      loadStats();
      console.log(`✅ Order ${orderId} deleted`);
      
    } catch (error) {
      console.error('❌ Error deleting order:', error);
      alert(`Errore eliminazione: ${error.message}`);
    }
  };

  // ✅ ENHANCED: Load more orders (pagination)
  const loadMoreOrders = () => {
    if (pagination.hasMore && !loading) {
      loadOrders(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      'pending': 'In attesa',
      'in_preparazione': 'In preparazione',
      'pronto': 'Pronto',
      'servito': 'Servito',
      'pagato': 'Pagato',
      'annullato': 'Annullato'
    };
    return statusLabels[status] || status;
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      'pending': '⏳',
      'in_preparazione': '👨‍🍳',
      'pronto': '✅',
      'servito': '🍽️',
      'pagato': '💰',
      'annullato': '❌'
    };
    return statusIcons[status] || '❓';
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'pending': 'in_preparazione',
      'in_preparazione': 'pronto',
      'pronto': 'servito',
      'servito': 'pagato'
    };
    return statusFlow[currentStatus];
  };

  const getUniqueTableNumbers = () => {
    if (!Array.isArray(orders)) return [];
    const tables = [...new Set(orders.map(order => order.table_number).filter(Boolean))];
    return tables.sort((a, b) => a - b);
  };

  if (loading) {
    return (
      <div className="orders-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento ordini dal database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-section">
      {/* ✅ ENHANCED HEADER WITH PAGINATION INFO */}
      <div className="section-header">
        <div className="header-left">
          <h2>📋 Gestione Ordini</h2>
          <p className="section-subtitle">
            {pagination.total > 0 ? `${pagination.total} ordini totali` : 'Nessun ordine'} • 
            {stats.pending_orders || 0} in corso • 
            €{parseFloat(stats.today_revenue || 0).toFixed(2)} oggi
            {/* ✅ ENHANCED: Show loaded vs total */}
            {pagination.total > orders.length && (
              <span className="pagination-info">
                • Caricati {orders.length}/{pagination.total}
              </span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => { loadOrders(true); loadStats(); }}
            title="Aggiorna ordini"
          >
            🔄 Aggiorna
          </button>
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Vista cards"
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista tabella"
            >
              ☰
            </button>
          </div>
          <button 
            className="btn primary" 
            onClick={() => setShowOrderModal(true)}
          >
            + Nuovo Ordine
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Statistiche (unchanged - already good) */}
      <div className="orders-stats">
        <div className="stat-card mini urgent">
          <span className="stat-icon">⏳</span>
          <div>
            <div className="stat-number">{stats.pending_orders || 0}</div>
            <div className="stat-label">In Corso</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{stats.ready_orders || 0}</div>
            <div className="stat-label">Pronti</div>
          </div>
        </div>
        <div className="stat-card mini success">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">{stats.completed_orders || 0}</div>
            <div className="stat-label">Completati</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">📊</span>
          <div>
            <div className="stat-number">€{parseFloat(stats.today_revenue || 0).toFixed(0)}</div>
            <div className="stat-label">Incasso Oggi</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">🍽️</span>
          <div>
            <div className="stat-number">{stats.dine_in_orders || 0}</div>
            <div className="stat-label">Al Tavolo</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">📦</span>
          <div>
            <div className="stat-number">{stats.takeaway_orders || 0}</div>
            <div className="stat-label">Asporto</div>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED FILTERS */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca ordine, tavolo, cliente, cameriere..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tutti gli stati</option>
          <option value="pending">⏳ In attesa</option>
          <option value="in_preparazione">👨‍🍳 In preparazione</option>
          <option value="pronto">✅ Pronto</option>
          <option value="servito">🍽️ Servito</option>
          <option value="pagato">💰 Pagato</option>
          <option value="annullato">❌ Annullato</option>
        </select>

        <select 
          className="filter-select"
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
        >
          <option value="all">Tutti i tavoli</option>
          <option value="null">📦 Solo Asporto</option>
          {getUniqueTableNumbers().map(table => (
            <option key={table} value={table}>
              🪑 Tavolo {table}
            </option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="">Tutti i pagamenti</option>
          <option value="contanti">💵 Contanti</option>
          <option value="carta">💳 Carta di Credito</option>
          <option value="bancomat">💳 Bancomat</option>
          <option value="app">📱 App/Digitale</option>
        </select>

        {/* ✅ ENHANCED: Backend date filtering */}
        <select 
          className="filter-select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">Tutte le date</option>
          <option value="today">Oggi</option>
          <option value="yesterday">Ieri</option>
          <option value="week">Ultima settimana</option>
          <option value="month">Questo mese</option>
        </select>

        {(searchTerm || statusFilter || tableFilter !== 'all' || paymentFilter || dateFilter !== 'today') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
              setTableFilter("all");
              setPaymentFilter("");
              setDateFilter("today");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Contenuto principale (same components, but with enhanced data) */}
      {!Array.isArray(filteredOrders) || filteredOrders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>Nessun ordine trovato</h3>
          <p>
            {!Array.isArray(orders) || orders.length === 0 
              ? "Non ci sono ordini nel sistema"
              : "Nessun ordine corrisponde ai filtri selezionati"
            }
          </p>
          <button 
            className="btn primary" 
            onClick={() => setShowOrderModal(true)}
          >
            + Crea Primo Ordine
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <>
          <OrdersGrid 
            orders={filteredOrders}
            onStatusUpdate={updateOrderStatus}
            onViewDetails={setSelectedOrder}
            onDelete={deleteOrder}
            getStatusLabel={getStatusLabel}
            getStatusIcon={getStatusIcon}
            getNextStatus={getNextStatus}
          />
          
          {/* ✅ ENHANCED: Load more button */}
          {pagination.hasMore && (
            <div className="load-more-section">
              <button 
                className="btn secondary load-more-btn"
                onClick={loadMoreOrders}
                disabled={loading}
              >
                {loading ? 'Caricando...' : 'Carica Altri Ordini'}
              </button>
              <p className="pagination-text">
                Mostrando {orders.length} di {pagination.total} ordini
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <OrdersTable 
            orders={filteredOrders}
            onStatusUpdate={updateOrderStatus}
            onViewDetails={setSelectedOrder}
            onDelete={deleteOrder}
            getStatusLabel={getStatusLabel}
            getStatusIcon={getStatusIcon}
            getNextStatus={getNextStatus}
          />
          
          {/* ✅ ENHANCED: Load more button */}
          {pagination.hasMore && (
            <div className="load-more-section">
              <button 
                className="btn secondary load-more-btn"
                onClick={loadMoreOrders}
                disabled={loading}
              >
                {loading ? 'Caricando...' : 'Carica Altri Ordini'}
              </button>
              <p className="pagination-text">
                Mostrando {orders.length} di {pagination.total} ordini
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal Dettagli Ordine */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={updateOrderStatus}
          getStatusLabel={getStatusLabel}
          getStatusIcon={getStatusIcon}
          getNextStatus={getNextStatus}
        />
      )}

      {/* Modal Nuovo Ordine */}
      {showOrderModal && (
        <NewOrderModal
          onClose={() => setShowOrderModal(false)}
          onSave={() => {
            setShowOrderModal(false);
            loadOrders(true);
            loadStats();
          }}
        />
      )}
    </div>
  );
}

// Componente Vista Cards
function OrdersGrid({ orders, onStatusUpdate, onViewDetails, onDelete, getStatusLabel, getStatusIcon, getNextStatus }) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return null;
  }

  return (
    <div className="orders-grid">
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onStatusUpdate={onStatusUpdate}
          onViewDetails={() => onViewDetails(order)}
          onDelete={() => onDelete(order.id)}
          getStatusLabel={getStatusLabel}
          getStatusIcon={getStatusIcon}
          getNextStatus={getNextStatus}
        />
      ))}
    </div>
  );
}

// Componente Vista Tabella
function OrdersTable({ orders, onStatusUpdate, onViewDetails, onDelete, getStatusLabel, getStatusIcon, getNextStatus }) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return null;
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Ordine</th>
            <th>Tavolo</th>
            <th>Cliente</th>
            <th>Stato</th>
            <th>Totale</th>
            <th>Orario</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} className={order.status}>
              <td>
                <div className="order-id">
                  <strong>#{order.id}</strong>
                </div>
              </td>
              <td>
                <span className="table-badge">
                  {order.table_number ? `🪑 Tavolo ${order.table_number}` : '📦 Asporto'}
                </span>
              </td>
              <td>{order.customer_name || 'Cliente'}</td>
              <td>
                <span className={`status-badge ${order.status}`}>
                  {getStatusIcon(order.status)} {getStatusLabel(order.status)}
                </span>
              </td>
              <td className="order-total">€{parseFloat(order.total || 0).toFixed(2)}</td>
              <td className="order-time">
                {new Date(order.created_at).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="btn-small primary"
                    onClick={() => onViewDetails(order)}
                    title="Visualizza dettagli"
                  >
                    👁️
                  </button>
                  {getNextStatus(order.status) && (
                    <button 
                      className="btn-small success"
                      onClick={() => onStatusUpdate(order.id, getNextStatus(order.status))}
                      title={`Segna come ${getStatusLabel(getNextStatus(order.status))}`}
                    >
                      ➡️
                    </button>
                  )}
                  {['annullato', 'pagato'].includes(order.status) && (
                    <button 
                      className="btn-small danger"
                      onClick={() => onDelete(order.id)}
                      title="Elimina ordine"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Componente Card Ordine
function OrderCard({ order, onStatusUpdate, onViewDetails, onDelete, getStatusLabel, getStatusIcon, getNextStatus }) {
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffMinutes < 60) {
        return `${diffMinutes} min fa`;
      } else {
        return date.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {
      return '--:--';
    }
  };

  const getUrgencyClass = () => {
    try {
      const date = new Date(order.created_at);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (order.status === 'pending' && diffMinutes > 15) return 'urgent';
      if (order.status === 'in_preparazione' && diffMinutes > 30) return 'urgent';
      if (order.status === 'pronto' && diffMinutes > 10) return 'urgent';
      return '';
    } catch {
      return '';
    }
  };

  return (
    <div className={`order-card ${order.status} ${getUrgencyClass()}`}>
      <div className="order-header">
        <div className="order-info">
          <h3 className="order-number">#{order.id}</h3>
          <span className="table-info">
            {order.table_number ? `🪑 Tavolo ${order.table_number}` : '📦 Asporto'}
          </span>
        </div>
        <div className="order-meta">
          <div className="order-time">
            {formatTime(order.created_at)}
          </div>
        </div>
      </div>

      <div className="order-content">
        {order.customer_name && (
          <div className="customer-info">
            <div className="customer-name">
              👤 {order.customer_name}
            </div>
            {order.customer_phone && (
              <div className="customer-details">
                📞 {order.customer_phone}
              </div>
            )}
          </div>
        )}

        <div className="order-status-section">
          <span className={`status-badge ${order.status}`}>
            {getStatusIcon(order.status)} {getStatusLabel(order.status)}
          </span>
          <span className="order-total">€{parseFloat(order.total || 0).toFixed(2)}</span>
        </div>

        {Array.isArray(order.items) && order.items.length > 0 && (
          <div className="order-items-preview">
            <div className="items-count">
              📦 {order.items.length} prodotto{order.items.length !== 1 ? 'i' : ''}
            </div>
            <div className="items-list">
              {order.items.slice(0, 2).map((item, index) => (
                <div key={index} className="item-preview">
                  <span className="item-name">{item.quantity}x {item.name}</span>
                  <span className="item-quantity-price">€{(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
              {order.items.length > 2 && (
                <div className="more-items">
                  +{order.items.length - 2} altri...
                </div>
              )}
            </div>
          </div>
        )}

        <div className="order-actions">
          <button 
            className="btn-small secondary"
            onClick={onViewDetails}
          >
            👁️ Dettagli
          </button>
          
          {getNextStatus(order.status) && (
            <button 
              className="btn-small primary"
              onClick={() => onStatusUpdate(order.id, getNextStatus(order.status))}
            >
              ➡️ {getStatusLabel(getNextStatus(order.status))}
            </button>
          )}
          
          {['annullato', 'pagato'].includes(order.status) && (
            <button 
              className="btn-small danger"
              onClick={onDelete}
            >
              🗑️ Elimina
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal Dettagli Ordine
function OrderDetailsModal({ order, onClose, onStatusUpdate, getStatusLabel, getStatusIcon, getNextStatus }) {
  if (!order) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">
            Ordine #{order.id} - {order.table_number ? `Tavolo ${order.table_number}` : 'Asporto'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="order-details-content">
          <div className="order-details-grid">
            <div className="detail-section">
              <h4>Informazioni Ordine</h4>
              <div className="detail-item">
                <span className="detail-label">Numero:</span>
                <span className="detail-value">#{order.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tavolo:</span>
                <span className="detail-value">
                  {order.table_number ? `🪑 Tavolo ${order.table_number}` : '📦 Asporto'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Cliente:</span>
                <span className="detail-value">👤 {order.customer_name || 'Non specificato'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Stato:</span>
                <span className={`status-badge ${order.status}`}>
                  {getStatusIcon(order.status)} {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Data/Ora:</span>
                <span className="detail-value">
                  {new Date(order.created_at).toLocaleString('it-IT')}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h4>Totale Ordine</h4>
              <div className="order-total-large">
                €{parseFloat(order.total || 0).toFixed(2)}
              </div>
              {order.notes && (
                <div className="order-notes">
                  <strong>Note:</strong>
                  <p>{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="detail-section">
              <h4>Prodotti Ordinati ({order.items.length})</h4>
              <div className="order-items-list">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item-detail">
                    <div className="item-info">
                      <div className="item-name">{item.name || 'Prodotto'}</div>
                      <div className="item-details">
                        <span className="item-quantity">Quantità: {item.quantity || 1}</span>
                        <span>Prezzo unitario: €{parseFloat(item.price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="item-price">
                      €{(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button 
            className="btn secondary" 
            onClick={onClose}
          >
            Chiudi
          </button>
          
          {getNextStatus(order.status) && (
            <button 
              className="btn primary"
              onClick={() => {
                onStatusUpdate(order.id, getNextStatus(order.status));
                onClose();
              }}
            >
              ➡️ Segna come {getStatusLabel(getNextStatus(order.status))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ ENHANCED: NEW ORDER MODAL WITH FULL PRODUCT INTEGRATION
function NewOrderModal({ onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [orderData, setOrderData] = useState({
    table_id: null,
    customer_name: '',
    customer_phone: '',
    payment_method: 'contanti',
    notes: '',
    items: []
  });

  useEffect(() => {
    loadTables();
    loadProducts();
    loadCategories();
  }, []);

  // ✅ ENHANCED: Load all available products with variants
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      console.log('📦 Loading products for order...');
      
      const response = await fetch('/api/products?include_variants=true&active=true', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Products loaded:', data);
      
      // ✅ ENHANCED: Process products with variants for order selection
      const processedProducts = (data.success ? data.products : data.products || []).map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        category_id: product.category_id,
        category_name: product.category_name,
        active: product.active,
        variants: (product.variants || []).filter(v => v.active).map(variant => ({
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          price: parseFloat(variant.price || 0),
          active: variant.active,
          full_name: variant.name !== product.name ? `${product.name} - ${variant.name}` : product.name
        }))
      })).filter(product => product.active && product.variants.length > 0);
      
      setProducts(processedProducts);
      console.log(`✅ Loaded ${processedProducts.length} active products for ordering`);
      
    } catch (error) {
      console.error('❌ Error loading products:', error);
      setError('Errore nel caricamento prodotti: ' + error.message);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // ✅ ENHANCED: Load categories for filtering
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/products/categories', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.success ? data.categories : data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTables = async () => {
    try {
      const response = await fetch('/api/orders/tables-status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTables(data.success ? data.tables : []);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  // ✅ ENHANCED: Add product variant to order
  const addProductToOrder = (product, variant) => {
    const existingItemIndex = orderData.items.findIndex(
      item => item.product_variant_id === variant.id
    );

    if (existingItemIndex >= 0) {
      // ✅ Increment quantity if already exists
      const updatedItems = [...orderData.items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1
      };
      
      setOrderData(prev => ({
        ...prev,
        items: updatedItems
      }));
    } else {
      // ✅ Add new item
      const newItem = {
        product_variant_id: variant.id,
        product_name: product.name,
        variant_name: variant.name,
        display_name: variant.full_name,
        quantity: 1,
        price: variant.price,
        notes: ''
      };
      
      setOrderData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }

    console.log('➕ Added product to order:', variant.full_name);
  };

  // ✅ ENHANCED: Update item quantity
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(index);
      return;
    }

    const updatedItems = [...orderData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: parseInt(newQuantity) || 1
    };
    
    setOrderData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  // ✅ ENHANCED: Update item notes
  const updateItemNotes = (index, notes) => {
    const updatedItems = [...orderData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      notes: notes
    };
    
    setOrderData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  // ✅ ENHANCED: Remove item from order
  const removeItemFromOrder = (index) => {
    const updatedItems = orderData.items.filter((_, i) => i !== index);
    setOrderData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  // ✅ ENHANCED: Calculate order total
  const calculateOrderTotal = () => {
    return orderData.items.reduce((total, item) => {
      return total + (parseFloat(item.price || 0) * parseInt(item.quantity || 1));
    }, 0);
  };

  // ✅ ENHANCED: Filter products
  const filteredProducts = products.filter(product => {
    const categoryMatch = selectedCategory === 'all' || product.category_id === selectedCategory;
    const searchMatch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.variants.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return categoryMatch && searchMatch;
  });

  // ✅ ENHANCED: Submit with proper validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ ENHANCED: Validate required fields
      if (!orderData.items || orderData.items.length === 0) {
        throw new Error('L\'ordine deve contenere almeno un prodotto');
      }

      // ✅ ENHANCED: Prepare order data for backend
      const orderPayload = {
        table_id: orderData.table_id,
        customer_name: orderData.customer_name.trim() || null,
        customer_phone: orderData.customer_phone.trim() || null,
        payment_method: orderData.payment_method,
        notes: orderData.notes.trim() || null,
        items: orderData.items.map(item => ({
          product_variant_id: item.product_variant_id,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
          notes: item.notes?.trim() || null
        }))
      };

      console.log('📤 Creating order:', orderPayload);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Order created:', result);
      
      onSave();
      
    } catch (error) {
      console.error('❌ Error creating order:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h3>➕ Nuovo Ordine</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">❌ {error}</div>}
            
            <div className="order-form-grid">
              {/* ✅ LEFT COLUMN: Order Info */}
              <div className="order-info-section">
                <div className="form-section">
                  <h4>📍 Informazioni Ordine</h4>
                  
                  <div className="form-group">
                    <label className="form-label">Tavolo</label>
                    <select
                      value={orderData.table_id || ''}
                      onChange={(e) => setOrderData(prev => ({
                        ...prev,
                        table_id: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      className="form-select"
                    >
                      <option value="">📦 Asporto</option>
                      {tables.filter(t => t.active && t.status !== 'occupied').map(table => (
                        <option key={table.id} value={table.id}>
                          🪑 Tavolo {table.number} ({table.capacity} posti) - {table.location || 'Interno'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nome Cliente</label>
                      <input
                        type="text"
                        value={orderData.customer_name}
                        onChange={(e) => setOrderData(prev => ({
                          ...prev,
                          customer_name: e.target.value
                        }))}
                        className="form-input"
                        placeholder="Nome del cliente (opzionale)"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Telefono</label>
                      <input
                        type="tel"
                        value={orderData.customer_phone}
                        onChange={(e) => setOrderData(prev => ({
                          ...prev,
                          customer_phone: e.target.value
                        }))}
                        className="form-input"
                        placeholder="Numero di telefono"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Metodo di Pagamento</label>
                    <select
                      value={orderData.payment_method}
                      onChange={(e) => setOrderData(prev => ({
                        ...prev,
                        payment_method: e.target.value
                      }))}
                      className="form-select"
                    >
                      <option value="contanti">💵 Contanti</option>
                      <option value="carta">💳 Carta di Credito</option>
                      <option value="bancomat">💳 Bancomat</option>
                      <option value="app">📱 App/Digitale</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Note Ordine</label>
                    <textarea
                      value={orderData.notes}
                      onChange={(e) => setOrderData(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      className="form-textarea"
                      rows="3"
                      placeholder="Note aggiuntive per l'ordine..."
                    />
                  </div>
                </div>

                {/* ✅ ORDER SUMMARY */}
                <div className="form-section">
                  <h4>🧾 Riepilogo Ordine</h4>
                  
                  {orderData.items.length === 0 ? (
                    <div className="empty-cart">
                      <p>🛒 Nessun prodotto selezionato</p>
                      <p>Aggiungi prodotti dalla lista a destra</p>
                    </div>
                  ) : (
                    <>
                      <div className="order-items-summary">
                        {orderData.items.map((item, index) => (
                          <div key={index} className="order-item-row">
                            <div className="item-info">
                              <div className="item-name">{item.display_name}</div>
                              {item.notes && (
                                <div className="item-notes">📝 {item.notes}</div>
                              )}
                            </div>
                            
                            <div className="item-controls">
                              <div className="quantity-controls">
                                <button
                                  type="button"
                                  className="qty-btn minus"
                                  onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  className="qty-input"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                  min="1"
                                  max="99"
                                />
                                <button
                                  type="button"
                                  className="qty-btn plus"
                                  onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>
                              
                              <div className="item-price">
                                €{(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}
                              </div>
                              
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeItemFromOrder(index)}
                                title="Rimuovi prodotto"
                              >
                                🗑️
                              </button>
                            </div>
                            
                            <div className="item-notes-input">
                              <input
                                type="text"
                                placeholder="Note per questo prodotto..."
                                value={item.notes}
                                onChange={(e) => updateItemNotes(index, e.target.value)}
                                className="form-input small"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="order-total-section">
                        <div className="total-label">Totale Ordine:</div>
                        <div className="total-amount">€{calculateOrderTotal().toFixed(2)}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ✅ RIGHT COLUMN: Product Selection */}
              <div className="product-selection-section">
                <div className="form-section">
                  <h4>🍽️ Selezione Prodotti</h4>
                  
                  {/* ✅ PRODUCTS FILTERS */}
                  <div className="products-filters">
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Cerca prodotti..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input small"
                      />
                      <span className="search-icon">🔍</span>
                    </div>
                    
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="filter-select small"
                    >
                      <option value="all">Tutte le categorie</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ✅ PRODUCTS LIST */}
                  <div className="products-list">
                    {loadingProducts ? (
                      <div className="loading-products">
                        <div className="spinner small"></div>
                        <p>Caricamento prodotti...</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="no-products">
                        <p>🚫 Nessun prodotto disponibile</p>
                        <p>Controlla i filtri o aggiungi prodotti al sistema</p>
                      </div>
                    ) : (
                      filteredProducts.map(product => (
                        <div key={product.id} className="product-item">
                          <div className="product-info">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="product-image"
                              />
                            )}
                            <div className="product-details">
                              <h5 className="product-name">{product.name}</h5>
                              {product.description && (
                                <p className="product-description">{product.description}</p>
                              )}
                              <span className="product-category">{product.category_name}</span>
                            </div>
                          </div>
                          
                          <div className="product-variants">
                            {product.variants.map(variant => (
                              <div key={variant.id} className="variant-row">
                                <div className="variant-info">
                                  <span className="variant-name">{variant.full_name}</span>
                                  <span className="variant-price">€{variant.price.toFixed(2)}</span>
                                </div>
                                <button
                                  type="button"
                                  className="add-product-btn"
                                  onClick={() => addProductToOrder(product, variant)}
                                >
                                  ➕ Aggiungi
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button 
              type="submit" 
              className="btn primary large"
              disabled={loading || orderData.items.length === 0}
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Creando ordine...
                </>
              ) : (
                <>
                  🛒 Crea Ordine (€{calculateOrderTotal().toFixed(2)})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Keep existing components: OrdersGrid, OrdersTable, OrderCard, OrderDetailsModal...
// They are already well implemented and don't need changes for backend alignment