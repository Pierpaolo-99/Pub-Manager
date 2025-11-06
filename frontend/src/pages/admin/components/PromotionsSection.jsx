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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'table'

  // Stati per il form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage', // percentage, fixed_amount, happy_hour, buy_x_get_y
    discount_value: '',
    min_quantity: 1,
    max_uses: null,
    valid_from: '',
    valid_until: '',
    is_active: true,
    applies_to: 'all', // all, category, product
    target_category_id: null,
    target_product_id: null,
    days_of_week: [], // ['monday', 'tuesday', etc.]
    time_from: '',
    time_until: '',
    conditions: {
      min_amount: '',
      max_discount: '',
      combinable: false
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      
      const [promotionsRes, productsRes, categoriesRes] = await Promise.all([
        fetch('http://localhost:3000/api/promotions', { credentials: 'include' }),
        fetch('http://localhost:3000/api/products', { credentials: 'include' }),
        fetch('http://localhost:3000/api/categories', { credentials: 'include' })
      ]);

      if (promotionsRes.ok) {
        const promotionsData = await promotionsRes.json();
        setPromotions(promotionsData);
      }
      
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
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
        body: JSON.stringify({
          ...formData,
          conditions: JSON.stringify(formData.conditions),
          days_of_week: JSON.stringify(formData.days_of_week)
        }),
      });

      if (response.ok) {
        await loadData();
        setShowModal(false);
        resetForm();
      } else {
        setError('Errore nel salvataggio della promozione');
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      setError('Errore nel salvataggio della promozione');
    }
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      ...promotion,
      conditions: typeof promotion.conditions === 'string' 
        ? JSON.parse(promotion.conditions || '{}')
        : promotion.conditions || {},
      days_of_week: typeof promotion.days_of_week === 'string'
        ? JSON.parse(promotion.days_of_week || '[]')
        : promotion.days_of_week || [],
      valid_from: promotion.valid_from ? new Date(promotion.valid_from).toISOString().split('T')[0] : '',
      valid_until: promotion.valid_until ? new Date(promotion.valid_until).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa promozione?')) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/promotions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadData();
      } else {
        setError('Errore nell\'eliminazione della promozione');
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      setError('Errore nell\'eliminazione della promozione');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/promotions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        await loadData();
      } else {
        setError('Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error toggling promotion status:', error);
      setError('Errore nell\'aggiornamento dello stato');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      discount_value: '',
      min_quantity: 1,
      max_uses: null,
      valid_from: '',
      valid_until: '',
      is_active: true,
      applies_to: 'all',
      target_category_id: null,
      target_product_id: null,
      days_of_week: [],
      time_from: '',
      time_until: '',
      conditions: {
        min_amount: '',
        max_discount: '',
        combinable: false
      }
    });
    setEditingPromotion(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('conditions.')) {
      const conditionKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          [conditionKey]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  // Filtri
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promotion.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && promotion.is_active) ||
                         (statusFilter === 'inactive' && !promotion.is_active);
    
    const matchesType = typeFilter === 'all' || promotion.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Statistiche
  const stats = {
    total: promotions.length,
    active: promotions.filter(p => p.is_active).length,
    expired: promotions.filter(p => p.valid_until && new Date(p.valid_until) < new Date()).length,
    upcoming: promotions.filter(p => p.valid_from && new Date(p.valid_from) > new Date()).length
  };

  if (loading) {
    return (
      <div className="promotions-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <h3>Caricamento Promozioni</h3>
          <p>Raccolta dati in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="promotions-section">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Errore nel caricamento</h3>
          <p>{error}</p>
          <button className="btn primary" onClick={loadData}>
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="promotions-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-content">
          <h2>🏷️ Gestione Promozioni</h2>
          <p className="section-subtitle">
            Crea e gestisci sconti, happy hour e offerte speciali
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
          <option value="happy_hour">Happy Hour</option>
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

// Componente Vista Griglia
function PromotionsGrid({ promotions, categories, products, onEdit, onDelete, onToggleActive }) {
  const getTargetName = (promotion) => {
    if (promotion.applies_to === 'category' && promotion.target_category_id) {
      const category = categories.find(c => c.id === promotion.target_category_id);
      return category ? `Categoria: ${category.name}` : 'Categoria sconosciuta';
    }
    if (promotion.applies_to === 'product' && promotion.target_product_id) {
      const product = products.find(p => p.id === promotion.target_product_id);
      return product ? `Prodotto: ${product.name}` : 'Prodotto sconosciuto';
    }
    return 'Tutti i prodotti';
  };

  const getTypeLabel = (type) => {
    const types = {
      'percentage': 'Percentuale',
      'fixed_amount': 'Importo fisso',
      'happy_hour': 'Happy Hour',
      'buy_x_get_y': 'Compra X prendi Y'
    };
    return types[type] || type;
  };

  const getDiscountText = (promotion) => {
    switch (promotion.type) {
      case 'percentage':
        return `${promotion.discount_value}%`;
      case 'fixed_amount':
        return `€${promotion.discount_value}`;
      case 'happy_hour':
        return `${promotion.discount_value}%`;
      case 'buy_x_get_y':
        return `Compra ${promotion.min_quantity} prendi 1`;
      default:
        return promotion.discount_value;
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
          className={`promotion-card ${!promotion.is_active ? 'inactive' : ''} ${isExpired(promotion.valid_until) ? 'expired' : ''}`}
        >
          <div className="promotion-header">
            <div className="promotion-type">
              <span className={`type-badge ${promotion.type}`}>
                {getTypeLabel(promotion.type)}
              </span>
              <div className="promotion-status">
                <button 
                  className={`status-toggle ${promotion.is_active ? 'active' : 'inactive'}`}
                  onClick={() => onToggleActive(promotion.id, promotion.is_active)}
                  title={promotion.is_active ? 'Disattiva' : 'Attiva'}
                >
                  {promotion.is_active ? '🟢' : '🔴'}
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
            <p className="promotion-description">{promotion.description}</p>
            
            <div className="promotion-details">
              <div className="detail-item">
                <span className="detail-label">Applica a:</span>
                <span className="detail-value">{getTargetName(promotion)}</span>
              </div>
              
              {promotion.valid_from && (
                <div className="detail-item">
                  <span className="detail-label">Da:</span>
                  <span className="detail-value">
                    {new Date(promotion.valid_from).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
              
              {promotion.valid_until && (
                <div className="detail-item">
                  <span className="detail-label">Fino:</span>
                  <span className={`detail-value ${isExpired(promotion.valid_until) ? 'expired' : ''}`}>
                    {new Date(promotion.valid_until).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}

              {promotion.max_uses && (
                <div className="detail-item">
                  <span className="detail-label">Usi max:</span>
                  <span className="detail-value">{promotion.max_uses}</span>
                </div>
              )}
            </div>

            {promotion.days_of_week && promotion.days_of_week.length > 0 && (
              <div className="promotion-schedule">
                <span className="schedule-label">Giorni:</span>
                <div className="days-list">
                  {JSON.parse(promotion.days_of_week).map(day => (
                    <span key={day} className="day-tag">{day.slice(0, 3)}</span>
                  ))}
                </div>
              </div>
            )}

            {(promotion.time_from || promotion.time_until) && (
              <div className="promotion-time">
                <span className="time-label">Orario:</span>
                <span className="time-value">
                  {promotion.time_from} - {promotion.time_until}
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
              onClick={() => onDelete(promotion.id)}
            >
              🗑️ Elimina
            </button>
          </div>

          {isExpired(promotion.valid_until) && (
            <div className="expiry-banner">
              ⏰ Scaduta
            </div>
          )}

          {isUpcoming(promotion.valid_from) && (
            <div className="upcoming-banner">
              🕒 Programmata
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Componente Vista Tabella
function PromotionsTable({ promotions, categories, products, onEdit, onDelete, onToggleActive }) {
  const getTargetName = (promotion) => {
    if (promotion.applies_to === 'category' && promotion.target_category_id) {
      const category = categories.find(c => c.id === promotion.target_category_id);
      return category ? `${category.name}` : 'Categoria sconosciuta';
    }
    if (promotion.applies_to === 'product' && promotion.target_product_id) {
      const product = products.find(p => p.id === promotion.target_product_id);
      return product ? `${product.name}` : 'Prodotto sconosciuto';
    }
    return 'Tutti';
  };

  const getTypeLabel = (type) => {
    const types = {
      'percentage': 'Percentuale',
      'fixed_amount': 'Importo fisso',
      'happy_hour': 'Happy Hour',
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
            <th>Sconto</th>
            <th>Applica a</th>
            <th>Validità</th>
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
                  <div className="promotion-description">{promotion.description}</div>
                </div>
              </td>
              <td>
                <span className={`type-badge small ${promotion.type}`}>
                  {getTypeLabel(promotion.type)}
                </span>
              </td>
              <td className="promotion-discount">
                {promotion.type === 'percentage' && `${promotion.discount_value}%`}
                {promotion.type === 'fixed_amount' && `€${promotion.discount_value}`}
                {promotion.type === 'happy_hour' && `${promotion.discount_value}%`}
                {promotion.type === 'buy_x_get_y' && `${promotion.min_quantity}+1`}
              </td>
              <td>{getTargetName(promotion)}</td>
              <td>
                <div className="validity-period">
                  {promotion.valid_from && (
                    <div>Da: {new Date(promotion.valid_from).toLocaleDateString('it-IT')}</div>
                  )}
                  {promotion.valid_until && (
                    <div>A: {new Date(promotion.valid_until).toLocaleDateString('it-IT')}</div>
                  )}
                  {!promotion.valid_from && !promotion.valid_until && 'Sempre valida'}
                </div>
              </td>
              <td>
                <button 
                  className={`status-toggle ${promotion.is_active ? 'active' : 'inactive'}`}
                  onClick={() => onToggleActive(promotion.id, promotion.is_active)}
                >
                  <span className="status-dot"></span>
                  {promotion.is_active ? 'Attiva' : 'Inattiva'}
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
                    onClick={() => onDelete(promotion.id)}
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

// Componente Modal
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
                placeholder="Es: Happy Hour del Venerdì"
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
                <option value="happy_hour">Happy Hour</option>
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
                {formData.type === 'percentage' || formData.type === 'happy_hour' ? 'Percentuale Sconto (%)' : 
                 formData.type === 'fixed_amount' ? 'Importo Sconto (€)' :
                 'Quantità Minima'}
              </label>
              <input
                type="number"
                name="discount_value"
                value={formData.discount_value}
                onChange={onInputChange}
                className="form-input"
                min="0"
                step={formData.type === 'percentage' || formData.type === 'happy_hour' ? "1" : "0.01"}
                required
              />
            </div>

            {formData.type !== 'buy_x_get_y' && (
              <div className="form-group">
                <label className="form-label">Quantità Minima</label>
                <input
                  type="number"
                  name="min_quantity"
                  value={formData.min_quantity}
                  onChange={onInputChange}
                  className="form-input"
                  min="1"
                />
              </div>
            )}
          </div>

          {/* Applicazione */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Applica a</label>
              <select
                name="applies_to"
                value={formData.applies_to}
                onChange={onInputChange}
                className="form-select"
              >
                <option value="all">Tutti i prodotti</option>
                <option value="category">Categoria specifica</option>
                <option value="product">Prodotto specifico</option>
              </select>
            </div>

            {formData.applies_to === 'category' && (
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select
                  name="target_category_id"
                  value={formData.target_category_id || ''}
                  onChange={onInputChange}
                  className="form-select"
                >
                  <option value="">Seleziona categoria</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.applies_to === 'product' && (
              <div className="form-group">
                <label className="form-label">Prodotto</label>
                <select
                  name="target_product_id"
                  value={formData.target_product_id || ''}
                  onChange={onInputChange}
                  className="form-select"
                >
                  <option value="">Seleziona prodotto</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - €{product.price}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Validità */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Valida da</label>
              <input
                type="date"
                name="valid_from"
                value={formData.valid_from}
                onChange={onInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valida fino</label>
              <input
                type="date"
                name="valid_until"
                value={formData.valid_until}
                onChange={onInputChange}
                className="form-input"
              />
            </div>
          </div>

          {/* Orari per Happy Hour */}
          {formData.type === 'happy_hour' && (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Orario inizio</label>
                <input
                  type="time"
                  name="time_from"
                  value={formData.time_from}
                  onChange={onInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Orario fine</label>
                <input
                  type="time"
                  name="time_until"
                  value={formData.time_until}
                  onChange={onInputChange}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {/* Giorni della settimana */}
          <div className="form-group">
            <label className="form-label">Giorni della settimana</label>
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
          </div>

          {/* Condizioni avanzate */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Importo minimo ordine (€)</label>
              <input
                type="number"
                name="conditions.min_amount"
                value={formData.conditions.min_amount}
                onChange={onInputChange}
                className="form-input"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sconto massimo (€)</label>
              <input
                type="number"
                name="conditions.max_discount"
                value={formData.conditions.max_discount}
                onChange={onInputChange}
                className="form-input"
                min="0"
                step="0.01"
                placeholder="Illimitato"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Numero massimo di usi</label>
            <input
              type="number"
              name="max_uses"
              value={formData.max_uses || ''}
              onChange={onInputChange}
              className="form-input"
              min="1"
              placeholder="Illimitato"
            />
          </div>

          {/* Opzioni */}
          <div className="form-checkbox">
            <input
              type="checkbox"
              id="combinable"
              name="conditions.combinable"
              checked={formData.conditions.combinable}
              onChange={onInputChange}
            />
            <label htmlFor="combinable" className="checkbox-label">
              Combinabile con altre promozioni
            </label>
          </div>

          <div className="form-checkbox">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={onInputChange}
            />
            <label htmlFor="is_active" className="checkbox-label">
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