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
  
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    reference_type: 'all',
    date_from: '',
    date_to: '',
    product_id: 'all'
  });
  
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchMovements();
    fetchProducts();
    fetchStats();
  }, []);

  useEffect(() => {
    filterMovements();
  }, [movements, filters]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      console.log('🔄 Fetching movements with params:', params.toString());
      
      const response = await fetch(`http://localhost:3000/api/stock-movements?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Movements loaded:', data);
      
      setMovements(data.movements || []);
      
    } catch (err) {
      console.error('❌ Error fetching movements:', err);
      setError(err.message);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching products for movements...');
      const response = await fetch('http://localhost:3000/api/stock-movements/products', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Products loaded:', data);
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('❌ Error fetching products:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && key !== 'search') {
          params.append(key, value);
        }
      });
      
      console.log('📊 Fetching stats...');
      const response = await fetch(`http://localhost:3000/api/stock-movements/stats?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Stats loaded:', data);
        setStats(data || {});
      }
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      setStats({});
    }
  };

  const filterMovements = () => {
    let filtered = [...movements];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(movement =>
        movement.product_name?.toLowerCase().includes(searchLower) ||
        movement.variant_name?.toLowerCase().includes(searchLower) ||
        movement.reason?.toLowerCase().includes(searchLower) ||
        movement.notes?.toLowerCase().includes(searchLower) ||
        movement.user_name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredMovements(filtered);
  };

  const handleDeleteMovement = async (id, productName) => {
    if (!confirm(`Eliminare il movimento per "${productName}"?\n\nATTENZIONE: Lo stock NON verrà automaticamente revertito.`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/api/stock-movements/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione');
      }
      
      await fetchMovements();
      await fetchStats();
      console.log(`✅ Deleted movement: ${id}`);
      
    } catch (err) {
      console.error('❌ Error deleting movement:', err);
      alert(`Errore: ${err.message}`);
    }
  };

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

  if (loading) {
    return (
      <div className="stock-movements-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento movimenti...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-movements-section">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Errore nel caricamento</h3>
          <p>{error}</p>
          <button className="btn primary" onClick={fetchMovements}>
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-movements-section">
      {/* Header con statistiche */}
      <div className="section-header">
        <div className="header-left">
          <h2>📈 Movimenti Stock</h2>
          <p className="section-subtitle">
            {stats.total_movements || 0} movimenti totali • 
            {stats.inbound_movements || 0} entrate • 
            {stats.outbound_movements || 0} uscite
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              fetchMovements();
              fetchStats();
            }}
            title="Aggiorna movimenti"
          >
            🔄 Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Nuovo Movimento
          </button>
        </div>
      </div>

      {/* Statistiche rapide */}
      <div className="movements-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">⬆️</span>
          <div>
            <div className="stat-number">{stats.inbound_movements || 0}</div>
            <div className="stat-label">Entrate</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">⬇️</span>
          <div>
            <div className="stat-number">{stats.outbound_movements || 0}</div>
            <div className="stat-label">Uscite</div>
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
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per prodotto, motivo, note..."
            className="search-input"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
        >
          <option value="all">Tutti i tipi</option>
          <option value="in">⬆️ Entrate</option>
          <option value="out">⬇️ Uscite</option>
          <option value="adjustment">⚖️ Rettifiche</option>
        </select>

        <select 
          className="filter-select"
          value={filters.reference_type}
          onChange={(e) => setFilters(prev => ({ ...prev, reference_type: e.target.value }))}
        >
          <option value="all">Tutti i riferimenti</option>
          <option value="order">📋 Ordini</option>
          <option value="manual">✋ Manuali</option>
          <option value="supplier">🚚 Fornitori</option>
        </select>

        <select
          value={filters.product_id}
          onChange={(e) => setFilters(prev => ({ ...prev, product_id: e.target.value }))}
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
          onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
          className="filter-date"
          title="Data da"
        />

        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
          className="filter-date"
          title="Data a"
        />

        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => setFilters({
              search: '',
              type: 'all',
              reference_type: 'all',
              date_from: '',
              date_to: '',
              product_id: 'all'
            })}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Tabella movimenti */}
      {filteredMovements.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📈</span>
          <h3>Nessun movimento trovato</h3>
          <p>
            {movements.length === 0 
              ? "Non ci sono movimenti registrati"
              : "Nessun movimento corrisponde ai filtri selezionati"
            }
          </p>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Primo Movimento
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
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
                    <div className="movement-date">
                      <span className="date">{formatDate(movement.created_at)}</span>
                      <span className="time-ago">{getTimeAgo(movement.created_at)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="product-info">
                      <div className="product-name">{movement.product_name}</div>
                      <div className="variant-name">{movement.variant_name}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`movement-type ${movement.type}`}>
                      {getTypeIcon(movement.type)} {getTypeLabel(movement.type)}
                    </span>
                  </td>
                  <td>
                    <span className={`movement-quantity ${movement.type}`}>
                      {movement.type === 'out' ? '-' : '+'}
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
                    <span className={`reference-type ${movement.reference_type}`}>
                      {getReferenceIcon(movement.reference_type)} {getReferenceLabel(movement.reference_type)}
                    </span>
                  </td>
                  <td>
                    <div className="movement-reason">
                      {movement.reason && <div className="reason">{movement.reason}</div>}
                      {movement.notes && <div className="notes">{movement.notes}</div>}
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
                        title="Modifica note"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-small danger"
                        onClick={() => handleDeleteMovement(movement.id, `${movement.product_name} - ${movement.variant_name}`)}
                        title="Elimina movimento"
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
      )}

      {/* Modal nuovo movimento */}
      {showAddModal && (
        <MovementModal
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchMovements();
            fetchStats();
          }}
          products={products}
        />
      )}

      {/* Modal modifica movimento */}
      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          onClose={() => setEditingMovement(null)}
          onSave={() => {
            setEditingMovement(null);
            fetchMovements();
          }}
        />
      )}
    </div>
  );
}

// Modal per nuovo movimento
function MovementModal({ onClose, onSave, products }) {
  const [formData, setFormData] = useState({
    product_variant_id: '',
    type: 'in',
    quantity: '',
    reason: '',
    reference_type: 'manual',
    reference_id: '',
    cost_per_unit: '',
    notes: '',
    auto_update_stock: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product_variant_id || !formData.quantity) {
      setError('Prodotto e quantità sono obbligatori');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione movimento');
      }

      onSave();
    } catch (err) {
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
          <h3>Nuovo Movimento Stock</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">❌ {error}</div>}
            
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
                        {product.category_name && ` (${product.category_name})`}
                        {product.current_stock !== null && ` | Stock: ${product.current_stock}`}
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
                    <option value="in">📥 Entrata</option>
                    <option value="out">📤 Uscita</option>
                    <option value="adjustment">⚖️ Rettifica</option>
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
                    required
                  />
                  <small className="form-help">
                    {formData.type === 'adjustment' && "Per le rettifiche: valore positivo = aumento, negativo = diminuzione"}
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
                    <option value="order">🛒 Ordine</option>
                    <option value="supplier">📦 Fornitore</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ID Riferimento</label>
                  <input
                    type="number"
                    name="reference_id"
                    value={formData.reference_id}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Es. 123"
                  />
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
                  placeholder="Es. Carico merce, Vendita, Scadenza, Inventario..."
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
                  placeholder="Note aggiuntive..."
                />
              </div>

              <div className="form-checkbox-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    name="auto_update_stock"
                    checked={formData.auto_update_stock}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  Aggiorna automaticamente lo stock
                </label>
                <small className="form-help">
                  Disabilita solo se gestisci lo stock manualmente o in caso di test
                </small>
              </div>

              {selectedProduct && (
                <div className="product-preview">
                  <h4>📋 Informazioni Prodotto</h4>
                  <div className="product-details">
                    <div><strong>Stock attuale:</strong> {selectedProduct.current_stock || 0} {selectedProduct.unit || 'pcs'}</div>
                    <div><strong>Costo/Unità:</strong> {selectedProduct.cost_per_unit ? formatCurrency(selectedProduct.cost_per_unit) : 'Non definito'}</div>
                    <div><strong>Categoria:</strong> {selectedProduct.category_name || 'Nessuna'}</div>
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
              {loading ? 'Salvando...' : 'Crea Movimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal per modifica movimento (solo note e motivo)
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
      const response = await fetch(`http://localhost:3000/api/stock-movements/${movement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }

      onSave();
    } catch (err) {
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
          <h3>Modifica Movimento #{movement.id}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">❌ {error}</div>}
            
            <div className="movement-info">
              <h4>📋 Dettagli Movimento</h4>
              <div className="movement-details">
                <div><strong>Prodotto:</strong> {movement.product_name} - {movement.variant_name}</div>
                <div><strong>Tipo:</strong> {movement.type_display}</div>
                <div><strong>Quantità:</strong> {movement.quantity}</div>
                <div><strong>Data:</strong> {formatDate(movement.created_at)}</div>
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
                rows="3"
                placeholder="Note aggiuntive..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Aggiorna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}