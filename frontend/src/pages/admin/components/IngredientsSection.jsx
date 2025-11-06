import { useState, useEffect } from "react";
import "./IngredientsSection.css";

export default function IngredientsSection() {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [storageTypes, setStorageTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    supplier: 'all',
    storage_type: 'all',
    active: true
  });

  // Carica dati iniziali
  useEffect(() => {
    fetchIngredients();
    fetchCategories();
    fetchSuppliers();
    fetchStorageTypes();
  }, []);

  // Aggiorna quando cambiano i filtri
  useEffect(() => {
    fetchIngredients();
  }, [filters]);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.supplier !== 'all') params.append('supplier', filters.supplier);
      if (filters.storage_type !== 'all') params.append('storage_type', filters.storage_type);
      params.append('active', filters.active.toString());
      
      const response = await fetch(`http://localhost:3000/api/ingredients?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setIngredients(data.ingredients || []);
      console.log(`✅ Loaded ${data.ingredients?.length || 0} ingredients`);
      
    } catch (err) {
      console.error('❌ Error fetching ingredients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ingredients/categories', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('❌ Error fetching categories:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ingredients/suppliers', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error('❌ Error fetching suppliers:', err);
    }
  };

  const fetchStorageTypes = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ingredients/storage-types', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStorageTypes(data.storageTypes || []);
      }
    } catch (err) {
      console.error('❌ Error fetching storage types:', err);
    }
  };

  const handleDeleteIngredient = async (id, name) => {
    if (!confirm(`Sei sicuro di voler eliminare "${name}"?`)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/ingredients/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nell\'eliminazione');
      }
      
      await fetchIngredients();
      console.log(`✅ Deleted ingredient: ${name}`);
      
    } catch (err) {
      console.error('❌ Error deleting ingredient:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const handleEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setShowModal(true);
  };

  const handleAddIngredient = () => {
    setEditingIngredient(null);
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getCategoryLabel = (value) => {
    const category = categories.find(cat => cat.value === value);
    return category ? category.label : value;
  };

  const getStorageTypeLabel = (value) => {
    const storageType = storageTypes.find(type => type.value === value);
    return storageType ? storageType.label : value;
  };

  const getStorageIcon = (storageType) => {
    switch (storageType) {
      case 'ambient': return '🌡️';
      case 'refrigerated': return '❄️';
      case 'frozen': return '🧊';
      default: return '📦';
    }
  };

  if (loading) {
    return (
      <div className="ingredients-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento ingredienti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ingredients-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🥕 Gestione Ingredienti</h2>
          <p className="section-subtitle">
            {ingredients.length} ingredienti catalogati
            {ingredients.filter(i => !i.active).length > 0 && 
              ` • ${ingredients.filter(i => !i.active).length} disattivati`
            }
          </p>
        </div>
        <button className="btn primary" onClick={handleAddIngredient}>
          ➕ Aggiungi Ingrediente
        </button>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca ingredienti, barcode, codice fornitore..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutte le categorie</option>
          {categories.map(category => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>

        <select
          value={filters.supplier}
          onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti i fornitori</option>
          {suppliers.map(supplier => (
            <option key={supplier} value={supplier}>{supplier}</option>
          ))}
        </select>

        <select
          value={filters.storage_type}
          onChange={(e) => setFilters(prev => ({ ...prev, storage_type: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti i tipi storage</option>
          {storageTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.active}
            onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.checked }))}
          />
          Solo attivi
        </label>
      </div>

      {/* Errori */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Tabella ingredienti */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Categoria</th>
              <th>Unità & Densità</th>
              <th>Costo</th>
              <th>Fornitore</th>
              <th>Storage & Durata</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map(ingredient => (
              <tr key={ingredient.id} className={!ingredient.active ? 'inactive' : ''}>
                <td>
                  <div className="ingredient-info">
                    <div className="ingredient-main">
                      <span className="ingredient-name">{ingredient.name}</span>
                      {ingredient.barcode && (
                        <span className="ingredient-barcode">📊 {ingredient.barcode}</span>
                      )}
                    </div>
                    {ingredient.description && (
                      <span className="ingredient-description">{ingredient.description}</span>
                    )}
                    {ingredient.supplier_code && (
                      <span className="supplier-code">Cod: {ingredient.supplier_code}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="category-badge">{getCategoryLabel(ingredient.category)}</span>
                </td>
                <td>
                  <div className="unit-info">
                    <span className="unit">{ingredient.unit}</span>
                    {ingredient.density && ingredient.density !== 1.000 && (
                      <span className="density">ρ: {ingredient.density}</span>
                    )}
                  </div>
                </td>
                <td>{formatCurrency(ingredient.cost_per_unit)}</td>
                <td>{ingredient.supplier || 'N/A'}</td>
                <td>
                  <div className="storage-info">
                    <span className="storage-type">
                      {getStorageIcon(ingredient.storage_type)} {getStorageTypeLabel(ingredient.storage_type)}
                    </span>
                    <span className="shelf-life">⏱️ {ingredient.shelf_life_days}gg</span>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${ingredient.active ? 'active' : 'inactive'}`}>
                    {ingredient.active ? '✅ Attivo' : '❌ Disattivo'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-small primary" 
                      onClick={() => handleEditIngredient(ingredient)}
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
                      onClick={() => handleDeleteIngredient(ingredient.id, ingredient.name)}
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
      {ingredients.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-icon">🥕</span>
          <h3>Nessun ingrediente trovato</h3>
          <p>Inizia aggiungendo il tuo primo ingrediente al sistema</p>
          <button className="btn primary" onClick={handleAddIngredient}>
            ➕ Aggiungi Primo Ingrediente
          </button>
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <IngredientModal
          ingredient={editingIngredient}
          categories={categories}
          suppliers={suppliers}
          storageTypes={storageTypes}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchIngredients();
          }}
        />
      )}
    </div>
  );
}

// Modal Component
function IngredientModal({ ingredient, categories, suppliers, storageTypes, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    unit: 'g',
    density: 1.000,
    cost_per_unit: '',
    supplier: '',
    supplier_code: '',
    barcode: '',
    shelf_life_days: 30,
    storage_type: 'ambient',
    allergen_info: null,
    nutritional_info: null,
    active: true,
    ...ingredient
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = ingredient 
        ? `http://localhost:3000/api/ingredients/${ingredient.id}`
        : 'http://localhost:3000/api/ingredients';
      
      const method = ingredient ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nel salvataggio');
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
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>{ingredient ? 'Modifica Ingrediente' : 'Nuovo Ingrediente'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">❌ {error}</div>
            )}

            <div className="form-grid">
              {/* Informazioni base */}
              <div className="form-section">
                <h4>📝 Informazioni Base</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nome *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Categoria *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descrizione</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="2"
                  />
                </div>
              </div>

              {/* Unità e costi */}
              <div className="form-section">
                <h4>💰 Unità e Costi</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unità *</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="g">Grammi (g)</option>
                      <option value="kg">Kilogrammi (kg)</option>
                      <option value="ml">Millilitri (ml)</option>
                      <option value="l">Litri (l)</option>
                      <option value="pz">Pezzi (pz)</option>
                      <option value="conf">Confezioni (conf)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Densità</label>
                    <input
                      type="number"
                      name="density"
                      value={formData.density}
                      onChange={handleChange}
                      className="form-input"
                      step="0.001"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Costo per unità (€)</label>
                    <input
                      type="number"
                      name="cost_per_unit"
                      value={formData.cost_per_unit}
                      onChange={handleChange}
                      className="form-input"
                      step="0.0001"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Fornitore */}
              <div className="form-section">
                <h4>🏪 Fornitore</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fornitore</label>
                    <select
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="">Seleziona fornitore</option>
                      {suppliers.map(supplier => (
                        <option key={supplier} value={supplier}>{supplier}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Codice Fornitore</label>
                    <input
                      type="text"
                      name="supplier_code"
                      value={formData.supplier_code}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Barcode</label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div className="form-section">
                <h4>🏪 Conservazione</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tipo Storage</label>
                    <select
                      name="storage_type"
                      value={formData.storage_type}
                      onChange={handleChange}
                      className="form-select"
                    >
                      {storageTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Durata (giorni)</label>
                    <input
                      type="number"
                      name="shelf_life_days"
                      value={formData.shelf_life_days}
                      onChange={handleChange}
                      className="form-input"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-checkbox">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <label className="checkbox-label">Ingrediente attivo</label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Salvando...' : ingredient ? 'Aggiorna' : 'Crea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}