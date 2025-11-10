import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import "./CategoriesSection.css";

export default function CategorySection() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("sort_order");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  // ✅ CORRECTED API CALLS
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      fetchStats();
    }
  }, [isAuthenticated, sortBy, sortOrder]);

  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm, activeFilter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ CORRECT API CALL WITH PARAMS
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: '100',
        offset: '0'
      });

      if (activeFilter !== 'all') {
        params.append('active', activeFilter === 'active' ? 'true' : 'false');
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/categories?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // ✅ CORRECT RESPONSE PARSING
      if (data.success && data.categories) {
        setCategories(data.categories);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
      
    } catch (err) {
      console.error('❌ Error fetching categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ USE BACKEND STATS ENDPOINT
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/categories/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const filterCategories = () => {
    let filtered = categories;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(term) ||
        (category.description && category.description.toLowerCase().includes(term))
      );
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(category => category.active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(category => !category.active);
    }

    setFilteredCategories(filtered);
  };

  const createCategory = async (categoryData) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione');
      }

      const data = await response.json();
      if (data.success) {
        // Ricarica categories e stats
        await fetchCategories();
        await fetchStats();
        return true;
      }
      throw new Error(data.error || 'Errore nella creazione');
    } catch (err) {
      console.error('❌ Error creating category:', err);
      setError(err.message);
      return false;
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      // ✅ CORRECT METHOD - PATCH not PUT
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }

      const data = await response.json();
      if (data.success) {
        await fetchCategories();
        await fetchStats();
        return true;
      }
      throw new Error(data.error || 'Errore nell\'aggiornamento');
    } catch (err) {
      console.error('❌ Error updating category:', err);
      setError(err.message);
      return false;
    }
  };

  const deleteCategory = async (id) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }

      const data = await response.json();
      if (data.success) {
        await fetchCategories();
        await fetchStats();
        return true;
      }
      throw new Error(data.error || 'Errore nell\'eliminazione');
    } catch (err) {
      console.error('❌ Error deleting category:', err);
      setError(err.message);
      return false;
    }
  };

  // ✅ BACKEND STATS (not calculated locally)
  const displayStats = {
    totalCategories: stats.total_categories || 0,
    activeCategories: stats.active_categories || 0,
    inactiveCategories: stats.inactive_categories || 0,
    totalProducts: stats.total_products_with_category || 0,
    productsWithoutCategory: stats.products_without_category || 0
  };

  if (loading) {
    return (
      <div className="categories-section">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento categorie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="categories-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>📁 Gestione Categorie</h2>
          <p className="section-subtitle">
            {displayStats.totalCategories} categorie • 
            {displayStats.activeCategories} attive • 
            {displayStats.totalProducts} prodotti associati
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowAddModal(true)}
        >
          + Aggiungi Categoria
        </button>
      </div>

      {/* ✅ BACKEND ALIGNED STATISTICS */}
      <div className="categories-stats">
        <div className="stat-card primary">
          <span className="stat-icon">📁</span>
          <div>
            <div className="stat-number">{displayStats.totalCategories}</div>
            <div className="stat-label">Totali</div>
          </div>
        </div>
        <div className="stat-card success">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{displayStats.activeCategories}</div>
            <div className="stat-label">Attive</div>
          </div>
        </div>
        <div className="stat-card secondary">
          <span className="stat-icon">❌</span>
          <div>
            <div className="stat-number">{displayStats.inactiveCategories}</div>
            <div className="stat-label">Inattive</div>
          </div>
        </div>
        <div className="stat-card info">
          <span className="stat-icon">🍺</span>
          <div>
            <div className="stat-number">{displayStats.totalProducts}</div>
            <div className="stat-label">Prodotti Collegati</div>
          </div>
        </div>
        {displayStats.productsWithoutCategory > 0 && (
          <div className="stat-card warning">
            <span className="stat-icon">⚠️</span>
            <div>
              <div className="stat-number">{displayStats.productsWithoutCategory}</div>
              <div className="stat-label">Senza Categoria</div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ ENHANCED FILTERS WITH BACKEND SUPPORT */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca categorie per nome o descrizione..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Solo attive</option>
          <option value="inactive">Solo inattive</option>
        </select>

        <select 
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="sort_order">Ordine personalizzato</option>
          <option value="name">Nome</option>
          <option value="created_at">Data creazione</option>
        </select>

        <button 
          className={`btn-toggle ${sortOrder === 'ASC' ? 'active' : ''}`}
          onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
          title="Cambia ordinamento"
        >
          {sortOrder === 'ASC' ? '⬆️' : '⬇️'}
        </button>

        {(searchTerm || activeFilter !== 'all' || sortBy !== 'sort_order') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("all");
              setSortBy("sort_order");
              setSortOrder("ASC");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">❌</span>
          <span>{error}</span>
          <button 
            className="error-close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* ✅ CATEGORIES DISPLAY */}
      {filteredCategories.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📁</span>
          <h3>Nessuna categoria trovata</h3>
          <p>
            {categories.length === 0 
              ? "Inizia creando le prime categorie per organizzare i prodotti"
              : "Nessuna categoria corrisponde ai filtri selezionati"
            }
          </p>
          {categories.length === 0 && (
            <div className="suggested-categories">
              <p><strong>Suggerimenti per iniziare:</strong></p>
              <div className="suggestions">
                <button 
                  className="suggestion-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  🍺 Birre
                </button>
                <button 
                  className="suggestion-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  🍝 Primi Piatti
                </button>
                <button 
                  className="suggestion-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  🥩 Secondi Piatti
                </button>
                <button 
                  className="suggestion-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  🍰 Dolci
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <CategoriesGrid 
          categories={filteredCategories}
          onEdit={setEditingCategory}
          onDelete={setShowDeleteModal}
        />
      )}

      {/* ✅ ALIGNED MODALS */}
      {(showAddModal || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowAddModal(false);
            setEditingCategory(null);
            setError(null);
          }}
          onSave={async (categoryData) => {
            const success = editingCategory 
              ? await updateCategory(editingCategory.id, categoryData)
              : await createCategory(categoryData);
            
            if (success) {
              setShowAddModal(false);
              setEditingCategory(null);
            }
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          category={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={async () => {
            const success = await deleteCategory(showDeleteModal.id);
            if (success) {
              setShowDeleteModal(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ✅ UPDATED CATEGORIES GRID
function CategoriesGrid({ categories, onEdit, onDelete }) {
  return (
    <div className="categories-grid">
      {categories.map(category => (
        <CategoryCard
          key={category.id}
          category={category}
          onEdit={() => onEdit(category)}
          onDelete={() => onDelete(category)}
        />
      ))}
    </div>
  );
}

// ✅ ENHANCED CATEGORY CARD WITH ALL BACKEND FIELDS
function CategoryCard({ category, onEdit, onDelete }) {
  return (
    <div className={`category-card ${!category.active ? 'inactive' : ''}`}>
      <div className="category-header">
        <div 
          className="category-icon-container"
          style={{ backgroundColor: category.color || '#6B7280' }}
        >
          <span className="category-icon-large">
            {category.icon || '📁'}
          </span>
        </div>
        
        <div className="category-status">
          <span className={`status-badge ${category.active ? 'active' : 'inactive'}`}>
            {category.active ? '✅ Attiva' : '❌ Inattiva'}
          </span>
        </div>
      </div>

      <div className="category-content">
        <h3 className="category-name">{category.name}</h3>
        
        {category.description && (
          <p className="category-description">{category.description}</p>
        )}

        <div className="category-info">
          <div className="info-item">
            <span className="label">Ordine:</span>
            <span className="value">{category.sort_order}</span>
          </div>
          <div className="info-item">
            <span className="label">Creata:</span>
            <span className="value">
              {new Date(category.created_at).toLocaleDateString('it-IT')}
            </span>
          </div>
        </div>

        <div className="category-actions">
          <button 
            className="btn-small primary"
            onClick={onEdit}
            title="Modifica categoria"
          >
            ✏️ Modifica
          </button>
          <button 
            className="btn-small danger"
            onClick={onDelete}
            title="Elimina categoria"
          >
            🗑️ Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ ALIGNED CATEGORY MODAL WITH ALL BACKEND FIELDS
function CategoryModal({ category, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    icon: category?.icon || '📁',
    color: category?.color || '#6B7280',
    sort_order: category?.sort_order || 0,
    active: category?.active ?? true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome categoria è obbligatorio';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nome troppo lungo (max 100 caratteri)';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Descrizione troppo lunga (max 500 caratteri)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
               name === 'sort_order' ? parseInt(value) || 0 : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const suggestedIcons = [
    '🍺', '🍷', '🥃', '🍹', '☕', '🥤',
    '🍝', '🍕', '🍖', '🥩', '🐟', '🍗',
    '🥗', '🍤', '🍱', '🌮', '🥪', '🍰',
    '🧀', '🥖', '🍎', '🥨', '🍯', '📁'
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content category-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {category ? `Modifica ${category.name}` : 'Nuova Categoria'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Categoria *</label>
            <input
              type="text"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              value={formData.name}
              onChange={handleChange}
              placeholder="es. Birre, Primi Piatti, Dolci..."
              required
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Descrizione</label>
            <textarea
              name="description"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Descrizione della categoria (opzionale)"
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Icona</label>
              <div className="icon-selector">
                <input
                  type="text"
                  name="icon"
                  className="form-input icon-input"
                  value={formData.icon}
                  onChange={handleChange}
                  placeholder="📁"
                  maxLength="2"
                />
                <div className="icon-suggestions">
                  {suggestedIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-btn ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Colore</label>
              <input
                type="color"
                name="color"
                className="form-input color-input"
                value={formData.color}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ordine di Visualizzazione</label>
              <input
                type="number"
                name="sort_order"
                className="form-input"
                value={formData.sort_order}
                onChange={handleChange}
                min="0"
                placeholder="0"
              />
              <small className="form-hint">Numero più basso = apparirà prima</small>
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <span>Categoria attiva</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn secondary" 
              onClick={onClose}
              disabled={saving}
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className="btn primary"
              disabled={saving}
            >
              {saving ? 'Salvando...' : (category ? 'Aggiorna' : 'Crea Categoria')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ DELETE CONFIRMATION MODAL
function DeleteConfirmModal({ category, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content delete-modal">
        <div className="modal-header">
          <h3 className="modal-title">Conferma Eliminazione</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="delete-content">
          <div className="warning-icon">⚠️</div>
          <h4>Eliminare la categoria "{category.name}"?</h4>
          <p>
            Questa azione è irreversibile. La categoria verrà rimossa
            definitivamente dal sistema.
          </p>
          <div className="category-preview">
            <span 
              className="category-icon-preview"
              style={{ backgroundColor: category.color }}
            >
              {category.icon}
            </span>
            <div className="category-details">
              <div className="category-name">{category.name}</div>
              {category.description && (
                <div className="category-description">{category.description}</div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="btn secondary" 
            onClick={onClose}
            disabled={deleting}
          >
            Annulla
          </button>
          <button 
            className="btn danger" 
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Elimina Definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}