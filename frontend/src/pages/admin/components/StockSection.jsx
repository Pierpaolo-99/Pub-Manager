import { useState, useEffect, useCallback } from "react";
import "./StockSection.css";

export default function StockSection() {
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
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
  }, []);

  // ✅ ENHANCED: Auto-refresh quando cambiano i filtri con debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search.length >= 2 || filters.search.length === 0) {
        fetchStock();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // ✅ ENHANCED: Fetch stock with better error handling and response validation
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
      
      console.log('📦 Fetching stock with filters:', Object.fromEntries(params));
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/stock?${params}`, {
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
      console.log('✅ Stock data received:', data);
      
      // ✅ ENHANCED: Validate response structure
      if (!data.success) {
        throw new Error(data.error || 'Risposta del server non valida');
      }
      
      setStock(data.stock || []);
      setStats(data.summary || {});
      
      console.log(`✅ Loaded ${(data.stock || []).length} stock items`);
      
    } catch (err) {
      console.error('❌ Error fetching stock:', err);
      setError(err.message);
      setStock([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: Fetch suppliers with error handling
  const fetchSuppliers = async () => {
    try {
      console.log('🚚 Fetching suppliers...');
      
      // ✅ FIXED: Relative URL
      const response = await fetch('/api/stock/suppliers', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // ✅ ENHANCED: Validate response
        if (data.success) {
          setSuppliers(data.suppliers || []);
          console.log(`✅ Loaded ${(data.suppliers || []).length} suppliers`);
        } else {
          console.warn('⚠️ Suppliers response not successful:', data);
        }
      } else {
        console.warn('⚠️ Suppliers fetch failed:', response.status);
      }
    } catch (err) {
      console.error('❌ Error fetching suppliers:', err);
      // Non bloccare l'interfaccia per errori non critici
    }
  };

  // ✅ ENHANCED: Fetch variants with error handling
  const fetchVariants = async () => {
    try {
      console.log('🏷️ Fetching variants...');
      
      // ✅ FIXED: Relative URL
      const response = await fetch('/api/stock/variants', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // ✅ ENHANCED: Validate response
        if (data.success) {
          setVariants(data.variants || []);
          console.log(`✅ Loaded ${(data.variants || []).length} variants`);
        } else {
          console.warn('⚠️ Variants response not successful:', data);
        }
      } else {
        console.warn('⚠️ Variants fetch failed:', response.status);
      }
    } catch (err) {
      console.error('❌ Error fetching variants:', err);
      // Non bloccare l'interfaccia per errori non critici
    }
  };

  // ✅ ENHANCED: Delete with better confirmation and feedback
  const handleDeleteStock = async (id, productName, stockInfo) => {
    const confirmMessage = `Eliminare lo stock di "${productName}"?

📋 DETTAGLI:
- Quantità attuale: ${stockInfo.quantity} ${stockInfo.unit}
- Valore: ${formatCurrency(stockInfo.total_value)}
- Fornitore: ${stockInfo.supplier || 'N/A'}

⚠️ ATTENZIONE: 
- Lo stock verrà completamente rimosso
- Tutti i movimenti correlati rimarranno registrati
- Questa operazione è irreversibile

Continuare?`;

    if (!confirm(confirmMessage)) return;
    
    try {
      setError(null);
      console.log(`🗑️ Deleting stock ${id}...`);
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/stock/${id}`, {
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
      
      // ✅ ENHANCED: Validate response
      if (!result.success) {
        throw new Error(result.error || 'Eliminazione non riuscita');
      }
      
      console.log('✅ Stock deleted successfully');
      setSuccessMessage(`Stock "${productName}" eliminato con successo!`);
      
      // Refresh data
      await fetchStock();
      
    } catch (err) {
      console.error('❌ Error deleting stock:', err);
      setError(`Errore eliminazione: ${err.message}`);
    }
  };

  // ✅ ENHANCED: Quick update with better validation and feedback
  const handleQuickUpdate = async (id, operation, value, stockInfo) => {
    // ✅ ENHANCED: Validation
    if (!value || isNaN(value) || value <= 0) {
      setError('Inserisci un valore numerico valido maggiore di 0');
      return;
    }

    const quantity = parseFloat(value);
    
    // ✅ ENHANCED: Prevent negative stock warning
    if (operation === 'subtract') {
      const currentStock = parseFloat(stockInfo.quantity) || 0;
      
      if (quantity > currentStock) {
        const confirmNegative = confirm(
          `⚠️ ATTENZIONE: Sottrazione causerebbe stock negativo!\n\n` +
          `Stock attuale: ${currentStock} ${stockInfo.unit}\n` +
          `Quantità da sottrarre: ${quantity}\n` +
          `Stock risultante: ${currentStock - quantity}\n\n` +
          `Continuare comunque?`
        );
        
        if (!confirmNegative) return;
      }
    }
    
    try {
      setError(null);
      console.log(`🔄 Quick update: ${operation} ${quantity} for stock ${id}`);
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/stock/${id}/quantity`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          quantity: quantity, 
          operation: operation 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento quantità');
      }
      
      const result = await response.json();
      
      // ✅ ENHANCED: Validate response
      if (!result.success) {
        throw new Error(result.error || 'Aggiornamento non riuscito');
      }
      
      console.log('✅ Quantity updated successfully');
      
      // ✅ ENHANCED: Show operation feedback
      const operationText = {
        'add': 'aggiunta',
        'subtract': 'sottratta',
        'set': 'impostata'
      };
      
      setSuccessMessage(
        `Quantità ${operationText[operation]} con successo! (${quantity} ${stockInfo.unit})`
      );
      
      // Refresh stock
      await fetchStock();
      
    } catch (err) {
      console.error('❌ Error updating quantity:', err);
      setError(`Errore aggiornamento: ${err.message}`);
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

  // ✅ ENHANCED: Helper functions with better formatting
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

  const getStatusColor = (status) => {
    const colors = {
      'ok': 'success',
      'low': 'warning', 
      'critical': 'danger',
      'out_of_stock': 'error',
      'expired': 'expired',
      'expiring': 'warning',
      'overstocked': 'info'
    };
    return colors[status] || 'secondary';
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '€0,00';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getExpiryStatus = (expiryDate, daysToExpiry) => {
    if (!expiryDate) return '';
    if (daysToExpiry === null) return '';
    if (daysToExpiry <= 0) return 'expired';
    if (daysToExpiry <= 7) return 'expiring';
    return '';
  };

  // ✅ ENHANCED: Filter change with immediate UI feedback
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

  if (loading && stock.length === 0) {
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

      {/* Header con statistiche enhanced */}
      <div className="section-header">
        <div className="header-left">
          <h2>📦 Gestione Stock</h2>
          <p className="section-subtitle">
            {stats.total || 0} prodotti in stock • 
            {stats.critical || 0} critici • 
            {stats.outOfStock || 0} esauriti • 
            Valore: {formatCurrency(stats.totalValue)}
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              fetchStock();
              fetchSuppliers();
              fetchVariants();
            }}
            disabled={loading}
            title="Aggiorna dati stock"
          >
            {loading ? '⏳' : '🔄'} Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Aggiungi Stock
          </button>
        </div>
      </div>

      {/* Enhanced Statistiche rapide con più dettagli */}
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
            <div className="stat-number">{(stats.low || 0)}</div>
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

      {/* Enhanced Filtri */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca prodotti, varianti, fornitori, SKU..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="ok">🟢 OK</option>
          <option value="low">🟡 Bassi</option>
          <option value="critical">🔴 Critici</option>
          <option value="out_of_stock">❌ Esauriti</option>
          <option value="expiring">⚠️ In scadenza</option>
          <option value="expired">💀 Scaduti</option>
          <option value="overstocked">📈 Eccessi</option>
        </select>

        <select
          value={filters.supplier}
          onChange={(e) => handleFilterChange('supplier', e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti i fornitori</option>
          {suppliers.map((supplierInfo, index) => (
            <option key={index} value={supplierInfo.supplier}>
              {supplierInfo.supplier} ({supplierInfo.products_count} prodotti)
            </option>
          ))}
        </select>

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.low_stock}
            onChange={(e) => handleFilterChange('low_stock', e.target.checked)}
          />
          <span className="checkbox-label">Solo stock bassi/critici</span>
        </label>

        {Object.values(filters).some(v => v && v !== 'all' && v !== false) && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setFilters({
                search: '',
                status: 'all',
                supplier: 'all',
                low_stock: false
              });
            }}
            title="Pulisci tutti i filtri"
          >
            🧹 Pulisci
          </button>
        )}
      </div>

      {/* Enhanced Tabella stock */}
      {stock.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <h3>Nessun stock trovato</h3>
          <p>
            {loading 
              ? "Caricamento in corso..." 
              : Object.values(filters).some(v => v && v !== 'all' && v !== false)
                ? "Nessun prodotto corrisponde ai filtri selezionati"
                : "Inizia aggiungendo i tuoi primi prodotti in stock"
            }
          </p>
          <div className="empty-actions">
            <button 
              className="btn primary" 
              onClick={() => setShowAddModal(true)}
            >
              + Aggiungi Primo Stock
            </button>
            {Object.values(filters).some(v => v && v !== 'all' && v !== false) && (
              <button 
                className="btn secondary" 
                onClick={() => {
                  setFilters({
                    search: '',
                    status: 'all',
                    supplier: 'all',
                    low_stock: false
                  });
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
                      <div className="product-meta">
                        <span className="category" style={{ 
                          color: item.category_color || '#64748b' 
                        }}>
                          {item.category_name || 'Senza categoria'}
                        </span>
                        {item.variant_sku && (
                          <span className="sku">SKU: {item.variant_sku}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="quantity-controls">
                      <div className="quantity-display">
                        <span className={`current-qty ${item.stock_status}`}>
                          {item.quantity} {item.unit}
                        </span>
                        {item.variant_price > 0 && (
                          <span className="unit-price">
                            @ {formatCurrency(item.variant_price)}/{item.unit}
                          </span>
                        )}
                      </div>
                      <div className="quick-actions">
                        <button 
                          className="qty-btn subtract"
                          onClick={() => {
                            const qty = prompt('Quantità da sottrarre:', '1');
                            if (qty && !isNaN(qty) && qty > 0) {
                              handleQuickUpdate(item.id, 'subtract', parseFloat(qty), item);
                            }
                          }}
                          title="Sottrai quantità"
                          disabled={item.stock_status === 'out_of_stock'}
                        >
                          ➖
                        </button>
                        <button 
                          className="qty-btn add"
                          onClick={() => {
                            const qty = prompt('Quantità da aggiungere:', '1');
                            if (qty && !isNaN(qty) && qty > 0) {
                              handleQuickUpdate(item.id, 'add', parseFloat(qty), item);
                            }
                          }}
                          title="Aggiungi quantità"
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
                        <span className={`threshold-value ${item.quantity <= item.min_threshold ? 'exceeded' : ''}`}>
                          {item.min_threshold}
                        </span>
                      </div>
                      {item.max_threshold && (
                        <div className="threshold-item max">
                          <span className="threshold-label">Max:</span>
                          <span className={`threshold-value ${item.quantity >= item.max_threshold ? 'exceeded' : ''}`}>
                            {item.max_threshold}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="cost-info">
                      <div className="unit-cost">
                        {formatCurrency(item.cost_per_unit)}/{item.unit}
                      </div>
                      <div className="total-value">
                        Tot: {formatCurrency(item.total_value)}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="supplier">
                      {item.supplier || (
                        <span className="no-supplier">N/A</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className="expiry-info">
                      {item.expiry_date ? (
                        <>
                          <span className={`expiry-date ${getExpiryStatus(item.expiry_date, item.days_to_expiry)}`}>
                            {formatDate(item.expiry_date)}
                          </span>
                          <span className={`days-left ${getExpiryStatus(item.expiry_date, item.days_to_expiry)}`}>
                            {item.days_to_expiry > 0 
                              ? `${item.days_to_expiry} giorni` 
                              : 'Scaduto'}
                          </span>
                        </>
                      ) : (
                        <span className="no-expiry">N/A</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="restock-date">
                      {formatDate(item.last_restock_date)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(item.stock_status)}`}>
                      {getStatusIcon(item.stock_status)} {getStatusLabel(item.stock_status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-small primary"
                        onClick={() => setEditingStock(item)}
                        title="Modifica stock"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-small secondary"
                        onClick={() => {
                          // TODO: Implementare visualizzazione storico movimenti
                          alert(`Storico movimenti per: ${item.product_name} - ${item.variant_name}\n\nFunzionalità in sviluppo.`);
                        }}
                        title="Visualizza storico movimenti"
                      >
                        📋
                      </button>
                      <button 
                        className="btn-small danger"
                        onClick={() => handleDeleteStock(
                          item.id, 
                          `${item.product_name} - ${item.variant_name}`,
                          item
                        )}
                        title="Elimina stock"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Enhanced Table Footer */}
          <div className="table-footer">
            <div className="table-summary">
              <span>
                Visualizzati: <strong>{stock.length}</strong> prodotti • 
                Valore totale: <strong>{formatCurrency(stats.totalValue)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Modal Add/Edit */}
      {(showAddModal || editingStock) && (
        <StockModal
          stock={editingStock}
          variants={variants}
          onClose={() => {
            setShowAddModal(false);
            setEditingStock(null);
          }}
          onSave={(savedStock) => {
            setShowAddModal(false);
            setEditingStock(null);
            
            // ✅ ENHANCED: Show success message based on operation
            const operation = editingStock ? 'aggiornato' : 'creato';
            setSuccessMessage(
              `Stock ${operation} con successo! ${savedStock?.product_name ? 
                `(${savedStock.product_name} - ${savedStock.variant_name})` : 
                ''}`
            );
            
            fetchStock();
          }}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED: StockModal con validation migliorata e feedback
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
  const [selectedVariant, setSelectedVariant] = useState(null);

  // ✅ ENHANCED: Set selected variant on stock edit
  useEffect(() => {
    if (stock && variants.length > 0) {
      const variant = variants.find(v => v.id == stock.product_variant_id);
      setSelectedVariant(variant || null);
    }
  }, [stock, variants]);

  // ✅ ENHANCED: Calculate estimated value
  const estimatedValue = formData.quantity && formData.cost_per_unit 
    ? parseFloat(formData.quantity) * parseFloat(formData.cost_per_unit)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ ENHANCED: Client-side validation
      if (!formData.product_variant_id) {
        throw new Error('Seleziona un prodotto/variante');
      }
      
      if (!formData.quantity || parseFloat(formData.quantity) < 0) {
        throw new Error('Inserisci una quantità valida (≥ 0)');
      }

      if (formData.min_threshold && parseFloat(formData.min_threshold) < 0) {
        throw new Error('Soglia minima deve essere ≥ 0');
      }

      if (formData.max_threshold && formData.min_threshold && 
          parseFloat(formData.max_threshold) <= parseFloat(formData.min_threshold)) {
        throw new Error('Soglia massima deve essere maggiore della minima');
      }

      console.log(`💾 ${stock ? 'Updating' : 'Creating'} stock:`, formData);
      
      // ✅ FIXED: Relative URL
      const url = stock ? `/api/stock/${stock.id}` : '/api/stock';
      const method = stock ? 'PUT' : 'POST';
      
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
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      
      // ✅ ENHANCED: Validate response
      if (!result.success) {
        throw new Error(result.error || 'Operazione non riuscita');
      }
      
      console.log('✅ Stock saved successfully:', result);
      
      onSave(result.stock || {
        product_name: selectedVariant?.product_name,
        variant_name: selectedVariant?.variant_name
      });
      
    } catch (err) {
      console.error('❌ Error saving stock:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user makes changes
    if (error) {
      setError(null);
    }
  };

  const handleVariantChange = (variantId) => {
    const variant = variants.find(v => v.id == variantId);
    setSelectedVariant(variant || null);
    setFormData(prev => ({
      ...prev,
      product_variant_id: variantId,
      // Auto-fill price as cost if available
      cost_per_unit: variant?.price || prev.cost_per_unit
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>
            {stock ? '✏️ Modifica Stock' : '📦 Nuovo Stock'}
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
                  <label className="form-label">Prodotto/Variante *</label>
                  <select
                    name="product_variant_id"
                    value={formData.product_variant_id}
                    onChange={(e) => handleVariantChange(e.target.value)}
                    className="form-select"
                    required
                    disabled={!!stock}
                  >
                    <option value="">Seleziona prodotto/variante</option>
                    {variants.map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.product_name} - {variant.variant_name} 
                        ({variant.category_name})
                        {variant.has_stock && ' [Ha già stock]'}
                        {variant.price && ` - €${variant.price}`}
                      </option>
                    ))}
                  </select>
                  {selectedVariant?.has_stock && !stock && (
                    <small className="form-help warning">
                      ⚠️ Questa variante ha già uno stock esistente. 
                      Considera di modificare quello esistente invece di crearne uno nuovo.
                    </small>
                  )}
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
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unità di Misura</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="pcs">Pezzi (pcs)</option>
                    <option value="kg">Kilogrammi (kg)</option>
                    <option value="g">Grammi (g)</option>
                    <option value="l">Litri (l)</option>
                    <option value="ml">Millilitri (ml)</option>
                    <option value="box">Scatole (box)</option>
                    <option value="pack">Confezioni (pack)</option>
                    <option value="bottle">Bottiglie (bottle)</option>
                  </select>
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
                    placeholder="0.00"
                  />
                  {estimatedValue > 0 && (
                    <small className="form-help">
                      Valore stimato: <strong>{formatCurrency(estimatedValue)}</strong>
                    </small>
                  )}
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
                    placeholder="0.00"
                  />
                  <small className="form-help">
                    Avviso quando la quantità scende sotto questo valore
                  </small>
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
                    placeholder="0.00"
                  />
                  <small className="form-help">
                    Avviso per eccesso di stock
                  </small>
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
                    placeholder="Nome fornitore..."
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
                  placeholder="Lotto, condizioni, note aggiuntive..."
                />
              </div>

              {/* ✅ ENHANCED: Stock preview */}
              {selectedVariant && (
                <div className="stock-preview">
                  <h4>📋 Riepilogo Stock</h4>
                  <div className="preview-details">
                    <div className="preview-row">
                      <strong>Prodotto:</strong> {selectedVariant.product_name} - {selectedVariant.variant_name}
                    </div>
                    <div className="preview-row">
                      <strong>Categoria:</strong> {selectedVariant.category_name}
                    </div>
                    {selectedVariant.sku && (
                      <div className="preview-row">
                        <strong>SKU:</strong> {selectedVariant.sku}
                      </div>
                    )}
                    {selectedVariant.price && (
                      <div className="preview-row">
                        <strong>Prezzo vendita:</strong> {formatCurrency(selectedVariant.price)}
                      </div>
                    )}
                    {formData.quantity && formData.cost_per_unit && (
                      <div className="preview-row">
                        <strong>Valore stock:</strong> 
                        <span className="highlight">{formatCurrency(estimatedValue)}</span>
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
                  {stock ? 'Aggiornando...' : 'Creando...'}
                </>
              ) : (
                stock ? '💾 Aggiorna Stock' : '📦 Crea Stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function
function formatCurrency(amount) {
  if (!amount || isNaN(amount)) return '€0,00';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}