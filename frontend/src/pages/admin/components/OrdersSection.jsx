import { useState, useEffect } from "react";

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
  const [viewMode, setViewMode] = useState('cards'); // 'cards' o 'table'
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0
  });

  useEffect(() => {
    loadOrders();
    // Aggiorna gli ordini ogni 30 secondi per simulare tempo reale
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterOrders();
    calculateStats();
  }, [orders, searchTerm, statusFilter, dateFilter, tableFilter]);

  const loadOrders = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3000/api/orders', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        setError('Errore nel caricamento ordini');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filtro per testo (numero ordine o tavolo)
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id?.toString().includes(searchTerm) ||
        order.table_number?.toString().includes(searchTerm) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro per stato
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filtro per tavolo
    if (tableFilter) {
      filtered = filtered.filter(order => 
        order.table_number?.toString() === tableFilter
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

  const calculateStats = () => {
    const today = new Date();
    const todayOrders = orders.filter(order => 
      new Date(order.created_at).toDateString() === today.toDateString()
    );

    const totalOrders = orders.length;
    const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const pendingOrders = orders.filter(order => 
      ['pending', 'preparing', 'ready'].includes(order.status)
    ).length;
    const completedOrders = orders.filter(order => 
      order.status === 'completed'
    ).length;
    const averageOrderValue = totalOrders > 0 ? 
      orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / totalOrders : 0;

    setStats({
      totalOrders,
      todayRevenue,
      pendingOrders,
      completedOrders,
      averageOrderValue
    });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        alert(`Ordine aggiornato a: ${getStatusLabel(newStatus)}`);
      } else {
        alert('Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Errore di rete');
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo ordine?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setOrders(orders.filter(order => order.id !== orderId));
        alert('Ordine eliminato con successo');
      } else {
        alert('Errore nell\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Errore di rete');
    }
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      'pending': 'In attesa',
      'preparing': 'In preparazione',
      'ready': 'Pronto',
      'served': 'Servito',
      'completed': 'Completato',
      'cancelled': 'Annullato'
    };
    return statusLabels[status] || status;
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      'pending': '⏳',
      'preparing': '👨‍🍳',
      'ready': '✅',
      'served': '🍽️',
      'completed': '✔️',
      'cancelled': '❌'
    };
    return statusIcons[status] || '❓';
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'pending': 'preparing',
      'preparing': 'ready',
      'ready': 'served',
      'served': 'completed'
    };
    return statusFlow[currentStatus];
  };

  const getUniqueTableNumbers = () => {
    const tables = [...new Set(orders.map(order => order.table_number).filter(Boolean))];
    return tables.sort((a, b) => a - b);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Caricamento ordini...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <h3>Errore nel caricamento</h3>
        <p>{error}</p>
        <button className="btn primary" onClick={loadOrders}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="orders-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>📋 Gestione Ordini</h2>
          <p className="section-subtitle">
            {stats.totalOrders} ordini totali • {stats.pendingOrders} in corso • €{stats.todayRevenue.toFixed(2)} oggi
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={loadOrders}
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
        </div>
      </div>

      {/* Statistiche rapide */}
      <div className="orders-stats">
        <div className="stat-card mini urgent">
          <span className="stat-icon">⏳</span>
          <div>
            <div className="stat-number">{stats.pendingOrders}</div>
            <div className="stat-label">In Corso</div>
          </div>
        </div>
        <div className="stat-card mini success">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{stats.completedOrders}</div>
            <div className="stat-label">Completati</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">€{stats.todayRevenue.toFixed(0)}</div>
            <div className="stat-label">Incasso Oggi</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">📊</span>
          <div>
            <div className="stat-number">€{stats.averageOrderValue.toFixed(0)}</div>
            <div className="stat-label">Scontrino Medio</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per numero ordine, tavolo o cliente..."
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
          <option value="preparing">👨‍🍳 In preparazione</option>
          <option value="ready">✅ Pronto</option>
          <option value="served">🍽️ Servito</option>
          <option value="completed">✔️ Completato</option>
          <option value="cancelled">❌ Annullato</option>
        </select>

        <select 
          className="filter-select"
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
        >
          <option value="">Tutti i tavoli</option>
          {getUniqueTableNumbers().map(table => (
            <option key={table} value={table}>
              Tavolo {table}
            </option>
          ))}
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

        {(searchTerm || statusFilter || tableFilter || dateFilter !== 'today') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
              setTableFilter("");
              setDateFilter("today");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Contenuto principale */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>Nessun ordine trovato</h3>
          <p>
            {orders.length === 0 
              ? "Non ci sono ordini nel sistema"
              : "Nessun ordine corrisponde ai filtri selezionati"
            }
          </p>
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
    </div>
  );
}

// Componente Vista Cards
function OrdersGrid({ orders, onStatusUpdate, onViewDetails, onDelete, getStatusLabel, getStatusIcon, getNextStatus }) {
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
            <tr key={order.id}>
              <td>
                <div className="order-id">
                  <strong>#{order.id}</strong>
                </div>
              </td>
              <td>
                <span className="table-badge">
                  🪑 Tavolo {order.table_number || 'N/A'}
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
                  <button 
                    className="btn-small danger"
                    onClick={() => onDelete(order.id)}
                    title="Elimina ordine"
                  >
                    🗑️
                  </button>
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
  };

  const getUrgencyClass = () => {
    const date = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (order.status === 'pending' && diffMinutes > 15) return 'urgent';
    if (order.status === 'preparing' && diffMinutes > 30) return 'urgent';
    if (order.status === 'ready' && diffMinutes > 10) return 'urgent';
    return '';
  };

  return (
    <div className={`order-card ${order.status} ${getUrgencyClass()}`}>
      <div className="order-header">
        <div className="order-info">
          <h3 className="order-number">#{order.id}</h3>
          <span className="table-number">🪑 Tavolo {order.table_number || 'N/A'}</span>
        </div>
        <div className="order-time">
          {formatTime(order.created_at)}
        </div>
      </div>

      <div className="order-content">
        {order.customer_name && (
          <div className="customer-name">
            👤 {order.customer_name}
          </div>
        )}

        <div className="order-status-section">
          <span className={`status-badge ${order.status}`}>
            {getStatusIcon(order.status)} {getStatusLabel(order.status)}
          </span>
          <span className="order-total">€{parseFloat(order.total || 0).toFixed(2)}</span>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="order-items-preview">
            <div className="items-count">
              📦 {order.items.length} prodotti
            </div>
            <div className="items-list">
              {order.items.slice(0, 2).map((item, index) => (
                <span key={index} className="item-preview">
                  {item.quantity}x {item.name}
                </span>
              ))}
              {order.items.length > 2 && (
                <span className="more-items">
                  +{order.items.length - 2} altri...
                </span>
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
          
          {order.status === 'cancelled' && (
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
  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">
            Ordine #{order.id} - Tavolo {order.table_number}
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
                <span className="detail-value">🪑 {order.table_number || 'N/A'}</span>
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

          {order.items && order.items.length > 0 && (
            <div className="detail-section">
              <h4>Prodotti Ordinati ({order.items.length})</h4>
              <div className="order-items-list">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item-detail">
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-quantity">Quantità: {item.quantity}</span>
                    </div>
                    <div className="item-price">
                      €{(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
    </div>
  );
}