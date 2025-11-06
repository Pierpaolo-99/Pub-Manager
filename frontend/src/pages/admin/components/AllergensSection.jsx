import { useState, useEffect } from "react";
import "./AllergensSection.css";

export default function AllergensSection() {
  const [allergens, setAllergens] = useState([]);
  const [filteredAllergens, setFilteredAllergens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Carica allergeni dal backend
  useEffect(() => {
    fetchAllergens();
  }, []);

  // Filtra allergeni quando cambiano i filtri
  useEffect(() => {
    filterAllergens();
  }, [allergens, searchTerm, filterType]);

  const fetchAllergens = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/allergens', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento degli allergeni');
      }

      const data = await response.json();
      setAllergens(data);
      setError(null);
    } catch (err) {
      console.error('Errore:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAllergens = () => {
    let filtered = allergens;

    // Filtro per testo
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(allergen =>
        allergen.name.toLowerCase().includes(term) ||
        allergen.description?.toLowerCase().includes(term) ||
        allergen.code?.toLowerCase().includes(term)
      );
    }

    // Filtro per tipo
    if (filterType) {
      filtered = filtered.filter(allergen => allergen.type === filterType);
    }

    setFilteredAllergens(filtered);
  };

  const createAllergen = async (allergenData) => {
    try {
      const response = await fetch('/api/allergens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(allergenData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nella creazione dell\'allergene');
      }

      const newAllergen = await response.json();
      setAllergens([...allergens, newAllergen]);
      return true;
    } catch (err) {
      console.error('Errore:', err);
      setError(err.message);
      return false;
    }
  };

  const updateAllergen = async (id, allergenData) => {
    try {
      const response = await fetch(`/api/allergens/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(allergenData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nell\'aggiornamento dell\'allergene');
      }

      const updatedAllergen = await response.json();
      setAllergens(allergens.map(a => a.id === id ? updatedAllergen : a));
      return true;
    } catch (err) {
      console.error('Errore:', err);
      setError(err.message);
      return false;
    }
  };

  const deleteAllergen = async (id) => {
    try {
      const response = await fetch(`/api/allergens/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nell\'eliminazione dell\'allergene');
      }

      setAllergens(allergens.filter(a => a.id !== id));
      return true;
    } catch (err) {
      console.error('Errore:', err);
      setError(err.message);
      return false;
    }
  };

  const getAllergenIcon = (type) => {
    const icons = {
      'cereali': '🌾',
      'crostacei': '🦐',
      'uova': '🥚',
      'pesce': '🐟',
      'arachidi': '🥜',
      'soia': '🫘',
      'latte': '🥛',
      'frutta_guscio': '🌰',
      'sedano': '🥬',
      'senape': '🌿',
      'sesamo': '🌰',
      'solfiti': '⚗️',
      'lupi': '🌾',
      'molluschi': '🐚',
      'altro': '⚠️'
    };
    return icons[type] || '⚠️';
  };

  const getAllergenTypeLabel = (type) => {
    const labels = {
      'cereali': 'Cereali contenenti glutine',
      'crostacei': 'Crostacei',
      'uova': 'Uova',
      'pesce': 'Pesce',
      'arachidi': 'Arachidi',
      'soia': 'Soia',
      'latte': 'Latte e derivati',
      'frutta_guscio': 'Frutta a guscio',
      'sedano': 'Sedano',
      'senape': 'Senape',
      'sesamo': 'Semi di sesamo',
      'solfiti': 'Solfiti',
      'lupi': 'Lupini',
      'molluschi': 'Molluschi',
      'altro': 'Altro'
    };
    return labels[type] || type;
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      'basso': 'success',
      'medio': 'warning',
      'alto': 'danger',
      'critico': 'critical'
    };
    return colors[level] || 'secondary';
  };

  const getRiskLevelIcon = (level) => {
    const icons = {
      'basso': '🟢',
      'medio': '🟡',
      'alto': '🟠',
      'critico': '🔴'
    };
    return icons[level] || '⚪';
  };

  const getUniqueTypes = () => {
    return [...new Set(allergens.map(a => a.type))];
  };

  const getStatistics = () => {
    const total = allergens.length;
    const byRisk = allergens.reduce((acc, allergen) => {
      acc[allergen.risk_level] = (acc[allergen.risk_level] || 0) + 1;
      return acc;
    }, {});
    
    const activeCount = allergens.filter(a => a.is_active).length;
    const inactiveCount = total - activeCount;

    return { total, byRisk, activeCount, inactiveCount };
  };

  const stats = getStatistics();

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
            {stats.total} allergeni totali • {stats.activeCount} attivi • {stats.inactiveCount} inattivi
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

      {/* Statistiche rapide */}
      <div className="allergens-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">{stats.byRisk.basso || 0}</div>
            <div className="stat-label">Basso Rischio</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">🟡</span>
          <div>
            <div className="stat-number">{stats.byRisk.medio || 0}</div>
            <div className="stat-label">Medio Rischio</div>
          </div>
        </div>
        <div className="stat-card mini danger">
          <span className="stat-icon">🟠</span>
          <div>
            <div className="stat-number">{stats.byRisk.alto || 0}</div>
            <div className="stat-label">Alto Rischio</div>
          </div>
        </div>
        <div className="stat-card mini critical">
          <span className="stat-icon">🔴</span>
          <div>
            <div className="stat-number">{stats.byRisk.critico || 0}</div>
            <div className="stat-label">Critico</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{stats.activeCount}</div>
            <div className="stat-label">Attivi</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca allergene per nome, descrizione, codice..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tutti i tipi</option>
          {getUniqueTypes().map(type => (
            <option key={type} value={type}>
              {getAllergenIcon(type)} {getAllergenTypeLabel(type)}
            </option>
          ))}
        </select>

        {(searchTerm || filterType) && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setFilterType("");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Messaggi di errore */}
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

      {/* Lista Allergeni */}
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
            /* Vista Griglia */
            <div className="allergens-grid">
              {filteredAllergens.map(allergen => (
                <div key={allergen.id} className={`allergen-card ${allergen.is_active ? 'active' : 'inactive'}`}>
                  <div className="allergen-header">
                    <div className="allergen-title">
                      <span className="allergen-icon">
                        {getAllergenIcon(allergen.type)}
                      </span>
                      <h3>{allergen.name}</h3>
                    </div>
                    <div className="allergen-badges">
                      <span className={`risk-badge ${getRiskLevelColor(allergen.risk_level)}`}>
                        {getRiskLevelIcon(allergen.risk_level)} {allergen.risk_level}
                      </span>
                      <span className={`status-badge ${allergen.is_active ? 'active' : 'inactive'}`}>
                        {allergen.is_active ? '✅ Attivo' : '❌ Inattivo'}
                      </span>
                    </div>
                  </div>

                  <div className="allergen-info">
                    <div className="info-item">
                      <span className="label">Tipo:</span>
                      <span className="value">{getAllergenTypeLabel(allergen.type)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Codice:</span>
                      <span className="value">{allergen.code || '-'}</span>
                    </div>
                    {allergen.description && (
                      <div className="allergen-description">
                        <span className="description-icon">📝</span>
                        <span className="description-text">{allergen.description}</span>
                      </div>
                    )}
                    {allergen.regulations && (
                      <div className="allergen-regulations">
                        <span className="regulations-icon">📋</span>
                        <span className="regulations-text">{allergen.regulations}</span>
                      </div>
                    )}
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
                      className="btn-small secondary"
                      onClick={() => {/* Visualizza prodotti associati */}}
                      title="Prodotti associati"
                    >
                      🔗
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
            /* Vista Lista */
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Allergene</th>
                    <th>Tipo</th>
                    <th>Codice</th>
                    <th>Rischio</th>
                    <th>Stato</th>
                    <th>Descrizione</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllergens.map(allergen => (
                    <tr key={allergen.id} className={`allergen-row ${allergen.is_active ? 'active' : 'inactive'}`}>
                      <td>
                        <div className="allergen-cell-info">
                          <span className="allergen-icon">
                            {getAllergenIcon(allergen.type)}
                          </span>
                          <strong>{allergen.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="type-badge">
                          {getAllergenTypeLabel(allergen.type)}
                        </span>
                      </td>
                      <td>
                        <code className="allergen-code">{allergen.code || '-'}</code>
                      </td>
                      <td>
                        <span className={`risk-badge ${getRiskLevelColor(allergen.risk_level)}`}>
                          {getRiskLevelIcon(allergen.risk_level)} {allergen.risk_level}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${allergen.is_active ? 'active' : 'inactive'}`}>
                          {allergen.is_active ? '✅ Attivo' : '❌ Inattivo'}
                        </span>
                      </td>
                      <td>
                        <div className="description-cell">
                          {allergen.description || <span className="text-muted">-</span>}
                        </div>
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
                            className="btn-small secondary"
                            onClick={() => {/* Visualizza prodotti */}}
                            title="Prodotti"
                          >
                            🔗
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

      {/* Modal Aggiungi/Modifica Allergene */}
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
          existingCodes={allergens.filter(a => a.id !== editingAllergen?.id).map(a => a.code).filter(Boolean)}
        />
      )}

      {/* Modal Conferma Eliminazione */}
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

// Modal per aggiungere/modificare allergene
function AllergenModal({ allergen, onClose, onSave, existingCodes }) {
  const [formData, setFormData] = useState({
    name: allergen?.name || '',
    type: allergen?.type || 'altro',
    code: allergen?.code || '',
    description: allergen?.description || '',
    regulations: allergen?.regulations || '',
    risk_level: allergen?.risk_level || 'medio',
    is_active: allergen?.is_active ?? true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const allergenTypes = [
    { value: 'cereali', label: '🌾 Cereali contenenti glutine' },
    { value: 'crostacei', label: '🦐 Crostacei' },
    { value: 'uova', label: '🥚 Uova' },
    { value: 'pesce', label: '🐟 Pesce' },
    { value: 'arachidi', label: '🥜 Arachidi' },
    { value: 'soia', label: '🫘 Soia' },
    { value: 'latte', label: '🥛 Latte e derivati' },
    { value: 'frutta_guscio', label: '🌰 Frutta a guscio' },
    { value: 'sedano', label: '🥬 Sedano' },
    { value: 'senape', label: '🌿 Senape' },
    { value: 'sesamo', label: '🌰 Semi di sesamo' },
    { value: 'solfiti', label: '⚗️ Solfiti' },
    { value: 'lupi', label: '🌾 Lupini' },
    { value: 'molluschi', label: '🐚 Molluschi' },
    { value: 'altro', label: '⚠️ Altro' }
  ];

  const riskLevels = [
    { value: 'basso', label: '🟢 Basso' },
    { value: 'medio', label: '🟡 Medio' },
    { value: 'alto', label: '🟠 Alto' },
    { value: 'critico', label: '🔴 Critico' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome allergene è obbligatorio';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve essere di almeno 2 caratteri';
    }

    if (formData.code && existingCodes.includes(formData.code)) {
      newErrors.code = 'Codice già esistente';
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
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome Allergene *</label>
              <input
                type="text"
                name="name"
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={handleChange}
                placeholder="Es. Glutine, Lattosio..."
                required
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Codice</label>
              <input
                type="text"
                name="code"
                className={`form-input ${errors.code ? 'error' : ''}`}
                value={formData.code}
                onChange={handleChange}
                placeholder="Es. GLU, LAT..."
              />
              {errors.code && <span className="error-message">{errors.code}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo Allergene *</label>
              <select
                name="type"
                className="form-select"
                value={formData.type}
                onChange={handleChange}
                required
              >
                {allergenTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Livello di Rischio *</label>
              <select
                name="risk_level"
                className="form-select"
                value={formData.risk_level}
                onChange={handleChange}
                required
              >
                {riskLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
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
            <label className="form-label">Normative</label>
            <textarea
              name="regulations"
              className="form-textarea"
              value={formData.regulations}
              onChange={handleChange}
              rows="2"
              placeholder="Riferimenti normativi (es. Reg. UE 1169/2011)..."
            />
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
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

// Modal conferma eliminazione
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
          <div className="allergen-info">
            <span className="allergen-detail">Tipo: {allergen.type}</span>
            <span className="allergen-detail">Codice: {allergen.code || 'N/A'}</span>
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