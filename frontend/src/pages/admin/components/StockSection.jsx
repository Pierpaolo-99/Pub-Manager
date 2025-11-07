import { useState, useEffect } from "react";
import "./StockSection.css";

export default function StockSection() {
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    supplier: 'all',
    low_stock: false
  });
  
  const [suppliers, setSuppliers] = useState([]);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    fetchStock();
    fetchSuppliers();
    fetchVariants();
  }, [filters]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`http://localhost:3000/api/stock?${params}`, {
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

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/stock/suppliers', {
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

  const fetchVariants = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/stock/variants', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setVariants(data.variants || []);
      }
    } catch (err) {
      console.error('❌ Error fetching variants:', err);
    }
  };

  const handleDeleteStock = async (id, productName) => {
    if (!confirm(`Sei sicuro di voler eliminare lo stock di "${productName}"?`)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/stock/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione');
      }
      
      await fetchStock();
      console.log(`✅ Deleted stock: ${productName}`);
    } catch (err) {
      console.error('❌ Error deleting stock:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const handleQuickUpdate = async (id, operation, value) => {
    try {
      const response = await fetch(`http://localhost:3000/api/stock/${id}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          quantity: value, 
          operation: operation 
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento quantità');
      }
      
      await fetchStock();
    } catch (err) {
      console.error('❌ Error updating quantity:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      'ok': '🟢',
      'low': '🟡',
      'critical': '🔴',
      'out_of_stock': '❌',
      'expired': '💀',
      'expiring': '⚠️',
      'overstocked': '📈'
    };
    return icons[status] || '⚪';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'ok': 'OK',
      'low': 'Basso',
      'critical': 'Critico',
      'out_of_stock': 'Esaurito',
      'expired': 'Scaduto',
      'expiring': 'In scadenza',
      'overstocked': 'Eccesso'
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
      <div className="stock-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>📦 Gestione Stock</h2>
          <p className="section-subtitle">
            {stats.total || 0} prodotti in stock • {stats.critical || 0} critici • Valore: {formatCurrency(stats.totalValue)}
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowAddModal(true)}
        >
          + Aggiungi Stock
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
        <div className="stat-card mini error">
          <span className="stat-icon">❌</span>
          <div>
            <div className="stat-number">{stats.outOfStock || 0}</div>
            <div className="stat-label">Esauriti</div>
          </div>
        </div>
        <div className="stat-card mini expired">
          <span className="stat-icon">💀</span>
          <div>
            <div className="stat-number">{stats.expired || 0}</div>
            <div className="stat-label">Scaduti</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">📈</span>
          <div>
            <div className="stat-number">{stats.overstocked || 0}</div>
            <div className="stat-label">Eccessi</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca prodotti, varianti, fornitori..."
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
          <option value="ok">OK</option>
          <option value="low">Bassi</option>
          <option value="critical">Critici</option>
          <option value="out_of_stock">Esauriti</option>
          <option value="expiring">In scadenza</option>
          <option value="expired">Scaduti</option>
          <option value="overstocked">Eccessi</option>
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
              <th>Prodotto</th>
              <th>Quantità</th>
              <th>Soglie</th>
              <th>Costo/Valore</th>
              <th>Fornitore</th>
              <th>Scadenza</th>
              <th>Ultimo Carico</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {stock.map(item => (
              <tr key={item.id} className={`stock-row ${item.stock_status}`}>
                <td>
                  <div className="product-info">
                    <div className="product-main">
                      <span className="product-name">{item.product_name}</span>
                      <span className="variant-name">{item.variant_name}</span>
                    </div>
                    <span className="category">{item.category_name || 'Senza categoria'}</span>
                  </div>
                </td>
                <td>
                  <div className="quantity-controls">
                    <div className="quantity-display">
                      <span className="current-qty">{item.quantity} {item.unit}</span>
                    </div>
                    <div className="quick-actions">
                      <button 
                        className="qty-btn subtract"
                        onClick={() => {
                          const qty = prompt('Quantità da sottrarre:', '1');
                          if (qty && !isNaN(qty) && qty > 0) {
                            handleQuickUpdate(item.id, 'subtract', parseFloat(qty));
                          }
                        }}
                        title="Sottrai"
                      >
                        ➖
                      </button>
                      <button 
                        className="qty-btn add"
                        onClick={() => {
                          const qty = prompt('Quantità da aggiungere:', '1');
                          if (qty && !isNaN(qty) && qty > 0) {
                            handleQuickUpdate(item.id, 'add', parseFloat(qty));
                          }
                        }}
                        title="Aggiungi"
                      >
                        ➕
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="thresholds">
                    <div className="threshold-item min">
                      <span className="threshold-label">Min:</span>
                      <span className="threshold-value">{item.min_threshold}</span>
                    </div>
                    {item.max_threshold && (
                      <div className="threshold-item max">
                        <span className="threshold-label">Max:</span>
                        <span className="threshold-value">{item.max_threshold}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="cost-info">
                    <div className="unit-cost">{formatCurrency(item.cost_per_unit)}/{item.unit}</div>
                    <div className="total-value">{formatCurrency(item.total_value)}</div>
                  </div>
                </td>
                <td>
                  <span className="supplier">{item.supplier || 'N/A'}</span>
                </td>
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
                <td>
                  <span className="restock-date">{formatDate(item.last_restock_date)}</span>
                </td>
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
                      onClick={() => {/* TODO: Mostra storico movimenti */}}
                      title="Storico"
                    >
                      📋
                    </button>
                    <button 
                      className="btn-small danger"
                      onClick={() => handleDeleteStock(item.id, `${item.product_name} - ${item.variant_name}`)}
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
          <p>Inizia aggiungendo i tuoi primi prodotti in stock</p>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Aggiungi Primo Stock
          </button>
        </div>
      )}

      {/* Modal Add/Edit */}
      {(showAddModal || editingStock) && (
        <StockModal
          stock={editingStock}
          variants={variants}
          onClose={() => {
            setShowAddModal(false);
            setEditingStock(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingStock(null);
            fetchStock();
          }}
        />
      )}
    </div>
  );
}

// Modal Component per aggiungere/modificare stock
function StockModal({ stock, variants, onClose, onSave }) {
  const [formData, setFormData] = useState({
    product_variant_id: '',
    quantity: '',
    unit: 'pcs',
    min_threshold: '',
    max_threshold: '',
    cost_per_unit: '',
    supplier: '',
    expiry_date: '',
    notes: '',
    ...stock
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = stock 
        ? `http://localhost:3000/api/stock/${stock.id}`
        : 'http://localhost:3000/api/stock';
      
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
          <h3>{stock ? 'Modifica Stock' : 'Nuovo Stock'}</h3>
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
                  <label className="form-label">Prodotto/Variante *</label>
                  <select
                    name="product_variant_id"
                    value={formData.product_variant_id}
                    onChange={handleChange}
                    className="form-select"
                    required
                    disabled={!!stock}
                  >
                    <option value="">Seleziona prodotto</option>
                    {variants.map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.product_name} - {variant.variant_name} ({variant.category_name})
                      </option>
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
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unità</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="pcs">Pezzi (pcs)</option>
                    <option value="kg">Kilogrammi (kg)</option>
                    <option value="l">Litri (l)</option>
                    <option value="box">Scatole (box)</option>
                    <option value="pack">Confezioni (pack)</option>
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
                    step="0.01"
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
                    step="0.01"
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
                    step="0.01"
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
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Salvando...' : stock ? 'Aggiorna' : 'Crea Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}