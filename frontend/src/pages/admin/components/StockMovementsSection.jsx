import { useState, useEffect } from "react";
import "./StockMovementsSection.css";

export default function StockMovementsSection() {
  const [movements, setMovements] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [filters, setFilters] = useState({
    type: 'all',
    reference_type: 'all',
    date_from: '',
    date_to: '',
    product_id: '',
    limit: 100
  });
  
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchMovements();
    fetchProducts();
    fetchStats();
  }, [filters]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`http://localhost:3000/api/stock-movements?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setMovements(data.movements || []);
      
    } catch (err) {
      console.error('❌ Error fetching movements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const response = await fetch(`http://localhost:3000/api/stock-movements/stats?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/stock-movements/products', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('❌ Error fetching products:', err);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      'in': '📥',
      'out': '📤',
      'adjustment': '⚖️'
    };
    return icons[type] || '📦';
  };

  const getTypeColor = (type) => {
    const colors = {
      'in': 'success',
      'out': 'warning',
      'adjustment': 'info'
    };
    return colors[type] || 'secondary';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'in': 'Entrata',
      'out': 'Uscita',
      'adjustment': 'Rettifica'
    };
    return labels[type] || type;
  };

  const getReferenceTypeLabel = (refType) => {
    const labels = {
      'order': 'Ordine',
      'manual': 'Manuale',
      'supplier': 'Fornitore'
    };
    return labels[refType] || refType;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  const formatQuantity = (quantity, type) => {
    const num = parseFloat(quantity);
    if (type === 'out') {
      return `-${Math.abs(num)}`;
    } else if (type === 'in') {
      return `+${Math.abs(num)}`;
    }
    return num > 0 ? `+${num}` : `${num}`;
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

  return (
    <div className="stock-movements-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>📈 Movimenti Magazzino</h2>
          <p className="section-subtitle">
            {movements.length} movimenti • {stats.unique_products || 0} prodotti coinvolti
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowAddModal(true)}
        >
          + Registra Movimento
        </button>
      </div>

      {/* Statistiche rapide */}
      <div className="movement-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">📥</span>
          <div>
            <div className="stat-number">{stats.entries || 0}</div>
            <div className="stat-label">Entrate</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">📤</span>
          <div>
            <div className="stat-number">{stats.exits || 0}</div>
            <div className="stat-label">Uscite</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">⚖️</span>
          <div>
            <div className="stat-number">{stats.adjustments || 0}</div>
            <div className="stat-label">Rettifiche</div>
          </div>
        </div>
        <div className="stat-card mini value">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">{formatCurrency(stats.total_value_in)}</div>
            <div className="stat-label">Valore Entrate</div>
          </div>
        </div>
        <div className="stat-card mini expense">
          <span className="stat-icon">💸</span>
          <div>
            <div className="stat-number">{formatCurrency(stats.total_value_out)}</div>
            <div className="stat-label">Valore Uscite</div>
          </div>
        </div>
        <div className="stat-card mini today">
          <span className="stat-icon">📅</span>
          <div>
            <div className="stat-number">{stats.today || 0}</div>
            <div className="stat-label">Oggi</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti i tipi</option>
          <option value="in">Entrate</option>
          <option value="out">Uscite</option>
          <option value="adjustment">Rettifiche</option>
        </select>

        <select
          value={filters.reference_type}
          onChange={(e) => setFilters(prev => ({ ...prev, reference_type: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutte le origine</option>
          <option value="manual">Manuale</option>
          <option value="order">Ordini</option>
          <option value="supplier">Fornitori</option>
        </select>

        <select
          value={filters.product_id}
          onChange={(e) => setFilters(prev => ({ ...prev, product_id: e.target.value }))}
          className="filter-select"
        >
          <option value="">Tutti i prodotti</option>
          {products.map(product => (
            <option key={product.product_id} value={product.product_id}>
              {product.product_name} ({product.category_name})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
          className="filter-input"
          placeholder="Da"
        />

        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
          className="filter-input"
          placeholder="A"
        />

        <button 
          className="btn secondary small"
          onClick={() => setFilters({
            type: 'all',
            reference_type: 'all',
            date_from: '',
            date_to: '',
            product_id: '',
            limit: 100
          })}
        >
          🔄 Reset
        </button>
      </div>

      {/* Errori */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Tabella movimenti */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Prodotto</th>
              <th>Quantità</th>
              <th>Costo</th>
              <th>Motivo</th>
              <th>Origine</th>
              <th>Data</th>
              <th>Utente</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(movement => (
              <tr key={movement.id} className={`movement-row ${movement.type}`}>
                <td>
                  <span className={`type-badge ${getTypeColor(movement.type)}`}>
                    {getTypeIcon(movement.type)} {getTypeLabel(movement.type)}
                  </span>
                </td>
                <td>
                  <div className="product-info">
                    <div className="product-name">{movement.product_name}</div>
                    <div className="variant-name">{movement.variant_name}</div>
                    <div className="category-name">{movement.category_name}</div>
                  </div>
                </td>
                <td>
                  <span className={`quantity ${movement.type === 'out' ? 'negative' : 'positive'}`}>
                    {formatQuantity(movement.quantity, movement.type)}
                  </span>
                </td>
                <td>
                  <div className="cost-info">
                    {movement.cost_per_unit && (
                      <div className="unit-cost">
                        {formatCurrency(movement.cost_per_unit)}/unità
                      </div>
                    )}
                    {movement.total_cost && (
                      <div className="total-cost">
                        {formatCurrency(movement.total_cost)}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <span className="reason" title={movement.reason}>
                    {movement.reason || 'N/A'}
                  </span>
                </td>
                <td>
                  <span className={`reference-badge ${movement.reference_type || 'manual'}`}>
                    {getReferenceTypeLabel(movement.reference_type)}
                    {movement.reference_id && (
                      <span className="reference-id">#{movement.reference_id}</span>
                    )}
                  </span>
                </td>
                <td>
                  <div className="date-info">
                    <div className="date">{formatDate(movement.created_at)}</div>
                  </div>
                </td>
                <td>
                  <span className="user-name">{movement.user_name || 'Sistema'}</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-small secondary"
                      onClick={() => {
                        // TODO: Mostra dettagli movimento
                        alert(`Dettagli movimento #${movement.id}`);
                      }}
                      title="Dettagli"
                    >
                      👁️
                    </button>
                    {movement.notes && (
                      <button 
                        className="btn-small info"
                        onClick={() => {
                          alert(movement.notes);
                        }}
                        title="Note"
                      >
                        📝
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {movements.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-icon">📈</span>
          <h3>Nessun movimento trovato</h3>
          <p>I movimenti di magazzino appariranno qui</p>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Registra Primo Movimento
          </button>
        </div>
      )}

      {/* Modal Add Movement */}
      {showAddModal && (
        <MovementModal
          products={products}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchMovements();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// Modal Component per registrare movimento
function MovementModal({ products, onClose, onSave }) {
  const [formData, setFormData] = useState({
    product_variant_id: '',
    type: 'in',
    quantity: '',
    reason: '',
    reference_type: 'manual',
    cost_per_unit: '',
    notes: '',
    auto_update_stock: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prodotti groupati per categoria
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category_name || 'Senza categoria';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        throw new Error(errorData.error || 'Errore nel salvataggio');
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <h3>📝 Registra Movimento Magazzino</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">❌ {error}</div>
            )}

            <div className="form-grid">
              <div className="form-row">
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

                <div className="form-group">
                  <label className="form-label">Origine</label>
                  <select
                    name="reference_type"
                    value={formData.reference_type}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="manual">Manuale</option>
                    <option value="order">Ordine</option>
                    <option value="supplier">Fornitore</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prodotto/Variante *</label>
                  <select
                    name="product_variant_id"
                    value={formData.product_variant_id}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">Seleziona prodotto</option>
                    {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                      <optgroup key={category} label={category}>
                        {categoryProducts.map(product => (
                          <option key={product.variant_id} value={product.variant_id}>
                            {product.product_name} - {product.variant_name} 
                            {product.current_stock !== null && ` (Stock: ${product.current_stock} ${product.unit})`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
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
                    required
                    step="0.01"
                    placeholder={formData.type === 'adjustment' ? 'Positiva o negativa' : 'Solo positiva'}
                  />
                  <small className="form-help">
                    {formData.type === 'in' && 'Quantità da aggiungere al magazzino'}
                    {formData.type === 'out' && 'Quantità da sottrarre dal magazzino'}
                    {formData.type === 'adjustment' && 'Rettifica: +/- per aggiustare il valore'}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Costo per unità (€)</label>
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
                  <label className="form-label">Motivo *</label>
                  <input
                    type="text"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="form-input"
                    required
                    placeholder="Es: Carico fornitore, Preparazione ordine, Correzione inventario..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Note aggiuntive</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-textarea"
                  rows="3"
                  placeholder="Note dettagliate sul movimento..."
                />
              </div>

              <div className="form-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="auto_update_stock"
                    checked={formData.auto_update_stock}
                    onChange={handleChange}
                  />
                  <span>Aggiorna automaticamente lo stock del prodotto</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Registrando...' : '📝 Registra Movimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}