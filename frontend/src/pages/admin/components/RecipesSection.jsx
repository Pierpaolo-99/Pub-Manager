import { useState, useEffect } from "react";
import "./RecipesSection.css";

export default function RecipesSection() {
  const [recipes, setRecipes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    difficulty: 'all',
    active: 'all'
  });

  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    fetchRecipes();
    fetchProducts();
    fetchIngredients();
  }, [filters]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`http://localhost:3000/api/recipes?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setRecipes(data.recipes || []);
      setStats(data.summary || {});
      
    } catch (err) {
      console.error('❌ Error fetching recipes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/recipes/products', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('❌ Error fetching products:', err);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ingredients?active=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients || []);
      }
    } catch (err) {
      console.error('❌ Error fetching ingredients:', err);
    }
  };

  const handleAddRecipe = () => {
    setEditingRecipe(null);
    setShowModal(true);
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setShowModal(true);
  };

  const handleViewRecipe = async (recipe) => {
    try {
      const response = await fetch(`http://localhost:3000/api/recipes/${recipe.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const detailData = await response.json();
        setViewingRecipe(detailData);
      }
    } catch (err) {
      console.error('❌ Error fetching recipe details:', err);
      alert('Errore nel caricamento dettagli ricetta');
    }
  };

  const handleDeleteRecipe = async (id, recipeName) => {
    if (!confirm(`Sei sicuro di voler eliminare la ricetta "${recipeName}"?`)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/recipes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }
      
      await fetchRecipes();
      alert(`Ricetta "${recipeName}" eliminata con successo`);
      
    } catch (err) {
      console.error('❌ Error deleting recipe:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'easy': 'success',
      'medium': 'warning', 
      'hard': 'danger'
    };
    return colors[difficulty] || 'secondary';
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      'easy': 'Facile',
      'medium': 'Media',
      'hard': 'Difficile'
    };
    return labels[difficulty] || difficulty;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatTime = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="recipes-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento ricette...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recipes-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>📝 Gestione Ricette</h2>
          <p className="section-subtitle">
            {stats.total || 0} ricette • {stats.active || 0} attive • 
            Costo medio: {formatCurrency(stats.avgCost)} • 
            Tempo medio: {formatTime(stats.avgTime)}
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={handleAddRecipe}
        >
          ➕ Crea Ricetta
        </button>
      </div>

      {/* Stats rapide */}
      <div className="recipe-stats">
        <div className="stat-card success">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">{stats.easy || 0}</div>
            <div className="stat-label">Facili</div>
          </div>
        </div>
        <div className="stat-card warning">
          <span className="stat-icon">🟡</span>
          <div>
            <div className="stat-number">{stats.medium || 0}</div>
            <div className="stat-label">Medie</div>
          </div>
        </div>
        <div className="stat-card danger">
          <span className="stat-icon">🔴</span>
          <div>
            <div className="stat-number">{stats.hard || 0}</div>
            <div className="stat-label">Difficili</div>
          </div>
        </div>
        <div className="stat-card info">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">{formatCurrency(stats.avgCost)}</div>
            <div className="stat-label">Costo Medio</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca ricette, prodotti..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          value={filters.difficulty}
          onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutte le difficoltà</option>
          <option value="easy">Facile</option>
          <option value="medium">Media</option>
          <option value="hard">Difficile</option>
        </select>

        <select
          value={filters.active}
          onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
          className="filter-select"
        >
          <option value="all">Tutti gli stati</option>
          <option value="true">Solo attive</option>
          <option value="false">Solo inattive</option>
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

      {/* Grid ricette */}
      <div className="recipes-grid">
        {recipes.map(recipe => (
          <div key={recipe.id} className={`recipe-card ${!recipe.active ? 'inactive' : ''}`}>
            <div className="recipe-header">
              <div className="recipe-title">
                <h3>{recipe.name}</h3>
                <span className="product-name">{recipe.product_name}</span>
              </div>
              <span className={`difficulty-badge ${getDifficultyColor(recipe.difficulty)}`}>
                {getDifficultyLabel(recipe.difficulty)}
              </span>
            </div>
            
            <div className="recipe-info">
              <div className="info-row">
                <span className="info-label">👥 Porzione:</span>
                <span>{recipe.portion_size || 1} persone</span>
              </div>
              <div className="info-row">
                <span className="info-label">🥗 Ingredienti:</span>
                <span>{recipe.ingredient_count}</span>
              </div>
              <div className="info-row">
                <span className="info-label">⏱️ Tempo:</span>
                <span>{formatTime((recipe.preparation_time || 0) + (recipe.cooking_time || 0))}</span>
              </div>
              <div className="info-row">
                <span className="info-label">💰 Costo:</span>
                <span className="cost-amount">{formatCurrency(recipe.total_cost)}</span>
              </div>
              {recipe.version > 1 && (
                <div className="info-row">
                  <span className="info-label">🔄 Versione:</span>
                  <span>{recipe.version}</span>
                </div>
              )}
            </div>

            {recipe.description && (
              <div className="recipe-description">
                {recipe.description.length > 100 
                  ? `${recipe.description.substring(0, 100)}...`
                  : recipe.description
                }
              </div>
            )}

            <div className="recipe-actions">
              <button 
                className="btn-small primary"
                onClick={() => handleViewRecipe(recipe)}
                title="Visualizza"
              >
                👁️
              </button>
              <button 
                className="btn-small secondary"
                onClick={() => handleEditRecipe(recipe)}
                title="Modifica"
              >
                ✏️
              </button>
              <button 
                className="btn-small info"
                onClick={() => {/* TODO: Duplica ricetta */}}
                title="Duplica"
              >
                📋
              </button>
              <button 
                className="btn-small success"
                onClick={() => {/* TODO: Stampa ricetta */}}
                title="Stampa"
              >
                🖨️
              </button>
              <button 
                className="btn-small danger"
                onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                title="Elimina"
              >
                🗑️
              </button>
            </div>

            {!recipe.active && (
              <div className="inactive-overlay">
                <span>Ricetta Disattivata</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {recipes.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h3>Nessuna ricetta trovata</h3>
          <p>Inizia creando la tua prima ricetta</p>
          <button 
            className="btn primary" 
            onClick={handleAddRecipe}
          >
            ➕ Crea Prima Ricetta
          </button>
        </div>
      )}

      {/* Modal Create/Edit Recipe */}
      {showModal && (
        <RecipeModal
          recipe={editingRecipe}
          products={products}
          ingredients={ingredients}
          onClose={() => {
            setShowModal(false);
            setEditingRecipe(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingRecipe(null);
            fetchRecipes();
          }}
        />
      )}

      {/* Modal View Recipe */}
      {viewingRecipe && (
        <RecipeViewModal
          recipe={viewingRecipe}
          onClose={() => setViewingRecipe(null)}
          onEdit={() => {
            setEditingRecipe(viewingRecipe);
            setViewingRecipe(null);
            setShowModal(true);
          }}
        />
      )}
    </div>
  );
}

// Modal per creare/modificare ricetta
function RecipeModal({ recipe, products, ingredients, onClose, onSave }) {
  const [formData, setFormData] = useState({
    product_variant_id: '',
    name: '',
    description: '',
    portion_size: 1,
    preparation_time: 0,
    cooking_time: 0,
    difficulty: 'medium',
    instructions: '',
    chef_notes: '',
    active: true,
    ingredients: [],
    ...recipe
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = recipe 
        ? `http://localhost:3000/api/recipes/${recipe.id}`
        : 'http://localhost:3000/api/recipes';
      
      const method = recipe ? 'PUT' : 'POST';
      
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
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        ingredient_id: '',
        quantity: '',
        unit: 'g',
        notes: '',
        is_optional: false,
        preparation_step: prev.ingredients.length + 1,
        cost_per_unit: 0
      }]
    }));
  };

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => 
        i === index ? { ...ingredient, [field]: value } : ingredient
      )
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h3>{recipe ? 'Modifica Ricetta' : 'Nuova Ricetta'}</h3>
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
                <h4>📋 Informazioni Base</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prodotto *</label>
                    <select
                      name="product_variant_id"
                      value={formData.product_variant_id}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">Seleziona prodotto</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.product_name} - {product.name} ({formatCurrency(product.price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nome Ricetta *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descrizione</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Porzioni</label>
                    <input
                      type="number"
                      name="portion_size"
                      value={formData.portion_size}
                      onChange={handleChange}
                      className="form-input"
                      min="0.1"
                      step="0.1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tempo Preparazione (min)</label>
                    <input
                      type="number"
                      name="preparation_time"
                      value={formData.preparation_time}
                      onChange={handleChange}
                      className="form-input"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tempo Cottura (min)</label>
                    <input
                      type="number"
                      name="cooking_time"
                      value={formData.cooking_time}
                      onChange={handleChange}
                      className="form-input"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficoltà</label>
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="easy">Facile</option>
                      <option value="medium">Media</option>
                      <option value="hard">Difficile</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ingredienti */}
              <div className="form-section">
                <div className="section-header-inline">
                  <h4>🥗 Ingredienti</h4>
                  <button type="button" className="btn-small primary" onClick={addIngredient}>
                    ➕ Aggiungi Ingrediente
                  </button>
                </div>

                <div className="ingredients-list">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="ingredient-row">
                      <div className="ingredient-fields">
                        <select
                          value={ingredient.ingredient_id}
                          onChange={(e) => updateIngredient(index, 'ingredient_id', e.target.value)}
                          className="form-select"
                          required
                        >
                          <option value="">Seleziona ingrediente</option>
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={ingredient.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                          placeholder="Quantità"
                          className="form-input"
                          step="0.001"
                          required
                        />

                        <select
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          className="form-select"
                          required
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="pz">pz</option>
                          <option value="conf">conf</option>
                          <option value="cucchiai">cucchiai</option>
                          <option value="cucchiaini">cucchiaini</option>
                        </select>

                        <input
                          type="text"
                          value={ingredient.notes}
                          onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                          placeholder="Note (es. a dadini, tritato...)"
                          className="form-input"
                        />

                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            checked={ingredient.is_optional}
                            onChange={(e) => updateIngredient(index, 'is_optional', e.target.checked)}
                          />
                          Opzionale
                        </label>
                      </div>

                      <button
                        type="button"
                        className="btn-small danger"
                        onClick={() => removeIngredient(index)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Istruzioni */}
              <div className="form-section">
                <h4>📝 Istruzioni e Note</h4>
                <div className="form-group">
                  <label className="form-label">Istruzioni di Preparazione</label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="5"
                    placeholder="Descrivi passo passo come preparare la ricetta..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Note dello Chef</label>
                  <textarea
                    name="chef_notes"
                    value={formData.chef_notes}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="3"
                    placeholder="Consigli, varianti, note particolari..."
                  />
                </div>

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                  />
                  <label className="checkbox-label">Ricetta attiva</label>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Salvando...' : recipe ? 'Aggiorna Ricetta' : 'Crea Ricetta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal per visualizzare ricetta
function RecipeViewModal({ recipe, onClose, onEdit }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatTime = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      'easy': 'Facile',
      'medium': 'Media',
      'hard': 'Difficile'
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>📖 {recipe.name}</h3>
          <div className="header-actions">
            <button className="btn-small primary" onClick={onEdit}>
              ✏️ Modifica
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="recipe-details">
            {/* Info principale */}
            <div className="details-section">
              <h4>ℹ️ Informazioni Generali</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Prodotto:</label>
                  <span>{recipe.product_name}</span>
                </div>
                <div className="detail-item">
                  <label>Porzioni:</label>
                  <span>{recipe.portion_size || 1}</span>
                </div>
                <div className="detail-item">
                  <label>Difficoltà:</label>
                  <span>{getDifficultyLabel(recipe.difficulty)}</span>
                </div>
                <div className="detail-item">
                  <label>Tempo Prep:</label>
                  <span>{formatTime(recipe.preparation_time)}</span>
                </div>
                <div className="detail-item">
                  <label>Tempo Cottura:</label>
                  <span>{formatTime(recipe.cooking_time)}</span>
                </div>
                <div className="detail-item">
                  <label>Costo Totale:</label>
                  <span className="cost-amount">{formatCurrency(recipe.total_cost)}</span>
                </div>
                <div className="detail-item">
                  <label>Versione:</label>
                  <span>v{recipe.version}</span>
                </div>
                <div className="detail-item">
                  <label>Creato da:</label>
                  <span>{recipe.created_by_name || 'N/A'}</span>
                </div>
              </div>

              {recipe.description && (
                <div className="recipe-description">
                  <h5>Descrizione:</h5>
                  <p>{recipe.description}</p>
                </div>
              )}
            </div>

            {/* Ingredienti */}
            <div className="details-section">
              <h4>🥗 Ingredienti ({recipe.ingredients?.length || 0})</h4>
              <div className="ingredients-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>Quantità</th>
                      <th>Costo Unit.</th>
                      <th>Costo Tot.</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.ingredients?.map(ingredient => (
                      <tr key={ingredient.id} className={ingredient.is_optional ? 'optional' : ''}>
                        <td>
                          {ingredient.ingredient_name}
                          {ingredient.is_optional && <span className="optional-badge">Opzionale</span>}
                        </td>
                        <td>{ingredient.quantity} {ingredient.unit}</td>
                        <td>{formatCurrency(ingredient.cost_per_unit)}</td>
                        <td>{formatCurrency(ingredient.total_cost)}</td>
                        <td>{ingredient.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Istruzioni */}
            {recipe.instructions && (
              <div className="details-section">
                <h4>📝 Istruzioni di Preparazione</h4>
                <div className="instructions-content">
                  {recipe.instructions.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Note dello chef */}
            {recipe.chef_notes && (
              <div className="details-section">
                <h4>👨‍🍳 Note dello Chef</h4>
                <div className="chef-notes-content">
                  {recipe.chef_notes.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button className="btn info">
            🖨️ Stampa
          </button>
          <button className="btn success">
            📋 Duplica
          </button>
        </div>
      </div>
    </div>
  );
}