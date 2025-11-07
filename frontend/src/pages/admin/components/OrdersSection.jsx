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
    filterOrders();
  }, [orders, searchTerm, statusFilter, dateFilter, tableFilter, paymentFilter]);

  const loadOrders = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const params = new URLSearchParams();
      
      // Aggiungi filtri alla query se necessario
      if (statusFilter) params.append('status', statusFilter);
      if (tableFilter && tableFilter !== 'null') params.append('table_id', tableFilter);
      if (paymentFilter) params.append('payment_method', paymentFilter);
      
      const response = await fetch(`http://localhost:3000/api/orders?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Orders loaded:', data);
        setOrders(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        setError(errorData.error || 'Errore nel caricamento ordini');
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Network error loading orders:', error);
      setError('Errore di connessione al server');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/orders/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📈 Stats loaded:', data);
        setStats(data || {});
      } else {
        console.error('❌ Error loading stats');
        setStats({});
      }
    } catch (error) {
      console.error('❌ Network error loading stats:', error);
      setStats({});
    }
  };

  const filterOrders = () => {
    if (!Array.isArray(orders)) {
      setFilteredOrders([]);
      return;
    }

    let filtered = [...orders];

    // Filtro per testo
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id?.toString().includes(searchTerm) ||
        order.table_number?.toString().includes(searchTerm) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone?.includes(searchTerm)
      );
    }

    // Filtro per data
    if (dateFilter) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        
        switch (dateFilter) {
          case 'today':
            return orderDate.toDateString() === today.toDateString();
          case 'yesterday':
            return orderDate.toDateString() === yesterday.toDateString();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDate >= weekAgo;
          case 'month':
            return orderDate.getMonth() === today.getMonth() && 
                   orderDate.getFullYear() === today.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Aggiorna l'ordine nella lista
        setOrders(orders.map(order => 
          order.id === orderId ? { 
            ...order, 
            status: newStatus,
            served_at: result.served_at || order.served_at,
            paid_at: result.paid_at || order.paid_at,
            payment_status: result.payment_status || order.payment_status
          } : order
        ));
        
        // Ricarica le statistiche
        loadStats();
        
        console.log(`✅ Order ${orderId} updated to: ${newStatus}`);
      } else {
        const errorData = await response.json();
        alert(`Errore: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Errore di rete');
    }
  };

  const deleteOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    
    if (!confirm(`Sei sicuro di voler eliminare l'ordine #${orderId}?${order?.table_number ? ` (Tavolo ${order.table_number})` : ''}`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setOrders(orders.filter(order => order.id !== orderId));
        loadStats();
        console.log(`✅ Order ${orderId} deleted`);
      } else {
        const errorData = await response.json();
        alert(`Errore: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Errore di rete');
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
          <p>Caricamento ordini...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-section">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Errore nel caricamento</h3>
          <p>{error}</p>
          <button className="btn primary" onClick={loadOrders}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>📋 Gestione Ordini</h2>
          <p className="section-subtitle">
            {stats.total_orders || 0} ordini totali • {stats.pending_orders || 0} in corso • €{parseFloat(stats.today_revenue || 0).toFixed(2)} oggi
            {stats.revenue_trend && stats.revenue_trend !== 0 && (
              <span className={`trend ${parseFloat(stats.revenue_trend || 0) > 0 ? 'positive' : 'negative'}`}>
                {parseFloat(stats.revenue_trend || 0) > 0 ? '📈' : '📉'} {Math.abs(parseFloat(stats.revenue_trend || 0))}%
              </span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => { loadOrders(); loadStats(); }}
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

      {/* Statistiche migliorate */}
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

      {/* Filtri migliorati */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca ordine, tavolo, cliente, telefono..."
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
          <option value="">Tutti i tavoli</option>
          <option value="null">📦 Asporto</option>
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
          <option value="carta">💳 Carta</option>
          <option value="bancomat">💳 Bancomat</option>
          <option value="app">📱 App</option>
        </select>

        <select 
          className="filter-select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="">Tutte le date</option>
          <option value="today">Oggi</option>
          <option value="yesterday">Ieri</option>
          <option value="week">Ultima settimana</option>
          <option value="month">Questo mese</option>
        </select>

        {(searchTerm || statusFilter || tableFilter || paymentFilter || dateFilter !== 'today') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
              setTableFilter("");
              setPaymentFilter("");
              setDateFilter("today");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Contenuto principale */}
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
        <OrdersGrid 
          orders={filteredOrders}
          onStatusUpdate={updateOrderStatus}
          onViewDetails={setSelectedOrder}
          onDelete={deleteOrder}
          getStatusLabel={getStatusLabel}
          getStatusIcon={getStatusIcon}
          getNextStatus={getNextStatus}
        />
      ) : (
        <OrdersTable 
          orders={filteredOrders}
          onStatusUpdate={updateOrderStatus}
          onViewDetails={setSelectedOrder}
          onDelete={deleteOrder}
          getStatusLabel={getStatusLabel}
          getStatusIcon={getStatusIcon}
          getNextStatus={getNextStatus}
        />
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
            loadOrders();
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

// Modal Nuovo Ordine semplificato
function NewOrderModal({ onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateTestOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      // Crea un ordine di test semplice
      const testOrder = {
        table_id: null, // Asporto
        customer_name: 'Cliente Test',
        customer_phone: '123456789',
        items: [
          {
            product_variant_id: 1,
            quantity: 1,
            price: 10.00
          }
        ],
        notes: 'Ordine di test',
        payment_method: 'contanti'
      };

      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(testOrder)
      });

      if (response.ok) {
        onSave();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nella creazione ordine');
      }
    } catch (error) {
      setError('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Nuovo Ordine</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">❌ {error}</div>}
          
          <p>Funzionalità di creazione ordini in sviluppo.</p>
          <p>Per ora puoi creare un ordine di test:</p>
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Annulla
          </button>
          <button 
            className="btn primary" 
            onClick={handleCreateTestOrder}
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crea Ordine Test'}
          </button>
        </div>
      </div>
    </div>
  );
}