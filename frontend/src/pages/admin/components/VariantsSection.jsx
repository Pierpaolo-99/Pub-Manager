import { useState, useEffect, useCallback } from "react";
import "./VariantsSection.css";

export default function VariantsSection() {
  const [variants, setVariants] = useState([]);
  const [filteredVariants, setFilteredVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [viewingVariant, setViewingVariant] = useState(null);
  
  const [stats, setStats] = useState({});
  
  const [filters, setFilters] = useState({
    search: '',
    product_id: 'all',
    active: 'all'
  });
  
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    limit: 100,
    offset: 0,
    total: 0
  });

  useEffect(() => {
    fetchVariants();
    fetchProducts();
    fetchStats();
  }, []);

  // ✅ ENHANCED: Auto-refresh quando cambiano i filtri con debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterVariants();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [variants, filters]);

  // ✅ ENHANCED: Fetch variants with proper error handling
  const fetchVariants = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading variants...');
      
      const params = new URLSearchParams();
      if (filters.product_id !== 'all') params.append('product_id', filters.product_id);
      if (filters.active !== 'all') params.append('active', filters.active);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', pagination.limit);
      params.append('offset', pagination.offset);
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch(`/api/variants?${params}`, {
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
      console.log('✅ Variants loaded:', data.variants?.length || 0);
      
      // ✅ ENHANCED: Use full response structure
      if (data.success) {
        setVariants(data.variants || []);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total
          }));
        }
      } else {
        throw new Error('Errore nel caricamento varianti');
      }
      
    } catch (err) {
      console.error('❌ Error fetching variants:', err);
      setError(err.message);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      console.log('📦 Loading products for variants...');
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch('/api/variants/products', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        console.log('✅ Products loaded for variants:', data.products?.length || 0);
      }
    } catch (err) {
      console.error('❌ Error fetching products:', err);
    }
  };

  // ✅ ENHANCED: Fetch stats from backend
  const fetchStats = async () => {
    try {
      console.log('📊 Loading variant statistics...');
      
      const params = new URLSearchParams();
      if (filters.product_id !== 'all') params.append('product_id', filters.product_id);
      if (filters.active !== 'all') params.append('active', filters.active);
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch(`/api/variants/stats?${params}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data || {});
        console.log('✅ Variant stats loaded:', data);
      }
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      // Keep existing stats on error
    }
  };

  // ✅ NEW: Load variant details
  const loadVariantDetails = async (variantId) => {
    try {
      console.log(`👀 Loading details for variant ${variantId}...`);
      
      const response = await fetch(`/api/variants/${variantId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setViewingVariant(data.variant);
        console.log('✅ Variant details loaded:', data.variant);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel caricamento dettagli');
      }
    } catch (error) {
      console.error('❌ Error loading variant details:', error);
      setError(`Errore dettagli variante: ${error.message}`);
    }
  };

  // ✅ ENHANCED: Filter variants locally with debouncing
  const filterVariants = useCallback(() => {
    let filtered = [...variants];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(variant => 
        variant.name?.toLowerCase().includes(searchLower) ||
        variant.product_name?.toLowerCase().includes(searchLower) ||
        variant.sku?.toLowerCase().includes(searchLower) ||
        variant.category_name?.toLowerCase().includes(searchLower)
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
  }, [variants, filters]);

  // ✅ ENHANCED: Filter change handler
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value 
    }));
    
    // Reset error when changing filters
    if (error) {
      setError(null);
    }
  }, [error]);

  // ✅ ENHANCED: Delete variant with better dependency handling
  const handleDeleteVariant = async (id, name, hasDependencies = false) => {
    const message = hasDependencies 
      ? `Eliminare la variante "${name}"?\n\nATTENZIONE: Questa variante è utilizzata in ordini/stock. L'eliminazione sarà forzata.`
      : `Sei sicuro di voler eliminare la variante "${name}"?

⚠️ ATTENZIONE:
- Questa operazione è irreversibile
- I dati associati potrebbero essere persi

Continuare?`;
      
    if (!window.confirm(message)) return;
    
    try {
      setError(null);
      console.log(`🗑️ Deleting variant ${id}...`);
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch(`/api/variants/${id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ force: hasDependencies })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Dipendenze trovate, chiedi conferma per eliminazione forzata
          const forceDelete = window.confirm(
            `Impossibile eliminare "${name}" perché utilizzata.\n\n` +
            `Stock: ${errorData.dependencies?.stock_records || 0}\n` +
            `Movimenti: ${errorData.dependencies?.movement_records || 0}\n` +
            `Ordini: ${errorData.dependencies?.order_records || 0}\n\n` +
            `Suggerimento: ${errorData.suggestion || 'Disattiva invece di eliminare'}\n\n` +
            `Forzare comunque l'eliminazione?`
          );
          
          if (forceDelete) {
            return handleDeleteVariant(id, name, true);
          }
          return;
        }
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }

      const result = await response.json();
      console.log('✅ Variant deleted:', result);
      
      setVariants(variants.filter(variant => variant.id !== id));
      setSuccessMessage(`Variante "${name}" eliminata con successo ${result.forced ? '(forzata)' : ''}`);
      
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Error deleting variant:', err);
      setError(`Errore eliminazione: ${err.message}`);
    }
  };

  // ✅ ENHANCED: Toggle variant status
  const handleToggleActive = async (id, currentActive) => {
    try {
      setError(null);
      const variant = variants.find(v => v.id === id);
      if (!variant) return;
      
      console.log(`🔄 Toggling variant ${id} status to ${!currentActive}...`);
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch(`/api/variants/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
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
      
      const result = await response.json();
      console.log('✅ Variant status updated:', result);
      
      setVariants(variants.map(v => 
        v.id === id ? { ...v, active: !currentActive ? 1 : 0 } : v
      ));
      
      setSuccessMessage(
        `Variante ${!currentActive ? 'attivata' : 'disattivata'} con successo`
      );
      
      await fetchStats();
      
    } catch (err) {
      console.error('❌ Error toggling variant status:', err);
      setError(`Errore cambio stato: ${err.message}`);
    }
  };

  // ✅ NEW: Update variant order (drag & drop support)
  const handleUpdateVariantOrder = async (updatedVariants) => {
    try {
      console.log('🔄 Updating variant order...');
      
      const orderData = updatedVariants.map((variant, index) => ({
        id: variant.id,
        sort_order: index
      }));

      const response = await fetch('/api/variants/order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ variants: orderData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento ordine');
      }

      const result = await response.json();
      console.log('✅ Variant order updated:', result);
      
      setSuccessMessage('Ordinamento varianti aggiornato con successo');
      await fetchVariants();

    } catch (error) {
      console.error('❌ Error updating variant order:', error);
      setError(`Errore ordinamento: ${error.message}`);
    }
  };

  // ✅ ENHANCED: Auto-clear messages
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

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriceDifferenceColor = (variantPrice, basePrice) => {
    if (variantPrice > basePrice) return 'higher';
    if (variantPrice < basePrice) return 'lower';
    return 'same';
  };

  const getStockStatusClass = (quantity) => {
    if (quantity > 10) return 'in-stock';
    if (quantity > 0) return 'low-stock';
    return 'out-stock';
  };

  if (loading && variants.length === 0) {
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

      {/* Enhanced Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🔄 Gestione Varianti</h2>
          <p className="section-subtitle">
            {stats.total || 0} varianti totali • {stats.active || 0} attive • 
            {stats.unique_products || 0} prodotti • {stats.variants_with_sku || 0} con SKU
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              fetchVariants();
              fetchProducts();
              fetchStats();
            }}
            disabled={loading}
            title="Aggiorna varianti"
          >
            {loading ? '⏳' : '🔄'} Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Nuova Variante
          </button>
        </div>
      </div>

      {/* ✅ ENHANCED: Statistiche with backend data */}
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
        <div className="stat-card mini primary">
          <span className="stat-icon">📊</span>
          <div>
            <div className="stat-number">
              {stats.price_range && stats.price_range.max > 0 ? 
                `${formatCurrency(stats.price_range.min)} - ${formatCurrency(stats.price_range.max)}` : 
                '-'}
            </div>
            <div className="stat-label">Range Prezzi</div>
          </div>
        </div>
        <div className="stat-card mini tertiary">
          <span className="stat-icon">🏷️</span>
          <div>
            <div className="stat-number">{stats.variants_with_sku || 0}</div>
            <div className="stat-label">Con SKU</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per nome variante, prodotto, SKU, categoria..."
            className="search-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.product_id}
          onChange={(e) => handleFilterChange('product_id', e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti i prodotti</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.variant_count} varianti)
              {product.category_name && ` - ${product.category_name}`}
            </option>
          ))}
        </select>

        <select
          value={filters.active}
          onChange={(e) => handleFilterChange('active', e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="true">✅ Solo attive</option>
          <option value="false">⏸️ Solo disattive</option>
        </select>

        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setFilters({
                search: '',
                product_id: 'all',
                active: 'all'
              });
            }}
            title="Pulisci tutti i filtri"
          >
            🧹 Pulisci
          </button>
        )}
      </div>

      {/* Enhanced Variants Table */}
      {filteredVariants.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔄</span>
          <h3>Nessuna variante trovata</h3>
          <p>
            {loading 
              ? "Caricamento in corso..." 
              : variants.length === 0 
                ? "Inizia creando la prima variante per un prodotto"
                : "Nessuna variante corrisponde ai filtri selezionati"
            }
          </p>
          <div className="empty-actions">
            <button 
              className="btn primary"
              onClick={() => setShowAddModal(true)}
            >
              + Prima Variante
            </button>
            {Object.values(filters).some(v => v && v !== 'all') && (
              <button 
                className="btn secondary" 
                onClick={() => {
                  setFilters({
                    search: '',
                    product_id: 'all',
                    active: 'all'
                  });
                }}
              >
                🔄 Reset Filtri
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
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
                  <th>Creata</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredVariants.map(variant => (
                  <tr key={variant.id} className={`variant-row ${variant.active ? 'active' : 'inactive'}`}>
                    <td>
                      <span className="sort-order">#{variant.sort_order}</span>
                    </td>
                    <td>
                      <div className="variant-info">
                        <div className="variant-name">{variant.name}</div>
                        <div className="variant-id">ID: {variant.id}</div>
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
                          <span className={`price-diff ${getPriceDifferenceColor(variant.price, variant.product_base_price)}`}>
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
                        <span className={`stock-quantity ${getStockStatusClass(variant.stock_quantity)}`}>
                          {variant.stock_quantity} {variant.stock_unit || 'pcs'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className={`status-toggle ${variant.active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(variant.id, variant.active)}
                        title={`Clicca per ${variant.active ? 'disattivare' : 'attivare'}`}
                      >
                        <span className="status-dot"></span>
                        {variant.active ? 'Attiva' : 'Disattiva'}
                      </button>
                    </td>
                    <td>
                      <span className="movement-count">
                        {variant.movement_count || 0}
                      </span>
                    </td>
                    <td className="created-date">
                      {formatDate(variant.created_at)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-small primary"
                          onClick={() => setEditingVariant(variant)}
                          title="Modifica variante"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-small secondary"
                          onClick={() => loadVariantDetails(variant.id)}
                          title="Visualizza dettagli"
                        >
                          👁️
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

          {/* Enhanced Table Footer */}
          <div className="table-footer">
            <div className="table-summary">
              <span>
                Visualizzate: <strong>{filteredVariants.length}</strong> varianti • 
                Attive: <strong>{filteredVariants.filter(v => v.active).length}</strong> • 
                Con Stock: <strong>{filteredVariants.filter(v => parseFloat(v.stock_quantity || 0) > 0).length}</strong> • 
                Prodotti: <strong>{new Set(filteredVariants.map(v => v.product_id)).size}</strong>
              </span>
            </div>
          </div>
        </>
      )}

      {/* ✅ ENHANCED: Modal Add/Edit allineato con backend */}
      {(showAddModal || editingVariant) && (
        <VariantModal
          variant={editingVariant}
          onClose={() => {
            setShowAddModal(false);
            setEditingVariant(null);
          }}
          onSave={async (savedVariant) => {
            setShowAddModal(false);
            setEditingVariant(null);
            
            // ✅ ENHANCED: Show success message
            const operation = editingVariant ? 'aggiornata' : 'creata';
            setSuccessMessage(
              `Variante ${operation} con successo! ${savedVariant?.name ? 
                `(${savedVariant.name})` : 
                ''}`
            );
            
            await fetchVariants();
            await fetchStats();
          }}
          products={products}
        />
      )}

      {/* ✅ NEW: Variant Details Modal */}
      {viewingVariant && (
        <VariantDetailsModal
          variant={viewingVariant}
          onClose={() => setViewingVariant(null)}
          onEdit={() => {
            setEditingVariant(viewingVariant);
            setViewingVariant(null);
          }}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED: Modal allineato con backend API
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

  const validateForm = () => {
    if (!formData.product_id) {
      setError('Prodotto è obbligatorio');
      return false;
    }
    
    if (!formData.name.trim()) {
      setError('Nome variante è obbligatorio');
      return false;
    }
    
    if (!formData.price || parseFloat(formData.price) < 0) {
      setError('Prezzo deve essere positivo');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ FIXED: Removed hardcoded URL
      const url = isEditing 
        ? `/api/variants/${variant.id}`
        : '/api/variants';
        
      const method = isEditing ? 'PUT' : 'POST';

      // Prepare data to send
      const dataToSend = {
        ...formData,
        price: parseFloat(formData.price),
        sort_order: parseInt(formData.sort_order) || 0,
        name: formData.name.trim(),
        sku: formData.sku?.trim() || null
      };

      console.log('💾 Saving variant:', dataToSend);
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore nella ${isEditing ? 'modifica' : 'creazione'} variante`);
      }

      const responseData = await response.json();
      // Il backend restituisce l'oggetto variant direttamente o dentro .variant
      const variantData = responseData.variant || responseData;
      
      console.log('✅ Variant saved:', variantData);
      onSave(variantData);
      
    } catch (error) {
      console.error('❌ Error saving variant:', error);
      setError(error.message);
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
    
    // Clear error when user starts correcting
    if (error) {
      setError(null);
    }
  };

  // ✅ ENHANCED: Better SKU generation
  const generateSKU = () => {
    if (selectedProduct && formData.name) {
      const productCode = selectedProduct.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase();
      const variantCode = formData.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase();
      const timestamp = Date.now().toString().slice(-4);
      const sku = `${productCode}${variantCode}${timestamp}`;
      setFormData(prev => ({ ...prev, sku }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditing ? `✏️ Modifica ${variant.name}` : '🔄 Nuova Variante'}
          </h3>
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
                  {isEditing && (
                    <small className="form-help">
                      Il prodotto non può essere modificato per varianti esistenti
                    </small>
                  )}
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
                      🎲 Genera
                    </button>
                  </div>
                  <small className="form-help">
                    Lasciare vuoto per generazione automatica o specificare codice personalizzato univoco
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
                    Numero per ordinamento (0 = primo, maggiore = dopo). Supporta drag & drop
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
                      Le varianti disattive non sono visibili agli utenti ma conservano dati e stock
                    </small>
                  </div>
                </div>
              </div>

              {selectedProduct && (
                <div className="product-preview">
                  <h4>📋 Informazioni Prodotto Selezionato</h4>
                  <div className="product-details">
                    <div><strong>Nome:</strong> {selectedProduct.name}</div>
                    <div><strong>Categoria:</strong> {selectedProduct.category_name || 'Nessuna categoria'}</div>
                    <div><strong>Prezzo base:</strong> {formatCurrency(selectedProduct.base_price)}</div>
                    <div><strong>Varianti esistenti:</strong> {selectedProduct.variant_count}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={loading}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  {isEditing ? 'Aggiornando...' : 'Creando...'}
                </>
              ) : (
                isEditing ? '💾 Aggiorna Variante' : '🔄 Crea Variante'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ NEW: Variant Details Modal
function VariantDetailsModal({ variant, onClose, onEdit }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriceDifference = () => {
    if (!variant.product_base_price) return null;
    const diff = variant.price - variant.product_base_price;
    if (diff === 0) return null;
    return {
      amount: diff,
      percentage: ((diff / variant.product_base_price) * 100).toFixed(1),
      type: diff > 0 ? 'increase' : 'decrease'
    };
  };

  const priceDiff = getPriceDifference();

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>👁️ Dettagli Variante: {variant.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="variant-details">
            <div className="details-section">
              <h4>🔄 Informazioni Variante</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>ID:</strong> {variant.id}
                </div>
                <div className="detail-item">
                  <strong>Nome:</strong> {variant.name}
                </div>
                <div className="detail-item">
                  <strong>Prezzo:</strong> {formatCurrency(variant.price)}
                </div>
                <div className="detail-item">
                  <strong>SKU:</strong> {variant.sku || 'Non specificato'}
                </div>
                <div className="detail-item">
                  <strong>Ordine:</strong> #{variant.sort_order}
                </div>
                <div className="detail-item">
                  <strong>Stato:</strong> 
                  <span className={`status-badge ${variant.active ? 'active' : 'inactive'}`}>
                    {variant.active ? '✅ Attiva' : '❌ Disattiva'}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Creata:</strong> {formatDate(variant.created_at)}
                </div>
                <div className="detail-item">
                  <strong>Modificata:</strong> {formatDate(variant.updated_at)}
                </div>
              </div>
            </div>

            <div className="details-section">
              <h4>📦 Informazioni Prodotto</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Prodotto:</strong> {variant.product_name}
                </div>
                <div className="detail-item">
                  <strong>Categoria:</strong> {variant.category_name || 'Nessuna'}
                </div>
                <div className="detail-item">
                  <strong>Prezzo base:</strong> {formatCurrency(variant.product_base_price)}
                </div>
                {priceDiff && (
                  <div className="detail-item">
                    <strong>Differenza prezzo:</strong> 
                    <span className={`price-diff ${priceDiff.type}`}>
                      {priceDiff.amount > 0 ? '+' : ''}{formatCurrency(priceDiff.amount)}
                      {` (${priceDiff.amount > 0 ? '+' : ''}${priceDiff.percentage}%)`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h4>📊 Stock e Movimenti</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Quantità in stock:</strong> 
                  <span className={`stock-badge ${variant.stock_quantity > 0 ? 'in-stock' : 'out-stock'}`}>
                    {variant.stock_quantity || 0} {variant.stock_unit || 'pcs'}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Movimenti totali:</strong> {variant.movement_count || 0}
                </div>
                <div className="detail-item">
                  <strong>Stato stock:</strong>
                  <span className={`stock-status ${variant.stock_quantity > 10 ? 'good' : variant.stock_quantity > 0 ? 'low' : 'empty'}`}>
                    {variant.stock_quantity > 10 ? '🟢 Buono' : 
                     variant.stock_quantity > 0 ? '🟡 Basso' : '🔴 Esaurito'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button type="button" className="btn primary" onClick={onEdit}>
            ✏️ Modifica Variante
          </button>
        </div>
      </div>
    </div>
  );
}