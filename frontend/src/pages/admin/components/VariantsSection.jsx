import { useState, useEffect } from "react";
import "./VariantsSection.css";

export default function VariantsSection() {
  const [variants, setVariants] = useState([]);
  const [filteredVariants, setFilteredVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    product_id: 'all',
    active: 'all'
  });
  
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchVariants();
    fetchProducts();
    fetchStats();
  }, []);

  useEffect(() => {
    filterVariants();
  }, [variants, filters]);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.product_id !== 'all') params.append('product_id', filters.product_id);
      if (filters.active !== 'all') params.append('active', filters.active);
      
      const response = await fetch(`http://localhost:3000/api/variants?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setVariants(data.variants || []);
      
    } catch (err) {
      console.error('❌ Error fetching variants:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/variants/products', {
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

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.product_id !== 'all') params.append('product_id', filters.product_id);
      if (filters.active !== 'all') params.append('active', filters.active);
      
      const response = await fetch(`http://localhost:3000/api/variants/stats?${params}`, {
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

  const filterVariants = () => {
    let filtered = [...variants];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(variant => 
        variant.name.toLowerCase().includes(searchLower) ||
        variant.product_name.toLowerCase().includes(searchLower) ||
        (variant.sku && variant.sku.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.product_id !== 'all') {
      filtered = filtered.filter(variant => variant.product_id == filters.product_id);
    }
    
    if (filters.active !== 'all') {
      filtered = filtered.filter(variant => 
        filters.active === 'true' ? variant.active === 1 : variant.active === 0
      );
    }
    
    setFilteredVariants(filtered);
  };

  const handleDeleteVariant = async (id, name, hasDependencies = false) => {
    const message = hasDependencies 
      ? `Eliminare la variante "${name}"?\n\nATTENZIONE: Questa variante è utilizzata in ordini/stock. L'eliminazione sarà forzata.`
      : `Eliminare la variante "${name}"?`;
      
    if (!confirm(message)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/variants/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force: hasDependencies })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Dipendenze trovate, chiedi conferma per eliminazione forzata
          const forceDelete = confirm(
            `Impossibile eliminare "${name}" perché utilizzata.\n\n` +
            `Stock: ${errorData.dependencies.stock_records}\n` +
            `Movimenti: ${errorData.dependencies.movement_records}\n` +
            `Ordini: ${errorData.dependencies.order_records}\n\n` +
            `Forzare l'eliminazione?`
          );
          
          if (forceDelete) {
            return handleDeleteVariant(id, name, true);
          }
          return;
        }
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }
      
      await fetchVariants();
      await fetchStats();
      console.log(`✅ Deleted variant: ${id}`);
      
    } catch (err) {
      console.error('❌ Error deleting variant:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      const variant = variants.find(v => v.id === id);
      if (!variant) return;
      
      const response = await fetch(`http://localhost:3000/api/variants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: variant.name,
          price: variant.price,
          sku: variant.sku,
          sort_order: variant.sort_order,
          active: !currentActive
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }
      
      await fetchVariants();
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Error toggling variant status:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const formatCurrency = (amount) => {
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

  if (loading) {
    return (
      <div className="variants-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento varianti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="variants-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🔄 Gestione Varianti</h2>
          <p className="section-subtitle">
            {stats.total || 0} varianti totali • {stats.active || 0} attive • 
            {stats.unique_products || 0} prodotti
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              fetchVariants();
              fetchStats();
            }}
            title="Aggiorna varianti"
          >
            🔄 Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Nuova Variante
          </button>
        </div>
      </div>

      {/* Statistiche rapide */}
      <div className="variants-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{stats.active || 0}</div>
            <div className="stat-label">Attive</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">⏸️</span>
          <div>
            <div className="stat-number">{stats.inactive || 0}</div>
            <div className="stat-label">Disattive</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">📦</span>
          <div>
            <div className="stat-number">{stats.with_stock || 0}</div>
            <div className="stat-label">Con Stock</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">{formatCurrency(stats.avg_price || 0)}</div>
            <div className="stat-label">Prezzo Medio</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">📊</span>
          <div>
            <div className="stat-number">
              {stats.price_range ? `${formatCurrency(stats.price_range.min)} - ${formatCurrency(stats.price_range.max)}` : '-'}
            </div>
            <div className="stat-label">Range Prezzi</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per nome variante, prodotto, SKU..."
            className="search-input"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.product_id}
          onChange={(e) => setFilters(prev => ({ ...prev, product_id: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti i prodotti</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.variant_count} varianti)
            </option>
          ))}
        </select>

        <select
          value={filters.active}
          onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="true">✅ Solo attive</option>
          <option value="false">⏸️ Solo disattive</option>
        </select>

        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => setFilters({
              search: '',
              product_id: 'all',
              active: 'all'
            })}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Errori */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Tabella varianti */}
      {filteredVariants.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔄</span>
          <h3>Nessuna variante trovata</h3>
          <p>
            {variants.length === 0 
              ? "Inizia creando la prima variante per un prodotto"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
          <button 
            className="btn primary"
            onClick={() => setShowAddModal(true)}
          >
            + Prima Variante
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ordine</th>
                <th>Variante</th>
                <th>Prodotto</th>
                <th>Prezzo</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Stato</th>
                <th>Movimenti</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariants.map(variant => (
                <tr key={variant.id} className={`variant-row ${variant.active ? 'active' : 'inactive'}`}>
                  <td>
                    <span className="sort-order">{variant.sort_order}</span>
                  </td>
                  <td>
                    <div className="variant-info">
                      <div className="variant-name">{variant.name}</div>
                      <div className="variant-id">#{variant.id}</div>
                    </div>
                  </td>
                  <td>
                    <div className="product-info">
                      <div className="product-name">{variant.product_name}</div>
                      <div className="category-name">{variant.category_name}</div>
                      <div className="base-price">Base: {formatCurrency(variant.product_base_price)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="price-info">
                      <span className="variant-price">{formatCurrency(variant.price)}</span>
                      {variant.price !== variant.product_base_price && (
                        <span className={`price-diff ${variant.price > variant.product_base_price ? 'higher' : 'lower'}`}>
                          {variant.price > variant.product_base_price ? '+' : ''}
                          {formatCurrency(variant.price - variant.product_base_price)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="sku">{variant.sku || '-'}</span>
                  </td>
                  <td>
                    <div className="stock-info">
                      <span className={`stock-quantity ${variant.stock_quantity > 0 ? 'in-stock' : 'out-stock'}`}>
                        {variant.stock_quantity} {variant.stock_unit || 'pcs'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button 
                      className={`status-toggle ${variant.active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(variant.id, variant.active)}
                    >
                      <span className="status-dot"></span>
                      {variant.active ? 'Attiva' : 'Disattiva'}
                    </button>
                  </td>
                  <td>
                    <span className="movement-count">{variant.movement_count || 0}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-small secondary"
                        onClick={() => setEditingVariant(variant)}
                        title="Modifica variante"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-small danger"
                        onClick={() => handleDeleteVariant(variant.id, variant.name)}
                        title="Elimina variante"
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

      {/* Modal Nuova Variante */}
      {showAddModal && (
        <VariantModal
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchVariants();
            fetchStats();
          }}
          products={products}
        />
      )}

      {/* Modal Modifica Variante */}
      {editingVariant && (
        <VariantModal
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSave={() => {
            setEditingVariant(null);
            fetchVariants();
            fetchStats();
          }}
          products={products}
        />
      )}
    </div>
  );
}

// Modal per nuova/modifica variante
function VariantModal({ variant, onClose, onSave, products }) {
  const isEditing = Boolean(variant);
  
  const [formData, setFormData] = useState({
    product_id: variant?.product_id || '',
    name: variant?.name || '',
    price: variant?.price || '',
    sku: variant?.sku || '',
    sort_order: variant?.sort_order || 0,
    active: variant?.active !== undefined ? Boolean(variant.active) : true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (formData.product_id) {
      const product = products.find(p => p.id == formData.product_id);
      setSelectedProduct(product);
      if (!isEditing && product) {
        setFormData(prev => ({ ...prev, price: product.base_price }));
      }
    }
  }, [formData.product_id, products, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.name || !formData.price) {
      setError('Prodotto, nome e prezzo sono obbligatori');
      return;
    }

    if (parseFloat(formData.price) < 0) {
      setError('Il prezzo deve essere positivo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing 
        ? `http://localhost:3000/api/variants/${variant.id}`
        : 'http://localhost:3000/api/variants';
        
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          sort_order: parseInt(formData.sort_order) || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore nella ${isEditing ? 'modifica' : 'creazione'} variante`);
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

  const generateSKU = () => {
    if (selectedProduct && formData.name) {
      const productCode = selectedProduct.name.substring(0, 3).toUpperCase();
      const variantCode = formData.name.substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const sku = `${productCode}-${variantCode}-${randomNum}`;
      setFormData(prev => ({ ...prev, sku }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>{isEditing ? 'Modifica Variante' : 'Nuova Variante'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">❌ {error}</div>}
            
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prodotto *</label>
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleChange}
                    className="form-select"
                    required
                    disabled={isEditing}
                  >
                    <option value="">Seleziona prodotto</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} 
                        {product.category_name && ` (${product.category_name})`}
                        {` - ${formatCurrency(product.base_price)}`}
                        {` - ${product.variant_count} varianti`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nome Variante *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Es. Piccola, Media, Grande, Fredda, Calda..."
                    required
                  />
                  <small className="form-help">
                    Specificare taglia, temperatura o altra caratteristica distintiva
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prezzo (€) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="form-input"
                    step="0.01"
                    min="0"
                    required
                  />
                  {selectedProduct && (
                    <small className="form-help">
                      Prezzo base prodotto: {formatCurrency(selectedProduct.base_price)}
                      {formData.price && parseFloat(formData.price) !== parseFloat(selectedProduct.base_price) && (
                        <span className={parseFloat(formData.price) > parseFloat(selectedProduct.base_price) ? 'price-higher' : 'price-lower'}>
                          {` (${parseFloat(formData.price) > parseFloat(selectedProduct.base_price) ? '+' : ''}${formatCurrency(parseFloat(formData.price) - parseFloat(selectedProduct.base_price))})`}
                        </span>
                      )}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <div className="sku-input-group">
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Codice identificativo univoco"
                    />
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={generateSKU}
                      disabled={!selectedProduct || !formData.name}
                      title="Genera SKU automatico"
                    >
                      🎲
                    </button>
                  </div>
                  <small className="form-help">
                    Lasciare vuoto per generazione automatica o specificare codice personalizzato
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ordine di Visualizzazione</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={formData.sort_order}
                    onChange={handleChange}
                    className="form-input"
                    min="0"
                    placeholder="0"
                  />
                  <small className="form-help">
                    Numero per ordinamento (0 = primo, maggiore = dopo)
                  </small>
                </div>

                <div className="form-group">
                  <div className="form-checkbox-group">
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        name="active"
                        checked={formData.active}
                        onChange={handleChange}
                      />
                      <span className="checkmark"></span>
                      Variante attiva
                    </label>
                    <small className="form-help">
                      Le varianti disattive non sono visibili agli utenti ma conservano dati
                    </small>
                  </div>
                </div>
              </div>

              {selectedProduct && (
                <div className="product-preview">
                  <h4>📋 Informazioni Prodotto</h4>
                  <div className="product-details">
                    <div><strong>Nome:</strong> {selectedProduct.name}</div>
                    <div><strong>Categoria:</strong> {selectedProduct.category_name || 'Nessuna'}</div>
                    <div><strong>Prezzo base:</strong> {formatCurrency(selectedProduct.base_price)}</div>
                    <div><strong>Varianti esistenti:</strong> {selectedProduct.variant_count}</div>
                    <div><strong>Disponibile:</strong> {selectedProduct.is_available ? '✅ Sì' : '❌ No'}</div>
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
              {loading ? 'Salvando...' : (isEditing ? 'Aggiorna Variante' : 'Crea Variante')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Funzione helper per formattazione valuta (fuori dal componente per riutilizzo)
function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}