import { useState, useEffect } from "react";
import "./SuppliersSection.css";

export default function SuppliersSection() {
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    active: 'all',
    payment_terms: 'all'
  });
  const [paymentTerms, setPaymentTerms] = useState([]);

  useEffect(() => {
    fetchSuppliers();
    fetchPaymentTerms();
  }, [filters]);

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
      
      const response = await fetch(`http://localhost:3000/api/suppliers?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setSuppliers(data.suppliers || []);
      setStats(data.summary || {});
      
    } catch (err) {
      console.error('❌ Error fetching suppliers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentTerms = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/suppliers/payment-terms', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaymentTerms(data.paymentTerms || []);
      }
    } catch (err) {
      console.error('❌ Error fetching payment terms:', err);
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

  const handleDeleteSupplier = async (id, supplierName) => {
    if (!confirm(`Sei sicuro di voler eliminare "${supplierName}"?\n\nNota: Se ci sono ordini associati, il fornitore verrà solo disattivato.`)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/suppliers/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }
      
      const result = await response.json();
      
      await fetchSuppliers();
      
      if (result.deactivated) {
        alert(`Fornitore "${supplierName}" disattivato (ha ordini associati)`);
      } else {
        alert(`Fornitore "${supplierName}" eliminato con successo`);
      }
      
    } catch (err) {
      console.error('❌ Error deleting supplier:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
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
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🚚 Gestione Fornitori</h2>
          <p className="section-subtitle">
            {stats.total || 0} fornitori • {stats.active || 0} attivi • Sconto medio: {stats.avgDiscount || 0}%
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={handleAddSupplier}
        >
          + Aggiungi Fornitore
        </button>
      </div>

      {/* Statistiche rapide */}
      <div className="suppliers-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">{stats.active || 0}</div>
            <div className="stat-label">Attivi</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">⚫</span>
          <div>
            <div className="stat-number">{stats.inactive || 0}</div>
            <div className="stat-label">Inattivi</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">📧</span>
          <div>
            <div className="stat-number">{stats.withEmail || 0}</div>
            <div className="stat-label">Con Email</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">{stats.avgDiscount || 0}%</div>
            <div className="stat-label">Sconto Medio</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca fornitori, contatti, email..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.active}
          onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="true">Solo attivi</option>
          <option value="false">Solo inattivi</option>
        </select>

        <select
          value={filters.payment_terms}
          onChange={(e) => setFilters(prev => ({ ...prev, payment_terms: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti i termini</option>
          {paymentTerms.map(term => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>
      </div>

      {/* Errori */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Tabella fornitori */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fornitore</th>
              <th>Contatto</th>
              <th>Comunicazione</th>
              <th>Condizioni</th>
              <th>Consegna</th>
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
                      {supplier.company_name && supplier.company_name !== supplier.name && (
                        <span className="company-name">{supplier.company_name}</span>
                      )}
                    </div>
                    {(supplier.vat_number || supplier.tax_code) && (
                      <div className="supplier-codes">
                        {supplier.vat_number && (
                          <span className="code">P.IVA: {supplier.vat_number}</span>
                        )}
                        {supplier.tax_code && (
                          <span className="code">CF: {supplier.tax_code}</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="contact-info">
                    {supplier.contact_person && (
                      <div className="contact-person">👤 {supplier.contact_person}</div>
                    )}
                    {supplier.address && (
                      <div className="address">📍 {supplier.city || supplier.address}</div>
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
                    {(supplier.phone || supplier.mobile) && (
                      <div className="phones">
                        {supplier.phone && (
                          <a href={`tel:${supplier.phone}`} className="phone-link">
                            📞 {supplier.phone}
                          </a>
                        )}
                        {supplier.mobile && (
                          <a href={`tel:${supplier.mobile}`} className="phone-link">
                            📱 {supplier.mobile}
                          </a>
                        )}
                      </div>
                    )}
                    {supplier.website && (
                      <div className="website">
                        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="website-link">
                          🌐 Website
                        </a>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="terms-info">
                    {supplier.payment_terms && (
                      <div className="payment-terms">💳 {supplier.payment_terms}</div>
                    )}
                    {supplier.discount_percentage > 0 && (
                      <div className="discount">🏷️ -{supplier.discount_percentage}%</div>
                    )}
                    {supplier.min_order_amount > 0 && (
                      <div className="min-order">📦 Min: {formatCurrency(supplier.min_order_amount)}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="delivery-info">
                    {supplier.delivery_days && (
                      <div className="delivery-days">🚚 {supplier.delivery_days}</div>
                    )}
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
                      onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
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
      {suppliers.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-icon">🚚</span>
          <h3>Nessun fornitore trovato</h3>
          <p>Inizia aggiungendo il tuo primo fornitore</p>
          <button 
            className="btn primary" 
            onClick={handleAddSupplier}
          >
            + Aggiungi Primo Fornitore
          </button>
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowModal(false);
            setEditingSupplier(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingSupplier(null);
            fetchSuppliers();
          }}
        />
      )}
    </div>
  );
}

// Modal Component per aggiungere/modificare fornitore
function SupplierModal({ supplier, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    vat_number: '',
    tax_code: '',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Italia',
    payment_terms: '',
    discount_percentage: 0,
    delivery_days: '',
    min_order_amount: 0,
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

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    }

    if (formData.vat_number && !/^[A-Z]{2}[0-9]{11}$/.test(formData.vat_number.replace(/\s/g, ''))) {
      newErrors.vat_number = 'P.IVA deve essere nel formato IT12345678901';
    }

    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      newErrors.discount_percentage = 'Sconto deve essere tra 0 e 100%';
    }

    if (formData.min_order_amount < 0) {
      newErrors.min_order_amount = 'Importo minimo non può essere negativo';
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
      const url = supplier 
        ? `http://localhost:3000/api/suppliers/${supplier.id}`
        : 'http://localhost:3000/api/suppliers';
      
      const method = supplier ? 'PUT' : 'POST';
      
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Rimuovi errore quando l'utente corregge
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h3>{supplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">❌ {error}</div>
            )}

            <div className="form-sections">
              {/* Informazioni base */}
              <div className="form-section">
                <h4>📝 Informazioni Base</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nome Fornitore *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`form-input ${errors.name ? 'error' : ''}`}
                      required
                    />
                    {errors.name && <span className="error-message">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ragione Sociale</label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Partita IVA</label>
                    <input
                      type="text"
                      name="vat_number"
                      value={formData.vat_number}
                      onChange={handleChange}
                      className={`form-input ${errors.vat_number ? 'error' : ''}`}
                      placeholder="IT12345678901"
                    />
                    {errors.vat_number && <span className="error-message">{errors.vat_number}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Codice Fiscale</label>
                    <input
                      type="text"
                      name="tax_code"
                      value={formData.tax_code}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Contatti */}
              <div className="form-section">
                <h4>📞 Contatti</h4>
                <div className="form-row">
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

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`form-input ${errors.email ? 'error' : ''}`}
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>
                </div>

                <div className="form-row">
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

                  <div className="form-group">
                    <label className="form-label">Cellulare</label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sito Web</label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              {/* Indirizzo */}
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

              {/* Condizioni commerciali */}
              <div className="form-section">
                <h4>💰 Condizioni Commerciali</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Termini di Pagamento</label>
                    <input
                      type="text"
                      name="payment_terms"
                      value={formData.payment_terms}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="es. 30 giorni, Bonifico immediato"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sconto (%)</label>
                    <input
                      type="number"
                      name="discount_percentage"
                      value={formData.discount_percentage}
                      onChange={handleChange}
                      className={`form-input ${errors.discount_percentage ? 'error' : ''}`}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    {errors.discount_percentage && <span className="error-message">{errors.discount_percentage}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Giorni di Consegna</label>
                    <input
                      type="text"
                      name="delivery_days"
                      value={formData.delivery_days}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="es. 2-3 giorni, Settimanale"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Importo Minimo Ordine (€)</label>
                    <input
                      type="number"
                      name="min_order_amount"
                      value={formData.min_order_amount}
                      onChange={handleChange}
                      className={`form-input ${errors.min_order_amount ? 'error' : ''}`}
                      min="0"
                      step="0.01"
                    />
                    {errors.min_order_amount && <span className="error-message">{errors.min_order_amount}</span>}
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="3"
                    placeholder="Note aggiuntive sul fornitore..."
                  />
                </div>

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                  />
                  <label className="checkbox-label">Fornitore attivo</label>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Salvando...' : supplier ? 'Aggiorna' : 'Crea Fornitore'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}