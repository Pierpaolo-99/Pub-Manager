import { useState, useEffect } from "react";
import "./StockMovementsSection.css";

export default function StockMovementsSection() {
  const [movements, setMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    reference_type: 'all',
    date_from: '',
    date_to: '',
    product_id: 'all'
  });
  
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    limit: 100,
    offset: 0,
    total: 0,
    hasMore: true
  });

  useEffect(() => {
    fetchMovements();
    fetchProducts();
    fetchStats();
  }, []);

  useEffect(() => {
    filterMovements();
  }, [movements, filters]);

  // ✅ ENHANCED: Fetch movements with better error handling
  const fetchMovements = async (resetPagination = true) => {
    try {
      setLoading(true);
      setError(null);
      
      if (resetPagination) {
        setPagination(prev => ({ ...prev, offset: 0 }));
      }
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      params.append('limit', pagination.limit.toString());
      params.append('offset', resetPagination ? '0' : pagination.offset.toString());
      
      console.log('🔄 Fetching movements with params:', params.toString());
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/stock-movements?${params}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessione scaduta. Effettua nuovamente il login.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Movements loaded:', data);
      
      // ✅ ENHANCED: Handle both response formats
      const movementsArray = data.movements || data.data?.movements || [];
      
      if (resetPagination) {
        setMovements(movementsArray);
      } else {
        setMovements(prev => [...prev, ...movementsArray]);
      }
      
      setPagination(prev => ({
        ...prev,
        hasMore: movementsArray.length >= pagination.limit,
        offset: resetPagination ? movementsArray.length : prev.offset + movementsArray.length
      }));
      
    } catch (err) {
      console.error('❌ Error fetching movements:', err);
      setError(err.message);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: Fetch products with error handling
  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching products for movements...');
      
      // ✅ FIXED: Relative URL
      const response = await fetch('/api/stock-movements/products', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Products loaded:', data);
      
      // ✅ ENHANCED: Handle both response formats
      const productsArray = data.products || data.data?.products || [];
      setProducts(productsArray);
      
    } catch (err) {
      console.error('❌ Error fetching products:', err);
      // Non bloccare l'UI per errori prodotti
      setProducts([]);
    }
  };

  // ✅ ENHANCED: Fetch stats with error handling
  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && key !== 'search') {
          params.append(key, value);
        }
      });
      
      console.log('📊 Fetching stats...');
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/stock-movements/stats?${params}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Stats loaded:', data);
      
      // ✅ ENHANCED: Validate stats data
      const statsData = data || {};
      
      // Ensure all stats are numbers
      Object.keys(statsData).forEach(key => {
        if (statsData[key] === null || statsData[key] === undefined) {
          statsData[key] = 0;
        } else if (typeof statsData[key] === 'string') {
          statsData[key] = parseFloat(statsData[key]) || 0;
        }
      });
      
      setStats(statsData);
      
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      setStats({});
    }
  };

  // ✅ ENHANCED: Filter movements with better performance
  const filterMovements = () => {
    let filtered = [...movements];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(movement =>
        movement.product_name?.toLowerCase().includes(searchLower) ||
        movement.variant_name?.toLowerCase().includes(searchLower) ||
        movement.reason?.toLowerCase().includes(searchLower) ||
        movement.notes?.toLowerCase().includes(searchLower) ||
        movement.user_name?.toLowerCase().includes(searchLower) ||
        movement.id?.toString().includes(searchLower)
      );
    }

    setFilteredMovements(filtered);
  };

  // ✅ ENHANCED: Handle delete with stock update feedback
  const handleDeleteMovement = async (id, productName, movementData) => {
    const warningMessage = `Eliminare il movimento per "${productName}"?

⚠️ ATTENZIONE: 
- Il movimento verrà eliminato dal database
- Lo stock verrà automaticamente aggiornato (revertito)
- Tipo: ${getTypeLabel(movementData.type)}
- Quantità: ${movementData.quantity}

Questa operazione è irreversibile.`;

    if (!confirm(warningMessage)) {
      return;
    }
    
    try {
      setError(null);
      console.log(`🗑️ Deleting movement ${id}...`);
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/stock-movements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }
      
      const result = await response.json();
      console.log('✅ Movement deleted:', result);
      
      // ✅ ENHANCED: Show success feedback
      setSuccessMessage(`Movimento eliminato! ${result.message || ''}`);
      
      // Refresh data
      await fetchMovements();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Error deleting movement:', err);
      setError(`Errore eliminazione: ${err.message}`);
    }
  };

  // ✅ ENHANCED: Handle filter changes with debouncing
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Reset pagination when filters change
    setPagination(prev => ({ ...prev, offset: 0 }));
    
    // Debounce API calls for search
    if (key === 'search') {
      const timer = setTimeout(() => {
        fetchMovements(true);
        fetchStats();
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      fetchMovements(true);
      fetchStats();
    }
  };

  // ✅ ENHANCED: Load more movements (pagination)
  const loadMoreMovements = () => {
    if (!loading && pagination.hasMore) {
      fetchMovements(false);
    }
  };

  // ✅ ENHANCED: Clear messages automatically
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getTypeIcon = (type) => {
    const icons = {
      'in': '📥',
      'out': '📤',
      'adjustment': '⚖️'
    };
    return icons[type] || '❓';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'in': 'Entrata',
      'out': 'Uscita',
      'adjustment': 'Rettifica'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      'in': 'success',
      'out': 'warning',
      'adjustment': 'info'
    };
    return colors[type] || 'secondary';
  };

  const getReferenceIcon = (reference_type) => {
    const icons = {
      'order': '🛒',
      'supplier': '📦',
      'manual': '✋'
    };
    return icons[reference_type] || '📄';
  };

  const getReferenceLabel = (reference_type) => {
    const labels = {
      'order': 'Ordine',
      'supplier': 'Fornitore',
      'manual': 'Manuale'
    };
    return labels[reference_type] || reference_type;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return formatDate(dateString);
  };

  if (loading && movements.length === 0) {
    return (
      <div className="stock-movements-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento movimenti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-movements-section">
      {/* Enhanced Error Banner */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Enhanced Success Banner */}
      {successMessage && (
        <div className="success-banner">
          <span className="success-icon">✅</span>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="success-close">×</button>
        </div>
      )}

      {/* Header con statistiche */}
      <div className="section-header">
        <div className="header-left">
          <h2>📈 Movimenti Stock</h2>
          <p className="section-subtitle">
            {stats.total_movements || 0} movimenti totali • 
            {stats.inbound_movements || 0} entrate • 
            {stats.outbound_movements || 0} uscite
            {stats.total_inbound_value > 0 && ` • Valore entrate: ${formatCurrency(stats.total_inbound_value)}`}
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              fetchMovements(true);
              fetchStats();
            }}
            disabled={loading}
            title="Aggiorna movimenti"
          >
            {loading ? '⏳' : '🔄'} Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Nuovo Movimento
          </button>
        </div>
      </div>

      {/* Statistiche rapide - Enhanced */}
      <div className="movements-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">⬆️</span>
          <div>
            <div className="stat-number">{stats.inbound_movements || 0}</div>
            <div className="stat-label">Entrate</div>
            {stats.total_inbound_value > 0 && (
              <div className="stat-value">{formatCurrency(stats.total_inbound_value)}</div>
            )}
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">⬇️</span>
          <div>
            <div className="stat-number">{stats.outbound_movements || 0}</div>
            <div className="stat-label">Uscite</div>
            {stats.total_outbound_value > 0 && (
              <div className="stat-value">{formatCurrency(stats.total_outbound_value)}</div>
            )}
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">⚖️</span>
          <div>
            <div className="stat-number">{stats.adjustment_movements || 0}</div>
            <div className="stat-label">Rettifiche</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">📋</span>
          <div>
            <div className="stat-number">{stats.manual_movements || 0}</div>
            <div className="stat-label">Manuali</div>
          </div>
        </div>
        <div className="stat-card mini primary">
          <span className="stat-icon">🛒</span>
          <div>
            <div className="stat-number">{stats.order_movements || 0}</div>
            <div className="stat-label">Ordini</div>
          </div>
        </div>
        <div className="stat-card mini tertiary">
          <span className="stat-icon">🚚</span>
          <div>
            <div className="stat-number">{stats.supplier_movements || 0}</div>
            <div className="stat-label">Fornitori</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per prodotto, motivo, note, ID movimento..."
            className="search-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="all">Tutti i tipi</option>
          <option value="in">📥 Entrate</option>
          <option value="out">📤 Uscite</option>
          <option value="adjustment">⚖️ Rettifiche</option>
        </select>

        <select 
          className="filter-select"
          value={filters.reference_type}
          onChange={(e) => handleFilterChange('reference_type', e.target.value)}
        >
          <option value="all">Tutti i riferimenti</option>
          <option value="order">🛒 Ordini</option>
          <option value="manual">✋ Manuali</option>
          <option value="supplier">🚚 Fornitori</option>
        </select>

        <select
          value={filters.product_id}
          onChange={(e) => handleFilterChange('product_id', e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti i prodotti</option>
          {products.map(product => (
            <option key={product.product_id} value={product.product_id}>
              {product.product_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          className="filter-date"
          title="Data da"
        />

        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          className="filter-date"
          title="Data a"
        />

        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setFilters({
                search: '',
                type: 'all',
                reference_type: 'all',
                date_from: '',
                date_to: '',
                product_id: 'all'
              });
              fetchMovements(true);
              fetchStats();
            }}
          >
            🧹 Pulisci
          </button>
        )}
      </div>

      {/* Enhanced Table */}
      {filteredMovements.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📈</span>
          <h3>Nessun movimento trovato</h3>
          <p>
            {movements.length === 0 
              ? "Non ci sono movimenti registrati nel sistema"
              : "Nessun movimento corrisponde ai filtri selezionati"
            }
          </p>
          <div className="empty-actions">
            <button 
              className="btn primary" 
              onClick={() => setShowAddModal(true)}
            >
              + Primo Movimento
            </button>
            {movements.length > 0 && (
              <button 
                className="btn secondary" 
                onClick={() => {
                  setFilters({
                    search: '',
                    type: 'all',
                    reference_type: 'all',
                    date_from: '',
                    date_to: '',
                    product_id: 'all'
                  });
                  fetchMovements(true);
                }}
              >
                🔄 Reset Filtri
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data/Ora</th>
                <th>Prodotto</th>
                <th>Tipo</th>
                <th>Quantità</th>
                <th>Costo/Valore</th>
                <th>Riferimento</th>
                <th>Motivo</th>
                <th>Utente</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map(movement => (
                <tr key={movement.id} className={`movement-row ${movement.type}`}>
                  <td>
                    <span className="movement-id">#{movement.id}</span>
                  </td>
                  <td>
                    <div className="movement-date">
                      <span className="date">{formatDate(movement.created_at)}</span>
                      <span className="time-ago">{getTimeAgo(movement.created_at)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="product-info">
                      <div className="product-name">{movement.product_name}</div>
                      <div className="variant-name">{movement.variant_name}</div>
                      {movement.category_name && (
                        <div className="category-name">{movement.category_name}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`movement-type ${getTypeColor(movement.type)}`}>
                      {getTypeIcon(movement.type)} {getTypeLabel(movement.type)}
                    </span>
                  </td>
                  <td>
                    <span className={`movement-quantity ${movement.type}`}>
                      {movement.type === 'out' ? '-' : movement.type === 'adjustment' ? '±' : '+'}
                      {movement.quantity}
                    </span>
                  </td>
                  <td>
                    <div className="movement-cost">
                      {movement.cost_per_unit > 0 && (
                        <div className="cost-per-unit">
                          {formatCurrency(movement.cost_per_unit)}/u
                        </div>
                      )}
                      {movement.total_cost > 0 && (
                        <div className="total-cost">
                          Tot: {formatCurrency(movement.total_cost)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="reference-info">
                      <span className={`reference-type ${movement.reference_type}`}>
                        {getReferenceIcon(movement.reference_type)} {getReferenceLabel(movement.reference_type)}
                      </span>
                      {movement.reference_id && (
                        <div className="reference-id">ID: {movement.reference_id}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="movement-reason">
                      {movement.reason && <div className="reason">{movement.reason}</div>}
                      {movement.notes && <div className="notes" title={movement.notes}>
                        {movement.notes.length > 30 
                          ? `${movement.notes.substring(0, 30)}...` 
                          : movement.notes
                        }
                      </div>}
                    </div>
                  </td>
                  <td>
                    <span className="user-name">{movement.user_name || 'Sistema'}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-small secondary"
                        onClick={() => setEditingMovement(movement)}
                        title="Modifica note e motivo"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-small danger"
                        onClick={() => handleDeleteMovement(
                          movement.id, 
                          `${movement.product_name} - ${movement.variant_name}`,
                          movement
                        )}
                        title="Elimina movimento (revertirà lo stock)"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Enhanced Pagination */}
          {pagination.hasMore && (
            <div className="pagination-controls">
              <button 
                className="btn secondary load-more"
                onClick={loadMoreMovements}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Caricando...
                  </>
                ) : (
                  '📄 Carica Altri Movimenti'
                )}
              </button>
              <small className="pagination-info">
                Visualizzati: {filteredMovements.length} • Caricati: {movements.length}
              </small>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Modals */}
      {showAddModal && (
        <MovementModal
          onClose={() => setShowAddModal(false)}
          onSave={(newMovement) => {
            setShowAddModal(false);
            setSuccessMessage(`Movimento creato con successo! ID: ${newMovement.id}`);
            fetchMovements(true);
            fetchStats();
          }}
          products={products}
        />
      )}

      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          onClose={() => setEditingMovement(null)}
          onSave={() => {
            setEditingMovement(null);
            setSuccessMessage('Movimento aggiornato con successo!');
            fetchMovements(true);
          }}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED: MovementModal with better validation and feedback
function MovementModal({ onClose, onSave, products }) {
  const [formData, setFormData] = useState({
    product_variant_id: '',
    type: 'in',
    quantity: '',
    reason: '',
    reference_type: 'manual',
    reference_id: '',
    cost_per_unit: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // ✅ ENHANCED: Calculate estimated cost
  useEffect(() => {
    if (formData.quantity && formData.cost_per_unit) {
      const quantity = parseFloat(formData.quantity) || 0;
      const cost = parseFloat(formData.cost_per_unit) || 0;
      setEstimatedCost(quantity * cost);
    } else {
      setEstimatedCost(0);
    }
  }, [formData.quantity, formData.cost_per_unit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ ENHANCED: Client-side validation
    if (!formData.product_variant_id) {
      setError('Seleziona un prodotto');
      return;
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setError('Inserisci una quantità valida (maggiore di 0)');
      return;
    }

    if (formData.type === 'out' && selectedProduct) {
      const quantity = parseFloat(formData.quantity);
      const currentStock = parseFloat(selectedProduct.current_stock) || 0;
      
      if (quantity > currentStock) {
        const confirm = window.confirm(
          `⚠️ ATTENZIONE: Stai rimuovendo più stock di quello disponibile!\n\n` +
          `Stock attuale: ${currentStock}\n` +
          `Quantità da rimuovere: ${quantity}\n` +
          `Stock risultante: ${currentStock - quantity}\n\n` +
          `Continuare comunque?`
        );
        
        if (!confirm) return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('💾 Creating movement:', formData);
      
      // ✅ FIXED: Relative URL
      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione movimento');
      }

      const result = await response.json();
      console.log('✅ Movement created:', result);
      
      onSave(result);
      
    } catch (err) {
      console.error('❌ Error creating movement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (variantId) => {
    const product = products.find(p => p.variant_id == variantId);
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      product_variant_id: variantId,
      cost_per_unit: product?.cost_per_unit || ''
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>📥 Nuovo Movimento Stock</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
            
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prodotto/Variante *</label>
                  <select
                    name="product_variant_id"
                    value={formData.product_variant_id}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Seleziona prodotto</option>
                    {products.map(product => (
                      <option key={product.variant_id} value={product.variant_id}>
                        {product.product_name} - {product.variant_name}
                        {product.current_stock !== null && ` | Stock: ${product.current_stock}`}
                        {product.cost_per_unit && ` | €${product.cost_per_unit}/u`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo Movimento *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="in">📥 Entrata (+)</option>
                    <option value="out">📤 Uscita (-)</option>
                    <option value="adjustment">⚖️ Rettifica (±)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantità *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="form-input"
                    step="0.01"
                    min="0"
                    required
                  />
                  <small className="form-help">
                    {selectedProduct && selectedProduct.current_stock !== null && (
                      <>Stock attuale: {selectedProduct.current_stock}</>
                    )}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Costo per Unità (€)</label>
                  <input
                    type="number"
                    name="cost_per_unit"
                    value={formData.cost_per_unit}
                    onChange={handleChange}
                    className="form-input"
                    step="0.01"
                    min="0"
                  />
                  {estimatedCost > 0 && (
                    <small className="form-help cost-estimate">
                      Costo totale: {formatCurrency(estimatedCost)}
                    </small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo Riferimento</label>
                  <select
                    name="reference_type"
                    value={formData.reference_type}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="manual">✋ Manuale</option>
                    <option value="order">🛒 Ordine Cliente</option>
                    <option value="supplier">📦 Fornitore</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ID Riferimento</label>
                  <input
                    type="text"
                    name="reference_id"
                    value={formData.reference_id}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Es. 123, ORD-456"
                  />
                  <small className="form-help">
                    ID ordine, fattura, o altro riferimento esterno
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Motivo</label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Es. Carico merce, Vendita, Scadenza, Inventario, Rettifica stock..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Note</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-textarea"
                  rows="3"
                  placeholder="Note dettagliate, condizioni prodotto, lotto, scadenza..."
                />
              </div>

              {selectedProduct && (
                <div className="product-preview">
                  <h4>📋 Riepilogo Prodotto</h4>
                  <div className="product-details">
                    <div className="detail-row">
                      <strong>Prodotto:</strong> {selectedProduct.product_name} - {selectedProduct.variant_name}
                    </div>
                    <div className="detail-row">
                      <strong>Stock attuale:</strong> 
                      <span className={selectedProduct.current_stock <= 0 ? 'low-stock' : ''}>
                        {selectedProduct.current_stock || 0} unità
                      </span>
                    </div>
                    {selectedProduct.cost_per_unit && (
                      <div className="detail-row">
                        <strong>Costo/Unità:</strong> {formatCurrency(selectedProduct.cost_per_unit)}
                      </div>
                    )}
                    {formData.quantity && (
                      <div className="detail-row">
                        <strong>Nuovo stock stimato:</strong>
                        <span className={getNewStockColor(selectedProduct.current_stock, formData.quantity, formData.type)}>
                          {calculateNewStock(selectedProduct.current_stock, formData.quantity, formData.type)} unità
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Creando...
                </>
              ) : (
                '💾 Crea Movimento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ ENHANCED: EditMovementModal - unchanged but with better error handling
function EditMovementModal({ movement, onClose, onSave }) {
  const [formData, setFormData] = useState({
    reason: movement.reason || '',
    notes: movement.notes || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log(`✏️ Updating movement ${movement.id}:`, formData);
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/stock-movements/${movement.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }

      const result = await response.json();
      console.log('✅ Movement updated:', result);
      
      onSave(result);
      
    } catch (err) {
      console.error('❌ Error updating movement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>✏️ Modifica Movimento #{movement.id}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
            
            <div className="movement-info">
              <h4>📋 Dettagli Movimento (Non Modificabili)</h4>
              <div className="movement-details">
                <div><strong>ID:</strong> #{movement.id}</div>
                <div><strong>Prodotto:</strong> {movement.product_name} - {movement.variant_name}</div>
                <div><strong>Tipo:</strong> {getTypeIcon(movement.type)} {getTypeLabel(movement.type)}</div>
                <div><strong>Quantità:</strong> {movement.quantity} unità</div>
                <div><strong>Data:</strong> {formatDate(movement.created_at)}</div>
                <div><strong>Utente:</strong> {movement.user_name || 'Sistema'}</div>
                {movement.total_cost > 0 && (
                  <div><strong>Valore:</strong> {formatCurrency(movement.total_cost)}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Motivo</label>
              <input
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="form-input"
                placeholder="Motivo del movimento..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Note</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-textarea"
                rows="4"
                placeholder="Note dettagliate, condizioni prodotto, osservazioni..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Salvando...
                </>
              ) : (
                '💾 Salva Modifiche'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper functions
function calculateNewStock(currentStock, quantity, type) {
  const current = parseFloat(currentStock) || 0;
  const qty = parseFloat(quantity) || 0;
  
  if (type === 'in') return current + qty;
  if (type === 'out') return current - qty;
  if (type === 'adjustment') return current + qty; // For adjustments, quantity can be negative
  
  return current;
}

function getNewStockColor(currentStock, quantity, type) {
  const newStock = calculateNewStock(currentStock, quantity, type);
  if (newStock <= 0) return 'text-danger';
  if (newStock <= 10) return 'text-warning';
  return 'text-success';
}

function formatCurrency(amount) {
  if (!amount) return '€0,00';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTypeIcon(type) {
  const icons = { 'in': '📥', 'out': '📤', 'adjustment': '⚖️' };
  return icons[type] || '❓';
}

function getTypeLabel(type) {
  const labels = { 'in': 'Entrata', 'out': 'Uscita', 'adjustment': 'Rettifica' };
  return labels[type] || type;
}