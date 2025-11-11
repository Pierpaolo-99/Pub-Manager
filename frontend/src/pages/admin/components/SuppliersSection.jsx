import { useState, useEffect, useCallback } from "react";
import "./SuppliersSection.css";

export default function SuppliersSection() {
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    active: 'all',
    payment_terms: 'all'
  });
  
  const [paymentTerms, setPaymentTerms] = useState([]);

  useEffect(() => {
    fetchSuppliers();
    fetchPaymentTerms();
    fetchSuppliersStats();
  }, []);

  // ✅ ENHANCED: Auto-refresh quando cambiano i filtri con debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search.length >= 2 || filters.search.length === 0) {
        fetchSuppliers();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // ✅ ENHANCED: Fetch suppliers with better error handling and response validation
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      console.log('🚚 Fetching suppliers with filters:', Object.fromEntries(params));
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/suppliers?${params}`, {
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
      console.log('✅ Suppliers data received:', data);
      
      // ✅ ENHANCED: Validate response structure
      if (!data.success) {
        throw new Error(data.error || 'Risposta del server non valida');
      }
      
      setSuppliers(data.suppliers || []);
      setStats(data.summary || {});
      
      console.log(`✅ Loaded ${(data.suppliers || []).length} suppliers`);
      
    } catch (err) {
      console.error('❌ Error fetching suppliers:', err);
      setError(err.message);
      setSuppliers([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: Fetch payment terms with error handling
  const fetchPaymentTerms = async () => {
    try {
      console.log('💳 Fetching payment terms...');
      
      // ✅ FIXED: Relative URL
      const response = await fetch('/api/suppliers/payment-terms', {
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
          setPaymentTerms(data.paymentTerms || []);
          console.log(`✅ Loaded ${(data.paymentTerms || []).length} payment terms`);
        } else {
          console.warn('⚠️ Payment terms response not successful:', data);
        }
      } else {
        console.warn('⚠️ Payment terms fetch failed:', response.status);
      }
    } catch (err) {
      console.error('❌ Error fetching payment terms:', err);
      // Non bloccare l'interfaccia per errori non critici
    }
  };

  // ✅ NEW: Fetch detailed statistics
  const fetchSuppliersStats = async () => {
    try {
      console.log('📊 Fetching suppliers statistics...');
      
      // ✅ FIXED: Relative URL
      const response = await fetch('/api/suppliers/stats', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // ✅ ENHANCED: Merge detailed stats with summary
        if (data.success) {
          setStats(prev => ({
            ...prev,
            ...data.stats
          }));
          console.log('✅ Detailed stats loaded:', data.stats);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching detailed stats:', err);
      // Non bloccare l'interfaccia
    }
  };

  // ✅ NEW: View supplier details with products
  const handleViewSupplier = async (supplier) => {
    try {
      console.log(`👀 Loading details for supplier ${supplier.id}...`);
      
      // Fetch supplier details and products
      const [detailsResponse, productsResponse] = await Promise.all([
        // ✅ FIXED: Relative URL
        fetch(`/api/suppliers/${supplier.id}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }),
        // ✅ FIXED: Relative URL
        fetch(`/api/suppliers/${supplier.id}/products`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
      ]);

      let supplierDetails = supplier;
      let supplierProducts = { products: [], stats: {} };

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        if (detailsData.success) {
          supplierDetails = detailsData.supplier;
        }
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData.success) {
          supplierProducts = productsData;
        }
      }

      setViewingSupplier({
        ...supplierDetails,
        products: supplierProducts.products,
        productsStats: supplierProducts.stats
      });

    } catch (err) {
      console.error('❌ Error loading supplier details:', err);
      setError(`Errore caricamento dettagli: ${err.message}`);
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setShowModal(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setShowModal(true);
  };

  // ✅ ENHANCED: Delete with better confirmation and feedback
  const handleDeleteSupplier = async (id, supplierName) => {
    const confirmMessage = `Eliminare il fornitore "${supplierName}"?

⚠️ ATTENZIONE:
- Se ci sono prodotti in stock associati, il fornitore verrà solo disattivato
- Se non ci sono dipendenze, verrà eliminato definitivamente
- Questa operazione può essere irreversibile

Continuare?`;

    if (!confirm(confirmMessage)) return;
    
    try {
      setError(null);
      console.log(`🗑️ Deleting supplier ${id}...`);
      
      // ✅ FIXED: Relative URL
      const response = await fetch(`/api/suppliers/${id}`, {
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
      
      console.log('✅ Supplier deletion completed:', result);
      
      // ✅ ENHANCED: Show specific success message
      if (result.deactivated) {
        setSuccessMessage(
          `Fornitore "${supplierName}" disattivato (${result.stockProducts || 0} prodotti in stock associati)`
        );
      } else {
        setSuccessMessage(
          `Fornitore "${supplierName}" eliminato definitivamente`
        );
      }
      
      // Refresh data
      await fetchSuppliers();
      await fetchSuppliersStats();
      
    } catch (err) {
      console.error('❌ Error deleting supplier:', err);
      setError(`Errore eliminazione: ${err.message}`);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading && suppliers.length === 0) {
    return (
      <div className="suppliers-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento fornitori...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="suppliers-section">
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
          <h2>🚚 Gestione Fornitori</h2>
          <p className="section-subtitle">
            {stats.total_suppliers || 0} fornitori totali • 
            {stats.active_suppliers || 0} attivi • 
            {stats.suppliers_with_email || 0} con email • 
            {stats.countries_count || 0} paesi
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              fetchSuppliers();
              fetchPaymentTerms();
              fetchSuppliersStats();
            }}
            disabled={loading}
            title="Aggiorna dati fornitori"
          >
            {loading ? '⏳' : '🔄'} Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={handleAddSupplier}
          >
            + Aggiungi Fornitore
          </button>
        </div>
      </div>

      {/* ✅ FIXED: Statistiche rapide allineate con backend */}
      <div className="suppliers-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">{stats.active_suppliers || 0}</div>
            <div className="stat-label">Attivi</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">⚫</span>
          <div>
            <div className="stat-number">{stats.inactive_suppliers || 0}</div>
            <div className="stat-label">Inattivi</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">📧</span>
          <div>
            <div className="stat-number">{stats.suppliers_with_email || 0}</div>
            <div className="stat-label">Con Email</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">📞</span>
          <div>
            <div className="stat-number">{stats.suppliers_with_phone || 0}</div>
            <div className="stat-label">Con Telefono</div>
          </div>
        </div>
        <div className="stat-card mini primary">
          <span className="stat-icon">🌐</span>
          <div>
            <div className="stat-number">{stats.suppliers_with_website || 0}</div>
            <div className="stat-label">Con Website</div>
          </div>
        </div>
        <div className="stat-card mini tertiary">
          <span className="stat-icon">💳</span>
          <div>
            <div className="stat-number">{stats.payment_terms_count || 0}</div>
            <div className="stat-label">Termini Pagamento</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filtri */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca fornitori, contatti, email, note..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.active}
          onChange={(e) => handleFilterChange('active', e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="true">🟢 Solo attivi</option>
          <option value="false">⚫ Solo inattivi</option>
        </select>

        <select
          value={filters.payment_terms}
          onChange={(e) => handleFilterChange('payment_terms', e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti i termini di pagamento</option>
          {paymentTerms.map(term => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>

        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setFilters({
                search: '',
                active: 'all',
                payment_terms: 'all'
              });
            }}
            title="Pulisci tutti i filtri"
          >
            🧹 Pulisci
          </button>
        )}
      </div>

      {/* ✅ ENHANCED: Tabella fornitori allineata con backend data */}
      {suppliers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🚚</span>
          <h3>Nessun fornitore trovato</h3>
          <p>
            {loading 
              ? "Caricamento in corso..." 
              : Object.values(filters).some(v => v && v !== 'all')
                ? "Nessun fornitore corrisponde ai filtri selezionati"
                : "Inizia aggiungendo i tuoi primi fornitori"
            }
          </p>
          <div className="empty-actions">
            <button 
              className="btn primary" 
              onClick={handleAddSupplier}
            >
              + Aggiungi Primo Fornitore
            </button>
            {Object.values(filters).some(v => v && v !== 'all') && (
              <button 
                className="btn secondary" 
                onClick={() => {
                  setFilters({
                    search: '',
                    active: 'all',
                    payment_terms: 'all'
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
                <th>Fornitore</th>
                <th>Contatto</th>
                <th>Comunicazione</th>
                <th>Condizioni</th>
                <th>Creato</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(supplier => (
                <tr key={supplier.id} className={!supplier.active ? 'inactive' : ''}>
                  <td>
                    <div className="supplier-info">
                      <div className="supplier-main">
                        <span className="supplier-name">{supplier.name}</span>
                      </div>
                      {supplier.notes && (
                        <div className="supplier-notes" title={supplier.notes}>
                          📝 {supplier.notes.length > 50 
                            ? `${supplier.notes.substring(0, 50)}...` 
                            : supplier.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      {supplier.contact_person && (
                        <div className="contact-person">
                          👤 {supplier.contact_person}
                        </div>
                      )}
                      {(supplier.address || supplier.city) && (
                        <div className="address">
                          📍 {supplier.city || supplier.address || 'Indirizzo non specificato'}
                          {supplier.postal_code && ` (${supplier.postal_code})`}
                        </div>
                      )}
                      {supplier.country && supplier.country !== 'Italia' && (
                        <div className="country">
                          🌍 {supplier.country}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="communication-info">
                      {supplier.email && (
                        <div className="email">
                          <a href={`mailto:${supplier.email}`} className="email-link">
                            📧 {supplier.email}
                          </a>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="phones">
                          <a href={`tel:${supplier.phone}`} className="phone-link">
                            📞 {supplier.phone}
                          </a>
                        </div>
                      )}
                      {supplier.website && (
                        <div className="website">
                          <a 
                            href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="website-link"
                          >
                            🌐 Website
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="terms-info">
                      {supplier.payment_terms ? (
                        <div className="payment-terms">
                          💳 {supplier.payment_terms}
                        </div>
                      ) : (
                        <div className="payment-terms no-terms">
                          💳 Non specificato
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="date-info">
                      <span className="created-date">
                        {formatDate(supplier.created_at)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${supplier.active ? 'active' : 'inactive'}`}>
                      {supplier.active ? '🟢 Attivo' : '⚫ Inattivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-small primary" 
                        onClick={() => handleEditSupplier(supplier)}
                        title="Modifica fornitore"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-small secondary" 
                        onClick={() => handleViewSupplier(supplier)}
                        title="Visualizza dettagli e prodotti"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-small danger" 
                        onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                        title="Elimina fornitore"
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
                Visualizzati: <strong>{suppliers.length}</strong> fornitori • 
                Completezza contatti: <strong>{stats.contactCompleteness || 0}%</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ENHANCED: Modal Add/Edit allineato con backend */}
      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowModal(false);
            setEditingSupplier(null);
          }}
          onSave={(savedSupplier) => {
            setShowModal(false);
            setEditingSupplier(null);
            
            // ✅ ENHANCED: Show success message based on operation
            const operation = editingSupplier ? 'aggiornato' : 'creato';
            setSuccessMessage(
              `Fornitore ${operation} con successo! ${savedSupplier?.name ? 
                `(${savedSupplier.name})` : 
                ''}`
            );
            
            fetchSuppliers();
            fetchSuppliersStats();
          }}
        />
      )}

      {/* ✅ NEW: Supplier Details Modal */}
      {viewingSupplier && (
        <SupplierDetailsModal
          supplier={viewingSupplier}
          onClose={() => setViewingSupplier(null)}
          onEdit={() => {
            setEditingSupplier(viewingSupplier);
            setViewingSupplier(null);
            setShowModal(true);
          }}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED: Modal Component allineato con backend data model
function SupplierModal({ supplier, onClose, onSave }) {
  // ✅ FIXED: Form data allineato con backend schema
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Italia',
    payment_terms: '',
    notes: '',
    active: true,
    ...supplier
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome fornitore è obbligatorio';
    }

    if (formData.name.length > 255) {
      newErrors.name = 'Il nome non può superare i 255 caratteri';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`💾 ${supplier ? 'Updating' : 'Creating'} supplier:`, formData);
      
      // ✅ FIXED: Relative URL
      const url = supplier 
        ? `/api/suppliers/${supplier.id}`
        : '/api/suppliers';
      
      const method = supplier ? 'PATCH' : 'POST';  // ✅ FIXED: Use PATCH per update
      
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

      console.log('✅ Supplier saved successfully:', result);
      
      onSave(result.supplier || {
        name: formData.name,
        id: supplier?.id
      });
      
    } catch (err) {
      console.error('❌ Error saving supplier:', err);
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
    
    // Rimuovi errore quando l'utente corregge
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Clear general error when user makes changes
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>
            {supplier ? '✏️ Modifica Fornitore' : '🚚 Nuovo Fornitore'}
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

            <div className="form-sections">
              {/* ✅ FIXED: Informazioni base allineate con backend */}
              <div className="form-section">
                <h4>📝 Informazioni Base</h4>
                <div className="form-group">
                  <label className="form-label">Nome Fornitore *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    required
                    maxLength="255"
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Persona di Riferimento</label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              {/* ✅ FIXED: Contatti allineati con backend */}
              <div className="form-section">
                <h4>📞 Contatti</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`form-input ${errors.email ? 'error' : ''}`}
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Telefono</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Sito Web</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* ✅ FIXED: Indirizzo allineato con backend */}
              <div className="form-section">
                <h4>📍 Indirizzo</h4>
                <div className="form-group">
                  <label className="form-label">Indirizzo</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="2"
                    placeholder="Via/Viale, numero civico..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Città</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">CAP</label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      className="form-input"
                      pattern="[0-9]{5}"
                      placeholder="12345"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Paese</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* ✅ FIXED: Condizioni commerciali allineate con backend */}
              <div className="form-section">
                <h4>💰 Condizioni Commerciali</h4>
                <div className="form-group">
                  <label className="form-label">Termini di Pagamento</label>
                  <input
                    type="text"
                    name="payment_terms"
                    value={formData.payment_terms}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="es. 30 giorni, Bonifico immediato, Pagamento alla consegna"
                  />
                  <small className="form-help">
                    Specifica le condizioni di pagamento concordate
                  </small>
                </div>
              </div>

              {/* Note e stato */}
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="3"
                    placeholder="Note aggiuntive, condizioni speciali, contatti alternativi..."
                  />
                </div>

                <div className="form-checkbox-group">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                    />
                    <span className="checkbox-label">Fornitore attivo</span>
                  </label>
                  <small className="form-help">
                    I fornitori inattivi non appariranno nelle selezioni
                  </small>
                </div>
              </div>
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
                  {supplier ? 'Aggiornando...' : 'Creando...'}
                </>
              ) : (
                supplier ? '💾 Aggiorna Fornitore' : '🚚 Crea Fornitore'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ NEW: Supplier Details Modal with Products
function SupplierDetailsModal({ supplier, onClose, onEdit }) {
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

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h3>👁️ Dettagli Fornitore: {supplier.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="supplier-details">
            {/* Informazioni Generali */}
            <div className="details-section">
              <h4>📝 Informazioni Generali</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Nome:</strong> {supplier.name}
                </div>
                {supplier.contact_person && (
                  <div className="detail-item">
                    <strong>Contatto:</strong> {supplier.contact_person}
                  </div>
                )}
                <div className="detail-item">
                  <strong>Stato:</strong> 
                  <span className={`status-badge ${supplier.active ? 'active' : 'inactive'}`}>
                    {supplier.active ? '🟢 Attivo' : '⚫ Inattivo'}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Creato:</strong> {formatDate(supplier.created_at)}
                </div>
                <div className="detail-item">
                  <strong>Aggiornato:</strong> {formatDate(supplier.updated_at)}
                </div>
              </div>
            </div>

            {/* Contatti */}
            {(supplier.email || supplier.phone || supplier.website) && (
              <div className="details-section">
                <h4>📞 Contatti</h4>
                <div className="contact-details">
                  {supplier.email && (
                    <div className="contact-item">
                      <strong>Email:</strong> 
                      <a href={`mailto:${supplier.email}`} className="contact-link">
                        📧 {supplier.email}
                      </a>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="contact-item">
                      <strong>Telefono:</strong> 
                      <a href={`tel:${supplier.phone}`} className="contact-link">
                        📞 {supplier.phone}
                      </a>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="contact-item">
                      <strong>Website:</strong> 
                      <a 
                        href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="contact-link"
                      >
                        🌐 {supplier.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Indirizzo */}
            {(supplier.address || supplier.city || supplier.postal_code || supplier.country) && (
              <div className="details-section">
                <h4>📍 Indirizzo</h4>
                <div className="address-details">
                  {supplier.address && (
                    <div className="address-line">{supplier.address}</div>
                  )}
                  <div className="address-line">
                    {[supplier.postal_code, supplier.city].filter(Boolean).join(' ')}
                  </div>
                  {supplier.country && supplier.country !== 'Italia' && (
                    <div className="address-line">{supplier.country}</div>
                  )}
                </div>
              </div>
            )}

            {/* Condizioni Commerciali */}
            {supplier.payment_terms && (
              <div className="details-section">
                <h4>💰 Condizioni Commerciali</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <strong>Termini di Pagamento:</strong> {supplier.payment_terms}
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            {supplier.notes && (
              <div className="details-section">
                <h4>📝 Note</h4>
                <div className="notes-content">
                  {supplier.notes}
                </div>
              </div>
            )}

            {/* Prodotti Forniti */}
            {supplier.products && supplier.products.length > 0 && (
              <div className="details-section">
                <h4>📦 Prodotti Forniti ({supplier.products.length})</h4>
                {supplier.productsStats && (
                  <div className="products-stats">
                    <div className="stat-item">
                      <strong>Valore totale:</strong> {formatCurrency(supplier.productsStats.total_value)}
                    </div>
                    <div className="stat-item">
                      <strong>Prodotti con stock basso:</strong> {supplier.productsStats.low_stock_products || 0}
                    </div>
                  </div>
                )}
                <div className="products-table-container">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Prodotto</th>
                        <th>Categoria</th>
                        <th>Quantità</th>
                        <th>Costo/Unità</th>
                        <th>Valore Totale</th>
                        <th>Ultimo Carico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.products.map((product, index) => (
                        <tr key={index}>
                          <td>
                            <div className="product-info">
                              <div className="product-name">{product.product_name}</div>
                              <div className="variant-name">{product.variant_name}</div>
                              {product.variant_sku && (
                                <div className="sku">SKU: {product.variant_sku}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="category">{product.category_name || 'N/A'}</span>
                          </td>
                          <td>
                            <span className={`quantity ${product.quantity <= 5 ? 'low' : ''}`}>
                              {product.quantity} {product.unit}
                            </span>
                          </td>
                          <td>
                            <span className="cost">
                              {formatCurrency(product.cost_per_unit)}
                            </span>
                          </td>
                          <td>
                            <span className="value">
                              {formatCurrency(product.total_value)}
                            </span>
                          </td>
                          <td>
                            <span className="date">
                              {formatDate(product.last_restock_date)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button type="button" className="btn primary" onClick={onEdit}>
            ✏️ Modifica Fornitore
          </button>
        </div>
      </div>
    </div>
  );
}