import { useState, useEffect } from "react";
import "./PromotionsSection.css";

export default function PromotionsSection() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // ✅ FIXED: Form data allineato al backend
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage',
    value: '',                    // ✅ Corretto dal backend
    min_amount: '',              // ✅ Corretto dal backend
    max_discount: '',            // ✅ Corretto dal backend
    start_date: '',              // ✅ Corretto dal backend
    end_date: '',                // ✅ Corretto dal backend
    start_time: '',              // ✅ Corretto dal backend
    end_time: '',                // ✅ Corretto dal backend
    days_of_week: [],            // ✅ Corretto dal backend
    max_uses: '',                // ✅ Corretto dal backend
    active: true                 // ✅ Corretto dal backend
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [promotionsRes, productsRes, categoriesRes] = await Promise.all([
        fetch('http://localhost:3000/api/promotions', { credentials: 'include' }),
        fetch('http://localhost:3000/api/products', { credentials: 'include' }),
        fetch('http://localhost:3000/api/categories/active', { credentials: 'include' })
      ]);

      // ✅ FIXED: Gestione response corretta
      if (promotionsRes.ok) {
        const promotionsData = await promotionsRes.json();
        console.log('✅ Promotions loaded:', promotionsData);
        setPromotions(promotionsData.promotions || promotionsData || []);
      }
      
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        console.log('✅ Products loaded:', productsData);
        setProducts(productsData.products || productsData || []);
      }
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        console.log('✅ Categories loaded:', categoriesData);
        setCategories(categoriesData.categories || categoriesData || []);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Errore nel caricamento dei dati: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      // ✅ FIXED: Validazione frontend
      if (!formData.name || !formData.value) {
        setError('Nome e valore sono obbligatori');
        return;
      }

      // ✅ FIXED: Preparazione dati allineati al backend
      const submitData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        type: formData.type,
        value: parseFloat(formData.value),
        min_amount: parseFloat(formData.min_amount) || 0,
        max_discount: parseFloat(formData.max_discount) || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
        max_uses: parseInt(formData.max_uses) || null,
        active: formData.active
      };

      console.log('📤 Submitting promotion data:', submitData);
      
      const url = editingPromotion 
        ? `http://localhost:3000/api/promotions/${editingPromotion.id}`
        : 'http://localhost:3000/api/promotions';
      
      const method = editingPromotion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Promotion saved successfully');
        await loadData();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error(result.error || 'Errore nel salvataggio della promozione');
      }
    } catch (error) {
      console.error('❌ Error saving promotion:', error);
      setError(error.message);
    }
  };

  const handleEdit = (promotion) => {
    console.log('✏️ Editing promotion:', promotion);
    
    setEditingPromotion(promotion);
    
    // ✅ FIXED: Mappatura corretta dal backend al form
    setFormData({
      name: promotion.name || '',
      description: promotion.description || '',
      type: promotion.type || 'percentage',
      value: promotion.value || '',
      min_amount: promotion.min_amount || '',
      max_discount: promotion.max_discount || '',
      start_date: promotion.start_date ? new Date(promotion.start_date).toISOString().split('T')[0] : '',
      end_date: promotion.end_date ? new Date(promotion.end_date).toISOString().split('T')[0] : '',
      start_time: promotion.start_time || '',
      end_time: promotion.end_time || '',
      days_of_week: promotion.days_of_week ? (
        typeof promotion.days_of_week === 'string' 
          ? JSON.parse(promotion.days_of_week) 
          : promotion.days_of_week
      ) : [],
      max_uses: promotion.max_uses || '',
      active: promotion.active !== undefined ? promotion.active : true
    });
    
    setShowModal(true);
  };

  const handleDelete = async (id, promotionName) => {
    if (!confirm(`Sei sicuro di voler eliminare la promozione "${promotionName}"?`)) return;
    
    try {
      setError(null);
      
      const response = await fetch(`http://localhost:3000/api/promotions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Promotion deleted successfully');
        await loadData();
      } else {
        throw new Error(result.error || 'Errore nell\'eliminazione della promozione');
      }
    } catch (error) {
      console.error('❌ Error deleting promotion:', error);
      setError(error.message);
    }
  };

  const handleToggleActive = async (id, currentStatus, promotionName) => {
    try {
      setError(null);
      
      const response = await fetch(`http://localhost:3000/api/promotions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ active: currentStatus ? 0 : 1 }), // ✅ FIXED: 0/1 per boolean
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`✅ Promotion ${currentStatus ? 'deactivated' : 'activated'}: ${promotionName}`);
        await loadData();
      } else {
        throw new Error(result.error || 'Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('❌ Error toggling promotion status:', error);
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      value: '',
      min_amount: '',
      max_discount: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      days_of_week: [],
      max_uses: '',
      active: true
    });
    setEditingPromotion(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  // ✅ FIXED: Filtri corretti con dati backend
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = (promotion.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (promotion.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && promotion.active) ||
                         (statusFilter === 'inactive' && !promotion.active);
    
    const matchesType = typeFilter === 'all' || promotion.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // ✅ FIXED: Statistiche corrette
  const stats = {
    total: promotions.length,
    active: promotions.filter(p => p.active).length,
    expired: promotions.filter(p => p.end_date && new Date(p.end_date) < new Date()).length,
    upcoming: promotions.filter(p => p.start_date && new Date(p.start_date) > new Date()).length
  };

  if (loading) {
    return (
      <div className="promotions-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <h3>Caricamento Promozioni</h3>
          <p>Connessione al backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="promotions-section">
      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Header */}
      <div className="section-header">
        <div className="header-content">
          <h2>🏷️ Gestione Promozioni</h2>
          <p className="section-subtitle">
            {stats.total} promozioni • {stats.active} attive • {stats.expired} scadute
          </p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista griglia"
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista tabella"
            >
              ☰
            </button>
          </div>
          <button 
            className="btn primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            ➕ Nuova Promozione
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="promotions-stats">
        <div className="stat-card mini">
          <div className="stat-icon">🏷️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Totali</div>
          </div>
        </div>
        <div className="stat-card mini">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.active}</div>
            <div className="stat-label">Attive</div>
          </div>
        </div>
        <div className="stat-card mini">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-number">{stats.upcoming}</div>
            <div className="stat-label">Programmate</div>
          </div>
        </div>
        <div className="stat-card mini">
          <div className="stat-icon">⛔</div>
          <div className="stat-content">
            <div className="stat-number">{stats.expired}</div>
            <div className="stat-label">Scadute</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca promozioni..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Attive</option>
          <option value="inactive">Non attive</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">Tutti i tipi</option>
          <option value="percentage">Percentuale</option>
          <option value="fixed_amount">Importo fisso</option>
          <option value="buy_x_get_y">Compra X prendi Y</option>
        </select>

        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setTypeFilter('all');
            }}
          >
            ✖️ Pulisci filtri
          </button>
        )}
      </div>

      {/* Contenuto */}
      {filteredPromotions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏷️</span>
          <h3>Nessuna promozione trovata</h3>
          <p>
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Nessuna promozione corrisponde ai filtri selezionati.'
              : 'Non ci sono promozioni configurate. Crea la prima promozione per iniziare.'
            }
          </p>
          <button 
            className="btn primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            ➕ Crea Prima Promozione
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <PromotionsGrid 
          promotions={filteredPromotions}
          categories={categories}
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      ) : (
        <PromotionsTable 
          promotions={filteredPromotions}
          categories={categories}
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Modal */}
      {showModal && (
        <PromotionModal
          formData={formData}
          editingPromotion={editingPromotion}
          categories={categories}
          products={products}
          onInputChange={handleInputChange}
          onDayToggle={handleDayToggle}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        />
      )}
    </div>
  );
}

// ✅ FIXED: Componente Grid aggiornato
function PromotionsGrid({ promotions, categories, products, onEdit, onDelete, onToggleActive }) {
  const getTypeLabel = (type) => {
    const types = {
      'percentage': 'Percentuale',
      'fixed_amount': 'Importo fisso',
      'buy_x_get_y': 'Compra X prendi Y'
    };
    return types[type] || type;
  };

  const getDiscountText = (promotion) => {
    switch (promotion.type) {
      case 'percentage':
        return `${promotion.value}%`;
      case 'fixed_amount':
        return `€${promotion.value}`;
      case 'buy_x_get_y':
        return `Compra ${promotion.min_amount || 1} prendi 1`;
      default:
        return promotion.value;
    }
  };

  const isExpired = (dateString) => {
    return dateString && new Date(dateString) < new Date();
  };

  const isUpcoming = (dateString) => {
    return dateString && new Date(dateString) > new Date();
  };

  return (
    <div className="promotions-grid">
      {promotions.map(promotion => (
        <div 
          key={promotion.id} 
          className={`promotion-card ${!promotion.active ? 'inactive' : ''} ${isExpired(promotion.end_date) ? 'expired' : ''}`}
        >
          <div className="promotion-header">
            <div className="promotion-type">
              <span className={`type-badge ${promotion.type}`}>
                {getTypeLabel(promotion.type)}
              </span>
              <div className="promotion-status">
                <button 
                  className={`status-toggle ${promotion.active ? 'active' : 'inactive'}`}
                  onClick={() => onToggleActive(promotion.id, promotion.active, promotion.name)}
                  title={promotion.active ? 'Disattiva' : 'Attiva'}
                >
                  {promotion.active ? '🟢' : '🔴'}
                </button>
              </div>
            </div>
            <div className="promotion-discount">
              <span className="discount-value">{getDiscountText(promotion)}</span>
              <span className="discount-label">SCONTO</span>
            </div>
          </div>

          <div className="promotion-content">
            <h3 className="promotion-name">{promotion.name}</h3>
            {promotion.description && (
              <p className="promotion-description">{promotion.description}</p>
            )}
            
            <div className="promotion-details">
              {promotion.min_amount > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Ordine minimo:</span>
                  <span className="detail-value">€{promotion.min_amount}</span>
                </div>
              )}
              
              {promotion.start_date && (
                <div className="detail-item">
                  <span className="detail-label">Da:</span>
                  <span className="detail-value">
                    {new Date(promotion.start_date).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
              
              {promotion.end_date && (
                <div className="detail-item">
                  <span className="detail-label">Fino:</span>
                  <span className={`detail-value ${isExpired(promotion.end_date) ? 'expired' : ''}`}>
                    {new Date(promotion.end_date).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}

              {promotion.max_uses && (
                <div className="detail-item">
                  <span className="detail-label">Usi max:</span>
                  <span className="detail-value">{promotion.max_uses} ({promotion.current_uses || 0} usati)</span>
                </div>
              )}
            </div>

            {promotion.days_of_week && (
              <div className="promotion-schedule">
                <span className="schedule-label">Giorni:</span>
                <div className="days-list">
                  {(typeof promotion.days_of_week === 'string' 
                    ? JSON.parse(promotion.days_of_week) 
                    : promotion.days_of_week
                  ).map(day => (
                    <span key={day} className="day-tag">
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(promotion.start_time || promotion.end_time) && (
              <div className="promotion-time">
                <span className="time-label">Orario:</span>
                <span className="time-value">
                  {promotion.start_time || '00:00'} - {promotion.end_time || '23:59'}
                </span>
              </div>
            )}
          </div>

          <div className="promotion-actions">
            <button 
              className="btn-small secondary"
              onClick={() => onEdit(promotion)}
            >
              ✏️ Modifica
            </button>
            <button 
              className="btn-small danger"
              onClick={() => onDelete(promotion.id, promotion.name)}
            >
              🗑️ Elimina
            </button>
          </div>

          {isExpired(promotion.end_date) && (
            <div className="expiry-banner">
              ⏰ Scaduta
            </div>
          )}

          {isUpcoming(promotion.start_date) && (
            <div className="upcoming-banner">
              🕒 Programmata
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ✅ FIXED: Componente Table aggiornato
function PromotionsTable({ promotions, categories, products, onEdit, onDelete, onToggleActive }) {
  const getTypeLabel = (type) => {
    const types = {
      'percentage': 'Percentuale',
      'fixed_amount': 'Importo fisso',
      'buy_x_get_y': 'Compra X prendi Y'
    };
    return types[type] || type;
  };

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Valore</th>
            <th>Validità</th>
            <th>Utilizzi</th>
            <th>Stato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {promotions.map(promotion => (
            <tr key={promotion.id}>
              <td>
                <div className="promotion-info">
                  <div className="promotion-name">{promotion.name}</div>
                  {promotion.description && (
                    <div className="promotion-description">{promotion.description}</div>
                  )}
                </div>
              </td>
              <td>
                <span className={`type-badge small ${promotion.type}`}>
                  {getTypeLabel(promotion.type)}
                </span>
              </td>
              <td className="promotion-discount">
                {promotion.type === 'percentage' && `${promotion.value}%`}
                {promotion.type === 'fixed_amount' && `€${promotion.value}`}
                {promotion.type === 'buy_x_get_y' && `Min: ${promotion.min_amount || 1}`}
              </td>
              <td>
                <div className="validity-period">
                  {promotion.start_date && (
                    <div>Da: {new Date(promotion.start_date).toLocaleDateString('it-IT')}</div>
                  )}
                  {promotion.end_date && (
                    <div>A: {new Date(promotion.end_date).toLocaleDateString('it-IT')}</div>
                  )}
                  {!promotion.start_date && !promotion.end_date && 'Sempre valida'}
                </div>
              </td>
              <td>
                <div className="usage-info">
                  <span>{promotion.current_uses || 0}</span>
                  {promotion.max_uses && <span> / {promotion.max_uses}</span>}
                  {!promotion.max_uses && <span> / ∞</span>}
                </div>
              </td>
              <td>
                <button 
                  className={`status-toggle ${promotion.active ? 'active' : 'inactive'}`}
                  onClick={() => onToggleActive(promotion.id, promotion.active, promotion.name)}
                >
                  <span className="status-dot"></span>
                  {promotion.active ? 'Attiva' : 'Inattiva'}
                </button>
              </td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="btn-small secondary"
                    onClick={() => onEdit(promotion)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-small danger"
                    onClick={() => onDelete(promotion.id, promotion.name)}
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
  );
}

// ✅ FIXED: Modal aggiornato con campi backend
function PromotionModal({ formData, editingPromotion, categories, products, onInputChange, onDayToggle, onSubmit, onClose }) {
  const daysOfWeek = [
    { key: 'monday', label: 'Lunedì' },
    { key: 'tuesday', label: 'Martedì' },
    { key: 'wednesday', label: 'Mercoledì' },
    { key: 'thursday', label: 'Giovedì' },
    { key: 'friday', label: 'Venerdì' },
    { key: 'saturday', label: 'Sabato' },
    { key: 'sunday', label: 'Domenica' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">
            {editingPromotion ? '✏️ Modifica Promozione' : '➕ Nuova Promozione'}
          </h3>
          <button className="modal-close" onClick={onClose}>✖️</button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Informazioni base */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                className="form-input"
                placeholder="Es: Sconto del 20%"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo Promozione *</label>
              <select
                name="type"
                value={formData.type}
                onChange={onInputChange}
                className="form-select"
                required
              >
                <option value="percentage">Sconto Percentuale</option>
                <option value="fixed_amount">Sconto Fisso</option>
                <option value="buy_x_get_y">Compra X prendi Y</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrizione</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={onInputChange}
              className="form-textarea"
              placeholder="Descrizione dettagliata della promozione..."
            />
          </div>

          {/* Configurazione sconto */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                {formData.type === 'percentage' ? 'Percentuale Sconto (%)' : 
                 formData.type === 'fixed_amount' ? 'Importo Sconto (€)' :
                 'Quantità Minima per Omaggio'}
              </label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={onInputChange}
                className="form-input"
                min="0"
                step={formData.type === 'percentage' ? "1" : "0.01"}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ordine Minimo (€)</label>
              <input
                type="number"
                name="min_amount"
                value={formData.min_amount}
                onChange={onInputChange}
                className="form-input"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Limitazioni */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Sconto Massimo (€)</label>
              <input
                type="number"
                name="max_discount"
                value={formData.max_discount}
                onChange={onInputChange}
                className="form-input"
                min="0"
                step="0.01"
                placeholder="Illimitato"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Numero Massimo di Usi</label>
              <input
                type="number"
                name="max_uses"
                value={formData.max_uses}
                onChange={onInputChange}
                className="form-input"
                min="1"
                placeholder="Illimitato"
              />
            </div>
          </div>

          {/* Validità */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Valida da</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={onInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valida fino</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={onInputChange}
                className="form-input"
              />
            </div>
          </div>

          {/* Orari */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Orario inizio</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={onInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Orario fine</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={onInputChange}
                className="form-input"
              />
            </div>
          </div>

          {/* Giorni della settimana */}
          <div className="form-group">
            <label className="form-label">Giorni della settimana (opzionale)</label>
            <div className="days-grid">
              {daysOfWeek.map(day => (
                <div key={day.key} className="day-checkbox">
                  <input
                    type="checkbox"
                    id={day.key}
                    checked={formData.days_of_week.includes(day.key)}
                    onChange={() => onDayToggle(day.key)}
                  />
                  <label htmlFor={day.key} className="day-label">{day.label}</label>
                </div>
              ))}
            </div>
            <small style={{color: '#64748b', fontSize: '0.75rem'}}>
              Se non selezioni nessun giorno, la promozione sarà valida tutti i giorni
            </small>
          </div>

          {/* Stato */}
          <div className="form-checkbox">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={onInputChange}
            />
            <label htmlFor="active" className="checkbox-label">
              Attiva immediatamente
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary">
              {editingPromotion ? 'Aggiorna' : 'Crea'} Promozione
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}