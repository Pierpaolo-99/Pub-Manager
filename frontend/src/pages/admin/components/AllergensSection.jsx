import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import "./AllergensSection.css";

export default function AllergensSection() {
  const { isAuthenticated } = useAuth();
  const [allergens, setAllergens] = useState([]);
  const [filteredAllergens, setFilteredAllergens] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // ✅ ALIGNED API CALLS
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllergens();
      fetchStats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    filterAllergens();
  }, [allergens, searchTerm, activeFilter]);

  const fetchAllergens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ CORRECT API CALL - NO BEARER TOKEN
      const response = await fetch('/api/allergens', {
        method: 'GET',
        credentials: 'include', // ✅ SESSION-BASED AUTH
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // ✅ HANDLE CORRECT RESPONSE FORMAT
      if (data.success && data.allergens) {
        setAllergens(data.allergens);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
      
    } catch (err) {
      console.error('❌ Error fetching allergens:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/allergens/stats', {
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

  const filterAllergens = () => {
    let filtered = allergens;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(allergen =>
        allergen.name.toLowerCase().includes(term) ||
        (allergen.description && allergen.description.toLowerCase().includes(term))
      );
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(allergen => allergen.active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(allergen => !allergen.active);
    }

    setFilteredAllergens(filtered);
  };

  const createAllergen = async (allergenData) => {
    try {
      const response = await fetch('/api/allergens', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(allergenData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione');
      }

      const data = await response.json();
      if (data.success) {
        // Ricarica la lista
        await fetchAllergens();
        await fetchStats();
        return true;
      }
      throw new Error(data.error || 'Errore nella creazione');
    } catch (err) {
      console.error('❌ Error creating allergen:', err);
      setError(err.message);
      return false;
    }
  };

  const updateAllergen = async (id, allergenData) => {
    try {
      const response = await fetch(`/api/allergens/${id}`, {
        method: 'PATCH', // ✅ CORRECT METHOD
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(allergenData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }

      const data = await response.json();
      if (data.success) {
        await fetchAllergens();
        await fetchStats();
        return true;
      }
      throw new Error(data.error || 'Errore nell\'aggiornamento');
    } catch (err) {
      console.error('❌ Error updating allergen:', err);
      setError(err.message);
      return false;
    }
  };

  const deleteAllergen = async (id) => {
    try {
      const response = await fetch(`/api/allergens/${id}`, {
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
        await fetchAllergens();
        await fetchStats();
        return true;
      }
      throw new Error(data.error || 'Errore nell\'eliminazione');
    } catch (err) {
      console.error('❌ Error deleting allergen:', err);
      setError(err.message);
      return false;
    }
  };

  // ✅ SIMPLIFIED STATISTICS (ALIGNED WITH BACKEND)
  const getLocalStats = () => {
    const total = allergens.length;
    const active = allergens.filter(a => a.active).length;
    const inactive = total - active;
    
    return {
      total_allergens: total,
      active_allergens: active,
      inactive_allergens: inactive
    };
  };

  const localStats = getLocalStats();

  if (loading) {
    return (
      <div className="allergens-section">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento allergeni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="allergens-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>⚠️ Gestione Allergeni</h2>
          <p className="section-subtitle">
            {localStats.total_allergens} allergeni totali • 
            {localStats.active_allergens} attivi • 
            {localStats.inactive_allergens} inattivi
          </p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista griglia"
            >
              ⊞
            </button>
            <button 
              className={`btn-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              ☰
            </button>
          </div>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Aggiungi Allergene
          </button>
        </div>
      </div>

      {/* ✅ ALIGNED STATISTICS */}
      <div className="allergens-stats">
        <div className="stat-card primary">
          <span className="stat-icon">⚠️</span>
          <div>
            <div className="stat-number">{localStats.total_allergens}</div>
            <div className="stat-label">Totali</div>
          </div>
        </div>
        <div className="stat-card success">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{localStats.active_allergens}</div>
            <div className="stat-label">Attivi</div>
          </div>
        </div>
        <div className="stat-card secondary">
          <span className="stat-icon">❌</span>
          <div>
            <div className="stat-number">{localStats.inactive_allergens}</div>
            <div className="stat-label">Inattivi</div>
          </div>
        </div>
        {stats.products_with_allergens && (
          <div className="stat-card info">
            <span className="stat-icon">🔗</span>
            <div>
              <div className="stat-number">{stats.products_with_allergens}</div>
              <div className="stat-label">Prodotti Collegati</div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ SIMPLIFIED FILTERS */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca allergene per nome o descrizione..."
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
          <option value="active">Solo attivi</option>
          <option value="inactive">Solo inattivi</option>
        </select>

        {(searchTerm || activeFilter !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("all");
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

      {/* ✅ ALIGNED ALLERGENS LIST */}
      {filteredAllergens.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <h3>Nessun allergene trovato</h3>
          <p>
            {allergens.length === 0 
              ? "Inizia aggiungendo il primo allergene"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
          {allergens.length === 0 && (
            <button 
              className="btn primary"
              onClick={() => setShowAddModal(true)}
            >
              Aggiungi Primo Allergene
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* ✅ ALIGNED GRID VIEW */
            <div className="allergens-grid">
              {filteredAllergens.map(allergen => (
                <div key={allergen.id} className={`allergen-card ${allergen.active ? 'active' : 'inactive'}`}>
                  <div className="allergen-header">
                    <div className="allergen-title">
                      <span 
                        className="allergen-icon"
                        style={{ backgroundColor: allergen.color }}
                      >
                        {allergen.icon}
                      </span>
                      <h3>{allergen.name}</h3>
                    </div>
                    <div className="allergen-badges">
                      <span className={`status-badge ${allergen.active ? 'active' : 'inactive'}`}>
                        {allergen.active ? '✅ Attivo' : '❌ Inattivo'}
                      </span>
                    </div>
                  </div>

                  <div className="allergen-info">
                    {allergen.description && (
                      <div className="allergen-description">
                        <span className="description-icon">📝</span>
                        <span className="description-text">{allergen.description}</span>
                      </div>
                    )}
                    
                    <div className="info-item">
                      <span className="label">Creato:</span>
                      <span className="value">
                        {new Date(allergen.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>

                  <div className="allergen-actions">
                    <button 
                      className="btn-small primary"
                      onClick={() => setEditingAllergen(allergen)}
                      title="Modifica allergene"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-small danger"
                      onClick={() => setShowDeleteModal(allergen)}
                      title="Elimina allergene"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ✅ ALIGNED LIST VIEW */
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Allergene</th>
                    <th>Descrizione</th>
                    <th>Stato</th>
                    <th>Data Creazione</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllergens.map(allergen => (
                    <tr key={allergen.id} className={`allergen-row ${allergen.active ? 'active' : 'inactive'}`}>
                      <td>
                        <div className="allergen-cell-info">
                          <span 
                            className="allergen-icon"
                            style={{ backgroundColor: allergen.color }}
                          >
                            {allergen.icon}
                          </span>
                          <strong>{allergen.name}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="description-cell">
                          {allergen.description || <span className="text-muted">-</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${allergen.active ? 'active' : 'inactive'}`}>
                          {allergen.active ? '✅ Attivo' : '❌ Inattivo'}
                        </span>
                      </td>
                      <td>
                        <span className="date-cell">
                          {new Date(allergen.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-small primary"
                            onClick={() => setEditingAllergen(allergen)}
                            title="Modifica"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-small danger"
                            onClick={() => setShowDeleteModal(allergen)}
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
          )}
        </>
      )}

      {/* ✅ ALIGNED MODALS */}
      {(showAddModal || editingAllergen) && (
        <AllergenModal
          allergen={editingAllergen}
          onClose={() => {
            setShowAddModal(false);
            setEditingAllergen(null);
            setError(null);
          }}
          onSave={async (allergenData) => {
            const success = editingAllergen 
              ? await updateAllergen(editingAllergen.id, allergenData)
              : await createAllergen(allergenData);
            
            if (success) {
              setShowAddModal(false);
              setEditingAllergen(null);
            }
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          allergen={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={async () => {
            const success = await deleteAllergen(showDeleteModal.id);
            if (success) {
              setShowDeleteModal(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ✅ ALIGNED MODAL COMPONENT
function AllergenModal({ allergen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: allergen?.name || '',
    description: allergen?.description || '',
    icon: allergen?.icon || '⚠️',
    color: allergen?.color || '#EF4444',
    active: allergen?.active ?? true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome allergene è obbligatorio';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve essere di almeno 2 caratteri';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nome non può superare i 100 caratteri';
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
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const commonIcons = ['⚠️', '🥜', '🥛', '🥚', '🌾', '🦐', '🐟', '🍯', '🌰', '🫘'];

  return (
    <div className="modal-overlay">
      <div className="modal-content allergen-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {allergen ? `Modifica ${allergen.name}` : 'Nuovo Allergene'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Allergene *</label>
            <input
              type="text"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              value={formData.name}
              onChange={handleChange}
              placeholder="Es. Glutine, Lattosio, Arachidi..."
              required
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
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
                  placeholder="⚠️"
                />
                <div className="icon-suggestions">
                  {commonIcons.map(icon => (
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

          <div className="form-group">
            <label className="form-label">Descrizione</label>
            <textarea
              name="description"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Descrizione dettagliata dell'allergene..."
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <span>Allergene attivo</span>
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
              {saving ? 'Salvando...' : (allergen ? 'Aggiorna' : 'Crea Allergene')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ ALIGNED DELETE MODAL
function DeleteConfirmModal({ allergen, onClose, onConfirm }) {
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
          <h4>Eliminare l'allergene "{allergen.name}"?</h4>
          <p>
            Questa azione è irreversibile. L'allergene verrà rimosso 
            da tutti i prodotti associati.
          </p>
          <div className="allergen-preview">
            <span 
              className="allergen-icon-preview"
              style={{ backgroundColor: allergen.color }}
            >
              {allergen.icon}
            </span>
            <div className="allergen-details">
              <div className="allergen-name">{allergen.name}</div>
              {allergen.description && (
                <div className="allergen-description">{allergen.description}</div>
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