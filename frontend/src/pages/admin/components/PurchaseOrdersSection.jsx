import { useState, useEffect } from "react";
import "./PurchaseOrdersSection.css";

export default function PurchaseOrdersSection() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  
  // ✅ FIXED: Filters allineati al backend
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    supplier_id: 'all',  // ✅ FIXED: era 'supplier'
    from_date: '',       // ✅ FIXED: era 'date_from'
    to_date: ''          // ✅ FIXED: era 'date_to'
  });

  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, [filters]);

  // ✅ ENHANCED: fetchOrders con proper error handling
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      console.log('🔍 Fetching orders with params:', params.toString());
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/purchase-orders?${params}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Orders response:', data);
      
      // ✅ ENHANCED: Handle response structure properly
      setOrders(data.orders || []);
      setStats(data.stats || {});
      
      // ✅ ENHANCED: Log pagination info if present
      if (data.pagination) {
        console.log(`📄 Pagination: ${data.pagination.limit} items, offset ${data.pagination.offset}`);
      }
      
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError(err.message);
      // ✅ ENHANCED: Set safe fallbacks
      setOrders([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: fetchSuppliers with relative URL
  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/purchase-orders/suppliers', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Suppliers loaded:', data);
        setSuppliers(data.suppliers || []);
      } else {
        console.warn('⚠️ Failed to load suppliers');
        setSuppliers([]);
      }
    } catch (err) {
      console.error('❌ Error fetching suppliers:', err);
      setSuppliers([]);
    }
  };

  // ✅ ENHANCED: Delete with proper error handling
  const handleDeleteOrder = async (id, orderNumber) => {
    if (!confirm(`Sei sicuro di voler eliminare l'ordine ${orderNumber}?`)) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Errore nell\'eliminazione');
      }
      
      await fetchOrders();
      console.log(`✅ Deleted order: ${orderNumber}`);
    } catch (err) {
      console.error('❌ Error deleting order:', err);
      setError(`Errore eliminazione: ${err.message}`);
    }
  };

  // ✅ ENHANCED: Status change with proper error handling
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/purchase-orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus,
          // ✅ ENHANCED: Include date fields based on status
          ...(newStatus === 'delivered' && { 
            actual_delivery_date: new Date().toISOString().split('T')[0] 
          })
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Errore nell\'aggiornamento stato');
      }

      await fetchOrders();
      console.log(`✅ Updated order ${orderId} status to: ${newStatus}`);
    } catch (err) {
      console.error('❌ Error updating status:', err);
      setError(`Errore aggiornamento stato: ${err.message}`);
    }
  };

  // ✅ ENHANCED: Status helpers with proper mapping
  const getStatusIcon = (status) => {
    const icons = {
      'draft': '📝',
      'sent': '📤',
      'confirmed': '✅',
      'delivered': '📦',
      'invoiced': '📄',
      'paid': '💰',
      'cancelled': '❌'
    };
    return icons[status] || '❓';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Bozza',
      'sent': 'Inviato',
      'confirmed': 'Confermato',
      'delivered': 'Consegnato',
      'invoiced': 'Fatturato',
      'paid': 'Pagato',
      'cancelled': 'Annullato'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'secondary',
      'sent': 'info',
      'confirmed': 'warning',
      'delivered': 'primary',
      'invoiced': 'success',
      'paid': 'success',
      'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
  };

  // ✅ ENHANCED: Formatting utilities
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  // ✅ ENHANCED: Loading state
  if (loading) {
    return (
      <div className="purchase-orders-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <h3>🔄 Caricamento Ordini</h3>
          <p>Elaborazione ordini acquisto in corso...</p>
          <small>Connessione backend ordini</small>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-orders-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🛒 Ordini Acquisto</h2>
          <p className="section-subtitle">
            {stats.total_orders || 0} ordini • {stats.confirmed_orders || 0} confermati • 
            Valore totale: {formatCurrency(stats.total_value)}
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowOrderModal(true)}
        >
          ➕ Nuovo Ordine
        </button>
      </div>

      {/* ✅ ENHANCED: Stats based on backend response */}
      <div className="order-stats">
        <div className="stat-card">
          <span className="stat-icon">📝</span>
          <div>
            <div className="stat-number">{stats.draft_orders || 0}</div>
            <div className="stat-label">Bozze</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📤</span>
          <div>
            <div className="stat-number">{stats.sent_orders || 0}</div>
            <div className="stat-label">Inviati</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{stats.confirmed_orders || 0}</div>
            <div className="stat-label">Confermati</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div>
            <div className="stat-number">{stats.delivered_orders || 0}</div>
            <div className="stat-label">Consegnati</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⚠️</span>
          <div>
            <div className="stat-number">{stats.overdue_orders || 0}</div>
            <div className="stat-label">In Ritardo</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">{formatCurrency(stats.delivered_value || 0)}</div>
            <div className="stat-label">Valore Consegnato</div>
          </div>
        </div>
      </div>

      {/* ✅ FIXED: Filtri con nomi corretti */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca ordini, fornitori, numero ordine..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="draft">📝 Bozze</option>
          <option value="sent">📤 Inviati</option>
          <option value="confirmed">✅ Confermati</option>
          <option value="delivered">📦 Consegnati</option>
          <option value="invoiced">📄 Fatturati</option>
          <option value="paid">💰 Pagati</option>
          <option value="cancelled">❌ Annullati</option>
        </select>

        <select
          value={filters.supplier_id}
          onChange={(e) => setFilters(prev => ({ ...prev, supplier_id: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti i fornitori</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
          ))}
        </select>

        {/* ✅ FIXED: Rimossi commenti dagli attributi */}
        <input
          type="date"
          value={filters.from_date}
          onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
          className="filter-date"
          placeholder="Da"
        />

        <input
          type="date"
          value={filters.to_date}
          onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
          className="filter-date"
          placeholder="A"
        />

        {/* ✅ ENHANCED: Clear filters button */}
        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => setFilters({
              search: '',
              status: 'all',
              supplier_id: 'all',
              from_date: '',
              to_date: ''
            })}
          >
            ✖️ Pulisci filtri
          </button>
        )}
      </div>

      {/* Enhanced Error banner */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* ✅ ENHANCED: Table with better data handling */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Fornitore</th>
              <th>Date</th>
              <th>Articoli</th>
              <th>Importo</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>
                  <div className="order-info">
                    <span className="order-number">{order.order_number}</span>
                    {order.invoice_number && (
                      <span className="invoice-number">Fatt: {order.invoice_number}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="supplier-info">
                    <span className="supplier-name">{order.supplier_name}</span>
                    {order.payment_terms && (
                      <span className="payment-terms">{order.payment_terms}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="date-info">
                    <span className="order-date">Ord: {formatDate(order.order_date)}</span>
                    {order.expected_delivery_date && (
                      <span className="delivery-date">
                        🚚 Cons: {formatDate(order.expected_delivery_date)}
                      </span>
                    )}
                    {order.actual_delivery_date && (
                      <span className="actual-delivery">
                        ✅ {formatDate(order.actual_delivery_date)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="items-count">
                    {order.items_count || 0} articoli
                    {order.total_items_quantity && (
                      <small> ({order.total_items_quantity} tot)</small>
                    )}
                  </span>
                </td>
                <td>
                  <div className="amount-info">
                    <span className="total-amount">{formatCurrency(order.total)}</span>
                    {order.subtotal !== order.total && (
                      <span className="subtotal">Sub: {formatCurrency(order.subtotal)}</span>
                    )}
                    {order.tax_amount > 0 && (
                      <span className="tax-amount">IVA: {formatCurrency(order.tax_amount)}</span>
                    )}
                  </div>
                </td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`status-select ${getStatusColor(order.status)}`}
                  >
                    <option value="draft">📝 Bozza</option>
                    <option value="sent">📤 Inviato</option>
                    <option value="confirmed">✅ Confermato</option>
                    <option value="delivered">📦 Consegnato</option>
                    <option value="invoiced">📄 Fatturato</option>
                    <option value="paid">💰 Pagato</option>
                    <option value="cancelled">❌ Annullato</option>
                  </select>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-small primary"
                      onClick={() => setViewingOrder(order)}
                      title="Visualizza"
                    >
                      👁️
                    </button>
                    <button 
                      className="btn-small secondary"
                      onClick={() => setEditingOrder(order)}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-small info"
                      onClick={() => {/* TODO: Invia email */}}
                      title="Invia"
                      disabled
                    >
                      📧
                    </button>
                    <button 
                      className="btn-small success"
                      onClick={() => {/* TODO: Stampa */}}
                      title="Stampa"
                      disabled
                    >
                      🖨️
                    </button>
                    <button 
                      className="btn-small danger"
                      onClick={() => handleDeleteOrder(order.id, order.order_number)}
                      title="Elimina"
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

      {/* Empty state */}
      {orders.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-icon">🛒</span>
          <h3>Nessun ordine trovato</h3>
          <p>
            {Object.values(filters).some(v => v && v !== 'all')
              ? 'Nessun ordine corrisponde ai filtri selezionati.'
              : 'Non ci sono ordini di acquisto. Inizia creando il primo ordine.'
            }
          </p>
          <button 
            className="btn primary" 
            onClick={() => setShowOrderModal(true)}
          >
            ➕ Crea Primo Ordine
          </button>
        </div>
      )}

      {/* Modal Create/Edit Order */}
      {(showOrderModal || editingOrder) && (
        <OrderModal
          order={editingOrder}
          suppliers={suppliers}
          onClose={() => {
            setShowOrderModal(false);
            setEditingOrder(null);
          }}
          onSave={() => {
            setShowOrderModal(false);
            setEditingOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* Modal View Order */}
      {viewingOrder && (
        <OrderViewModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onEdit={() => {
            setEditingOrder(viewingOrder);
            setViewingOrder(null);
          }}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED: OrderModal with relative URLs and proper validation
function OrderModal({ order, suppliers, onClose, onSave }) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_method: '',
    payment_terms: '',
    delivery_address: '',
    notes: '',
    items: [],
    ...order
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    fetchIngredients();
    // ✅ ENHANCED: Pre-populate items if editing
    if (order?.items) {
      setFormData(prev => ({ 
        ...prev, 
        items: order.items.map(item => ({
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          notes: item.notes || '',
          received_quantity: item.received_quantity || 0
        }))
      }));
    }
  }, [order]);

  const fetchIngredients = async () => {
    try {
      // ✅ FIXED: Relative URL
      const response = await fetch('/api/ingredients?active=true', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Ingredients loaded:', data);
        setIngredients(data.ingredients || data || []);
      }
    } catch (err) {
      console.error('❌ Error fetching ingredients:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ ENHANCED: Frontend validation
    if (!formData.supplier_id || !formData.order_date || !formData.items.length) {
      setError('Fornitore, data ordine e almeno un articolo sono obbligatori');
      return;
    }

    // ✅ ENHANCED: Validate items
    const invalidItems = formData.items.some(item => 
      !item.ingredient_id || !item.quantity || !item.unit_price
    );
    
    if (invalidItems) {
      setError('Tutti gli articoli devono avere ingrediente, quantità e prezzo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ FIXED: Relative URL
      const url = order 
        ? `/api/purchase-orders/${order.id}`
        : '/api/purchase-orders';
      
      const method = order ? 'PUT' : 'POST';
      
      console.log(`📤 ${method} order:`, formData);
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Errore nel salvataggio');
      }

      const result = await response.json();
      console.log('✅ Order saved:', result);
      
      onSave();
    } catch (err) {
      console.error('❌ Error saving order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        ingredient_id: '',
        quantity: '',
        unit: 'kg',
        unit_price: '',
        notes: ''
      }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // ✅ ENHANCED: Calculate totals with tax
  const calculateTotals = () => {
    const subtotal = formData.items.reduce((total, item) => {
      const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
      return total + itemTotal;
    }, 0);
    
    const tax_rate = 0.22; // 22% IVA
    const tax_amount = subtotal * tax_rate;
    const total = subtotal + tax_amount;
    
    return {
      subtotal: subtotal.toFixed(2),
      tax_amount: tax_amount.toFixed(2), 
      total: total.toFixed(2)
    };
  };

  const totals = calculateTotals();

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h3>{order ? `✏️ Modifica Ordine ${order.order_number}` : '➕ Nuovo Ordine Acquisto'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">❌ {error}</div>
            )}

            <div className="form-sections">
              {/* Sezione principale */}
              <div className="form-section">
                <h4>📋 Informazioni Ordine</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fornitore *</label>
                    <select
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">Seleziona fornitore</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Data Ordine *</label>
                    <input
                      type="date"
                      name="order_date"
                      value={formData.order_date}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Consegna Prevista</label>
                    <input
                      type="date"
                      name="expected_delivery_date"
                      value={formData.expected_delivery_date}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Metodo Pagamento</label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="">Seleziona metodo</option>
                      <option value="cash">💵 Contanti</option>
                      <option value="bank_transfer">🏦 Bonifico</option>
                      <option value="check">📝 Assegno</option>
                      <option value="credit_card">💳 Carta di Credito</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Termini Pagamento</label>
                    <input
                      type="text"
                      name="payment_terms"
                      value={formData.payment_terms}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="es. 30 giorni f.m."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Indirizzo Consegna</label>
                  <textarea
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="2"
                    placeholder="Indirizzo di consegna (opzionale)"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Note</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="2"
                    placeholder="Note aggiuntive per l'ordine"
                  />
                </div>
              </div>

              {/* Sezione articoli */}
              <div className="form-section">
                <div className="section-header-inline">
                  <h4>📦 Articoli Ordine ({formData.items.length})</h4>
                  <button type="button" className="btn-small primary" onClick={addItem}>
                    ➕ Aggiungi Articolo
                  </button>
                </div>

                <div className="items-list">
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-fields">
                        <select
                          value={item.ingredient_id}
                          onChange={(e) => updateItem(index, 'ingredient_id', e.target.value)}
                          className="form-select"
                          required
                        >
                          <option value="">Seleziona ingrediente</option>
                          {ingredients.map(ingredient => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="Quantità"
                          className="form-input"
                          step="0.001"
                          min="0"
                          required
                        />

                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="form-select"
                          required
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="pz">pz</option>
                          <option value="conf">conf</option>
                        </select>

                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          placeholder="Prezzo unitario €"
                          className="form-input"
                          step="0.0001"
                          min="0"
                          required
                        />

                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          placeholder="Note"
                          className="form-input"
                        />

                        <div className="item-total">
                          €{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-small danger"
                        onClick={() => removeItem(index)}
                        title="Rimuovi articolo"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                {formData.items.length > 0 && (
                  <div className="order-total">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                      <span>Subtotale:</span>
                      <span>€{totals.subtotal}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                      <span>IVA (22%):</span>
                      <span>€{totals.tax_amount}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #059669', paddingTop: '0.5rem'}}>
                      <strong>Totale Ordine:</strong>
                      <strong>€{totals.total}</strong>
                    </div>
                  </div>
                )}

                {formData.items.length === 0 && (
                  <div className="empty-state" style={{padding: '2rem', textAlign: 'center'}}>
                    <span className="empty-icon">📦</span>
                    <h4>Nessun articolo nell'ordine</h4>
                    <p>Aggiungi almeno un articolo per creare l'ordine</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button 
              type="submit" 
              className="btn primary" 
              disabled={loading || !formData.supplier_id || !formData.items.length}
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  {order ? 'Aggiornando...' : 'Creando...'}
                </>
              ) : (
                order ? '💾 Aggiorna Ordine' : '➕ Crea Ordine'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ ENHANCED: OrderViewModal with relative URL
function OrderViewModal({ order, onClose, onEdit }) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [order.id]);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/purchase-orders/${order.id}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Errore nel caricamento dettagli');
      }
      
      const data = await response.json();
      console.log('✅ Order details loaded:', data);
      setOrderDetails(data);
    } catch (err) {
      console.error('❌ Error fetching order details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content large">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <h3>🔄 Caricamento dettagli ordine...</h3>
            <p>Connessione al backend...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content large">
          <div className="modal-header">
            <h3>❌ Errore</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="error-message">
              {error}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={onClose}>Chiudi</button>
            <button className="btn primary" onClick={fetchOrderDetails}>🔄 Riprova</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>📋 Dettagli Ordine - {order.order_number}</h3>
          <div className="header-actions">
            <button className="btn-small primary" onClick={onEdit}>
              ✏️ Modifica
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="order-details">
            {/* Info principale */}
            <div className="details-section">
              <h4>ℹ️ Informazioni Generali</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Numero Ordine:</label>
                  <span>{orderDetails?.order_number}</span>
                </div>
                <div className="detail-item">
                  <label>Fornitore:</label>
                  <span>{orderDetails?.supplier_name}</span>
                </div>
                <div className="detail-item">
                  <label>Email Fornitore:</label>
                  <span>{orderDetails?.supplier_email || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Data Ordine:</label>
                  <span>{formatDate(orderDetails?.order_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Consegna Prevista:</label>
                  <span>{formatDate(orderDetails?.expected_delivery_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Consegna Effettiva:</label>
                  <span>{formatDate(orderDetails?.actual_delivery_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Stato:</label>
                  <span className={`status-badge ${orderDetails?.status}`}>
                    {orderDetails?.status}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Metodo Pagamento:</label>
                  <span>{orderDetails?.payment_method || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Termini Pagamento:</label>
                  <span>{orderDetails?.payment_terms || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Totali */}
            <div className="details-section">
              <h4>💰 Riepilogo Importi</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Subtotale:</label>
                  <span>{formatCurrency(orderDetails?.subtotal)}</span>
                </div>
                <div className="detail-item">
                  <label>IVA:</label>
                  <span>{formatCurrency(orderDetails?.tax_amount)}</span>
                </div>
                <div className="detail-item">
                  <label>Sconto:</label>
                  <span>{formatCurrency(orderDetails?.discount_amount)}</span>
                </div>
                <div className="detail-item">
                  <label>Spese Spedizione:</label>
                  <span>{formatCurrency(orderDetails?.shipping_cost)}</span>
                </div>
                <div className="detail-item">
                  <label>Totale:</label>
                  <span className="total-amount">{formatCurrency(orderDetails?.total)}</span>
                </div>
                {orderDetails?.invoice_number && (
                  <div className="detail-item">
                    <label>Numero Fattura:</label>
                    <span>{orderDetails.invoice_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Articoli */}
            <div className="details-section">
              <h4>📦 Articoli Ordinati ({orderDetails?.items?.length || 0})</h4>
              <div className="items-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>Categoria</th>
                      <th>Quantità</th>
                      <th>Prezzo Unit.</th>
                      <th>Totale</th>
                      <th>Ricevuto</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetails?.items?.map(item => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.ingredient_name}</strong>
                        </td>
                        <td>
                          <span className="category-badge">{item.ingredient_category}</span>
                        </td>
                        <td>{item.quantity} {item.unit}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{formatCurrency(item.total_price)}</td>
                        <td>
                          <span className={item.received_quantity > 0 ? 'text-success' : 'text-warning'}>
                            {item.received_quantity || 0} {item.unit}
                          </span>
                        </td>
                        <td>{item.notes || '-'}</td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan="7" style={{textAlign: 'center', color: '#64748b', padding: '2rem'}}>
                          Nessun articolo nell'ordine
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note e dettagli aggiuntivi */}
            {(orderDetails?.notes || orderDetails?.delivery_address) && (
              <div className="details-section">
                <h4>📝 Dettagli Aggiuntivi</h4>
                {orderDetails.delivery_address && (
                  <div className="detail-item">
                    <label>Indirizzo Consegna:</label>
                    <span>{orderDetails.delivery_address}</span>
                  </div>
                )}
                {orderDetails.notes && (
                  <div className="detail-item">
                    <label>Note:</label>
                    <span>{orderDetails.notes}</span>
                  </div>
                )}
                <div className="detail-item">
                  <label>Creato da:</label>
                  <span>{orderDetails?.created_by_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Data Creazione:</label>
                  <span>{formatDate(orderDetails?.created_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Ultima Modifica:</label>
                  <span>{formatDate(orderDetails?.updated_at)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button className="btn info" disabled>
            🖨️ Stampa
          </button>
          <button className="btn success" disabled>
            📧 Invia Email
          </button>
        </div>
      </div>
    </div>
  );
}