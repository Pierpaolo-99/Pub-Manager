import { useState, useEffect } from "react";
import "./IngredientsStockSection.css";

export default function IngredientsStockSection() {
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    location: 'all',
    supplier: 'all',
    low_stock: false,
    expiring_days: 30
  });
  
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    fetchStockData();
    fetchLocations();
    fetchSuppliers();
  }, [filters]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`http://localhost:3000/api/ingredient-stock?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setStock(data.stock || []);
      setStats(data.summary || {});
      
    } catch (err) {
      console.error('❌ Error fetching stock:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ingredient-stock/locations', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('❌ Error fetching locations:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ingredient-stock/suppliers', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error('❌ Error fetching suppliers:', err);
    }
  };

  const handleDeleteStock = async (id, ingredientName) => {
    if (!confirm(`Sei sicuro di voler eliminare lo stock di "${ingredientName}"?`)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/ingredient-stock/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione');
      }
      
      await fetchStockData();
      console.log(`✅ Deleted stock: ${ingredientName}`);
    } catch (err) {
      console.error('❌ Error deleting stock:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      'ok': '🟢',
      'low': '🟡',
      'critical': '🔴',
      'expired': '💀',
      'expiring': '⚠️',
      'out_of_stock': '❌'
    };
    return icons[status] || '⚪';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'ok': 'OK',
      'low': 'Basso',
      'critical': 'Critico',
      'expired': 'Scaduto',
      'expiring': 'In scadenza',
      'out_of_stock': 'Esaurito'
    };
    return labels[status] || status;
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
      <div className="ingredients-stock-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento stock ingredienti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ingredients-stock-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🏪 Stock Ingredienti</h2>
          <p className="section-subtitle">
            {stats.total} lotti in stock • {stats.critical} critici • Valore totale: {formatCurrency(stats.totalValue)}
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowAddModal(true)}
        >
          + Carico Merce
        </button>
      </div>

      {/* Statistiche rapide */}
      <div className="stock-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">{stats.ok || 0}</div>
            <div className="stat-label">OK</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">🟡</span>
          <div>
            <div className="stat-number">{stats.low || 0}</div>
            <div className="stat-label">Bassi</div>
          </div>
        </div>
        <div className="stat-card mini danger">
          <span className="stat-icon">🔴</span>
          <div>
            <div className="stat-number">{stats.critical || 0}</div>
            <div className="stat-label">Critici</div>
          </div>
        </div>
        <div className="stat-card mini expired">
          <span className="stat-icon">💀</span>
          <div>
            <div className="stat-number">{stats.expired || 0}</div>
            <div className="stat-label">Scaduti</div>
          </div>
        </div>
        <div className="stat-card mini expiring">
          <span className="stat-icon">⚠️</span>
          <div>
            <div className="stat-number">{stats.expiring || 0}</div>
            <div className="stat-label">In scadenza</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca ingredienti, lotto, fornitore..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.location}
          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutte le locazioni</option>
          {locations.map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>

        <select
          value={filters.supplier}
          onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti i fornitori</option>
          {suppliers.map(supplier => (
            <option key={supplier} value={supplier}>{supplier}</option>
          ))}
        </select>

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.low_stock}
            onChange={(e) => setFilters(prev => ({ ...prev, low_stock: e.target.checked }))}
          />
          Solo stock bassi
        </label>
      </div>

      {/* Errori */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Tabella stock */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Lotto</th>
              <th>Quantità</th>
              <th>Soglie</th>
              <th>Valore</th>
              <th>Fornitore</th>
              <th>Scadenza</th>
              <th>Locazione</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {stock.map(item => (
              <tr key={item.id} className={`stock-row ${item.stock_status}`}>
                <td>
                  <div className="ingredient-info">
                    <span className="ingredient-name">{item.ingredient_name}</span>
                    <span className="ingredient-category">{item.category}</span>
                  </div>
                </td>
                <td>{item.batch_code || 'N/A'}</td>
                <td>
                  <div className="quantity-info">
                    <span className="available">{item.available_quantity} {item.unit}</span>
                    {item.reserved_quantity > 0 && (
                      <span className="reserved">({item.reserved_quantity} riservati)</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="thresholds">
                    <span className="min">Min: {item.min_threshold}</span>
                    {item.max_threshold && (
                      <span className="max">Max: {item.max_threshold}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="value-info">
                    <span className="total-value">{formatCurrency(item.total_value)}</span>
                    <span className="unit-cost">{formatCurrency(item.cost_per_unit)}/{item.unit}</span>
                  </div>
                </td>
                <td>{item.supplier || 'N/A'}</td>
                <td>
                  <div className="expiry-info">
                    <span className={`expiry-date ${item.days_to_expiry <= 7 ? 'urgent' : ''}`}>
                      {formatDate(item.expiry_date)}
                    </span>
                    {item.days_to_expiry !== null && (
                      <span className="days-left">
                        {item.days_to_expiry > 0 ? `${item.days_to_expiry} giorni` : 'Scaduto'}
                      </span>
                    )}
                  </div>
                </td>
                <td>{item.location || 'N/A'}</td>
                <td>
                  <span className={`status-badge ${item.stock_status}`}>
                    {getStatusIcon(item.stock_status)} {getStatusLabel(item.stock_status)}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-small primary"
                      onClick={() => setEditingStock(item)}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-small secondary"
                      onClick={() => {/* TODO: Mostra dettagli */}}
                      title="Dettagli"
                    >
                      📋
                    </button>
                    <button 
                      className="btn-small danger"
                      onClick={() => handleDeleteStock(item.id, item.ingredient_name)}
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
      {stock.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <h3>Nessun stock trovato</h3>
          <p>Inizia registrando il tuo primo carico di merce</p>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Primo Carico Merce
          </button>
        </div>
      )}

      {/* Modal Add/Edit */}
      {(showAddModal || editingStock) && (
        <StockModal
          stock={editingStock}
          onClose={() => {
            setShowAddModal(false);
            setEditingStock(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingStock(null);
            fetchStockData();
          }}
        />
      )}
    </div>
  );
}

// Modal Component per carico/modifica stock
function StockModal({ stock, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ingredient_id: '',
    batch_code: '',
    quantity: '',
    unit: 'kg',
    cost_per_unit: '',
    min_threshold: '',
    max_threshold: '',
    supplier: '',
    purchase_date: '',
    expiry_date: '',
    location: '',
    notes: '',
    ...stock
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ingredients?active=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients || []);
      }
    } catch (err) {
      console.error('Error fetching ingredients:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = stock 
        ? `http://localhost:3000/api/ingredient-stock/${stock.id}`
        : 'http://localhost:3000/api/ingredient-stock';
      
      const method = stock ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>{stock ? 'Modifica Stock' : 'Nuovo Carico Merce'}</h3>
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
                  <label className="form-label">Ingrediente *</label>
                  <select
                    name="ingredient_id"
                    value={formData.ingredient_id}
                    onChange={handleChange}
                    className="form-select"
                    required
                    disabled={!!stock}
                  >
                    <option value="">Seleziona ingrediente</option>
                    {ingredients.map(ingredient => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Codice Lotto</label>
                  <input
                    type="text"
                    name="batch_code"
                    value={formData.batch_code}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="LOT2024001"
                  />
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
                    step="0.001"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unità *</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="g">Grammi (g)</option>
                    <option value="kg">Kilogrammi (kg)</option>
                    <option value="ml">Millilitri (ml)</option>
                    <option value="l">Litri (l)</option>
                    <option value="pz">Pezzi (pz)</option>
                    <option value="conf">Confezioni (conf)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Costo per unità (€)</label>
                  <input
                    type="number"
                    name="cost_per_unit"
                    value={formData.cost_per_unit}
                    onChange={handleChange}
                    className="form-input"
                    step="0.0001"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Soglia Minima</label>
                  <input
                    type="number"
                    name="min_threshold"
                    value={formData.min_threshold}
                    onChange={handleChange}
                    className="form-input"
                    step="0.001"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Soglia Massima</label>
                  <input
                    type="number"
                    name="max_threshold"
                    value={formData.max_threshold}
                    onChange={handleChange}
                    className="form-input"
                    step="0.001"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fornitore</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Locazione</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Frigo A, Scaffale 1, etc."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data Acquisto</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data Scadenza</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Note</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-textarea"
                  rows="3"
                  placeholder="Note aggiuntive sul carico..."
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Salvando...' : stock ? 'Aggiorna' : 'Registra Carico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}