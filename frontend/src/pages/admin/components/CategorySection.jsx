import { useState, useEffect } from "react";
import "./CategorySection.css"; // Importa il CSS specifico

export default function CategorySection() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    totalProducts: 0
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    filterCategories();
    calculateStats();
  }, [categories, searchTerm]);

  const loadCategories = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3000/api/categories', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        setError('Errore nel caricamento categorie');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    let filtered = categories;

    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCategories(filtered);
  };

  const calculateStats = () => {
    const totalCategories = categories.length;
    const activeCategories = categories.filter(cat => cat.active !== false).length;
    const totalProducts = categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0);

    setStats({
      totalCategories,
      activeCategories,
      totalProducts
    });
  };

  const deleteCategory = async (id, categoryName) => {
    if (!window.confirm(`Sei sicuro di voler eliminare la categoria "${categoryName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setCategories(categories.filter(category => category.id !== id));
        alert('Categoria eliminata con successo');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Errore nell\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Errore di rete');
    }
  };

  const toggleCategoryStatus = async (id, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/categories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ active: !currentStatus })
      });

      if (response.ok) {
        setCategories(categories.map(category => 
          category.id === id ? { ...category, active: !currentStatus } : category
        ));
        alert(`Categoria ${!currentStatus ? 'attivata' : 'disattivata'} con successo`);
      } else {
        alert('Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating category status:', error);
      alert('Errore di rete');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Caricamento categorie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <h3>Errore nel caricamento</h3>
        <p>{error}</p>
        <button className="btn primary" onClick={loadCategories}>
          Riprova
        </button>
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
            {stats.totalCategories} categorie • {stats.activeCategories} attive • {stats.totalProducts} prodotti associati
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowAddModal(true)}
        >
          + Aggiungi Categoria
        </button>
      </div>

      {/* Statistiche rapide */}
      <div className="categories-stats">
        <div className="stat-card mini">
          <span className="stat-icon">📁</span>
          <div>
            <div className="stat-number">{stats.totalCategories}</div>
            <div className="stat-label">Categorie Totali</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{stats.activeCategories}</div>
            <div className="stat-label">Attive</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">🍺</span>
          <div>
            <div className="stat-number">{stats.totalProducts}</div>
            <div className="stat-label">Prodotti</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">📊</span>
          <div>
            <div className="stat-number">
              {stats.totalCategories > 0 ? Math.round(stats.totalProducts / stats.totalCategories) : 0}
            </div>
            <div className="stat-label">Media per Categoria</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca categorie..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        {searchTerm && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => setSearchTerm("")}
          >
            Pulisci Ricerca
          </button>
        )}
      </div>

      {/* Contenuto principale */}
      {filteredCategories.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📁</span>
          <h3>Nessuna categoria trovata</h3>
          <p>
            {categories.length === 0 
              ? "Inizia creando le prime categorie per organizzare i prodotti"
              : "Nessuna categoria corrisponde alla ricerca"
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
          onDelete={deleteCategory}
          onToggleStatus={toggleCategoryStatus}
        />
      )}

      {/* Modal Aggiungi/Modifica Categoria */}
      {(showAddModal || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowAddModal(false);
            setEditingCategory(null);
          }}
          onSave={(savedCategory) => {
            if (editingCategory) {
              setCategories(categories.map(c => 
                c.id === savedCategory.id ? savedCategory : c
              ));
            } else {
              setCategories([...categories, savedCategory]);
            }
            setShowAddModal(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}

// Componente Griglia Categorie
function CategoriesGrid({ categories, onEdit, onDelete, onToggleStatus }) {
  return (
    <div className="categories-grid">
      {categories.map(category => (
        <CategoryCard
          key={category.id}
          category={category}
          onEdit={() => onEdit(category)}
          onDelete={() => onDelete(category.id, category.name)}
          onToggleStatus={() => onToggleStatus(category.id, category.active)}
        />
      ))}
    </div>
  );
}

// Componente Card Categoria
function CategoryCard({ category, onEdit, onDelete, onToggleStatus }) {
  const isActive = category.active !== false; // Default a true se non specificato

  return (
    <div className={`category-card ${!isActive ? 'inactive' : ''}`}>
      <div className="category-header">
        <div className="category-icon-container">
          <span className="category-icon-large">
            {category.icon || '📁'}
          </span>
        </div>
        
        <div className="category-status">
          <button
            className={`status-btn ${isActive ? 'active' : 'inactive'}`}
            onClick={onToggleStatus}
            title={isActive ? 'Disattiva categoria' : 'Attiva categoria'}
          >
            {isActive ? '✅' : '❌'}
          </button>
        </div>
      </div>

      <div className="category-content">
        <h3 className="category-name">{category.name}</h3>
        
        {category.description && (
          <p className="category-description">{category.description}</p>
        )}

        <div className="category-stats">
          <div className="stat-item">
            <span className="stat-label">Prodotti:</span>
            <span className="stat-value">{category.product_count || 0}</span>
          </div>
          {category.created_at && (
            <div className="stat-item">
              <span className="stat-label">Creata:</span>
              <span className="stat-value">
                {new Date(category.created_at).toLocaleDateString('it-IT')}
              </span>
            </div>
          )}
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
            className="btn-small secondary"
            onClick={() => alert('Visualizza prodotti - da implementare')}
            title="Visualizza prodotti"
          >
            👁️ Prodotti
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

// Modal per aggiungere/modificare categoria
function CategoryModal({ category, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    icon: category?.icon || '📁',
    active: category?.active ?? true
  });
  const [saving, setSaving] = useState(false);

  // Icone suggerite per le categorie
  const suggestedIcons = [
    '🍺', '🍷', '🥃', '🍹', '☕', '🥤',
    '🍝', '🍕', '🍖', '🥩', '🐟', '🍗',
    '🥗', '🍤', '🍱', '🌮', '🥪', '🍰',
    '🧀', '🥖', '🍎', '🥨', '🍯', '📁'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!formData.name.trim()) {
      alert('Il nome della categoria è obbligatorio');
      setSaving(false);
      return;
    }

    try {
      const url = category 
        ? `http://localhost:3000/api/categories/${category.id}`
        : 'http://localhost:3000/api/categories';
      
      const method = category ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const savedCategory = await response.json();
        onSave(savedCategory);
        alert(category ? 'Categoria aggiornata!' : 'Categoria creata!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Errore nel salvare la categoria');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Errore di rete');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const selectIcon = (icon) => {
    setFormData({ ...formData, icon });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
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
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="es. Birre, Primi Piatti, Dolci..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrizione</label>
            <textarea
              name="description"
              className="form-textarea"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Descrizione della categoria (opzionale)"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Icona</label>
            <div className="icon-selector">
              <div className="current-icon">
                <span className="selected-icon">{formData.icon}</span>
                <input
                  type="text"
                  name="icon"
                  className="icon-input"
                  value={formData.icon}
                  onChange={handleChange}
                  placeholder="📁"
                  maxLength="2"
                />
              </div>
              
              <div className="suggested-icons">
                <p className="icons-label">Icone suggerite:</p>
                <div className="icons-grid">
                  {suggestedIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => selectIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <span className="checkbox-label">Categoria attiva</span>
            </label>
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