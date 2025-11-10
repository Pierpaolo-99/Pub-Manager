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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    supplier: 'all', 
    storage_type: 'all',
    active: true
  });

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [filters]);

  // ✅ INITIALIZE ALL DATA WITH BETTER ERROR HANDLING
  const initializeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Initializing ingredients section...');
      
      // ✅ PARALLEL FETCH WITH INDIVIDUAL ERROR HANDLING
      const results = await Promise.allSettled([
        fetchIngredientsData(),
        fetchCategoriesData(),
        fetchSuppliersData(), 
        fetchStorageTypesData()
      ]);

      // ✅ CHECK RESULTS
      const [ingredientsResult, categoriesResult, suppliersResult, storageResult] = results;
      
      let hasErrors = false;
      const errorMessages = [];

      if (ingredientsResult.status === 'rejected') {
        console.error('❌ Ingredients fetch failed:', ingredientsResult.reason);
        errorMessages.push('Ingredienti: ' + ingredientsResult.reason.message);
        hasErrors = true;
      }

      if (categoriesResult.status === 'rejected') {
        console.error('❌ Categories fetch failed:', categoriesResult.reason);
        errorMessages.push('Categorie: ' + categoriesResult.reason.message);
        hasErrors = true;
        // ✅ FALLBACK CATEGORIES
        setCategories([
          { value: 'other', label: 'Altro' },
          { value: 'beverage', label: 'Bevande' },
          { value: 'meat', label: 'Carne' },
          { value: 'vegetable', label: 'Verdure' },
          { value: 'dairy', label: 'Latticini' }
        ]);
      }

      if (suppliersResult.status === 'rejected') {
        console.error('❌ Suppliers fetch failed:', suppliersResult.reason);
        errorMessages.push('Fornitori: ' + suppliersResult.reason.message);
        hasErrors = true;
        // ✅ FALLBACK SUPPLIERS
        setSuppliers(['Fornitore Generico']);
      }

      if (storageResult.status === 'rejected') {
        console.error('❌ Storage types fetch failed:', storageResult.reason);
        errorMessages.push('Tipi storage: ' + storageResult.reason.message);
        hasErrors = true;
        // ✅ FALLBACK STORAGE TYPES
        setStorageTypes([
          { value: 'ambient', label: 'Temperatura ambiente' },
          { value: 'refrigerated', label: 'Refrigerato' },
          { value: 'frozen', label: 'Congelato' }
        ]);
      }

      if (hasErrors) {
        setError(`Alcuni dati non sono disponibili: ${errorMessages.join(', ')}. Usando valori di default.`);
      }

      console.log('✅ Ingredients section initialized');
      
    } catch (err) {
      console.error('❌ Critical initialization error:', err);
      setError('Errore critico nel caricamento della sezione ingredienti');
    } finally {
      setLoading(false);
    }
  };

  // ✅ ROBUST FETCH INGREDIENTS WITH DETAILED ERROR HANDLING
  const fetchIngredientsData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.supplier !== 'all') params.append('supplier', filters.supplier);
      if (filters.storage_type !== 'all') params.append('storage_type', filters.storage_type);
      params.append('active', filters.active.toString());
      
      console.log('📡 Fetching ingredients with params:', params.toString());
      
      const response = await fetch(`/api/ingredients?${params}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Ingredients response status:', response.status, response.statusText);
      
      if (!response.ok) {
        // ✅ CHECK IF IT'S HTML ERROR PAGE
        const contentType = response.headers.get('content-type');
        console.log('📡 Response content-type:', contentType);
        
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`Server error (${response.status}): Endpoint non disponibile. Verifica che il backend sia attivo.`);
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        throw new Error(errorData.message || errorData.error || `Errore HTTP: ${response.status}`);
      }
      
      // ✅ SAFE JSON PARSING
      let data;
      try {
        const responseText = await response.text();
        console.log('📡 Raw response:', responseText.substring(0, 200) + '...');
        
        if (!responseText.trim()) {
          throw new Error('Risposta vuota dal server');
        }
        
        data = JSON.parse(responseText);
        console.log('📡 Parsed ingredients data:', data);
        
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Risposta del server non valida (formato JSON errato)');
      }
      
      // ✅ VALIDATE RESPONSE STRUCTURE
      if (!data || typeof data !== 'object') {
        throw new Error('Struttura dati non valida dal server');
      }
      
      setIngredients(data.ingredients || []);
      setTotalCount(data.total || 0);
      setAppliedFilters(data.filters || {});
      
      console.log(`✅ Loaded ${data.total || 0} ingredients successfully`);
      return data;
      
    } catch (err) {
      console.error('❌ Error in fetchIngredientsData:', err);
      throw err;
    }
  };

  // ✅ WRAPPER FOR FILTERS CHANGE
  const fetchIngredients = async () => {
    try {
      setError(null);
      await fetchIngredientsData();
    } catch (err) {
      console.error('❌ Error fetching ingredients:', err);
      setError(`Errore caricamento ingredienti: ${err.message}`);
    }
  };

  // ✅ ROBUST FETCH CATEGORIES
  const fetchCategoriesData = async () => {
    try {
      console.log('📡 Fetching categories...');
      
      const response = await fetch('/api/ingredients/categories', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Categories response:', response.status, response.statusText);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`Endpoint categorie non disponibile (${response.status})`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('📡 Categories raw response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Risposta vuota per categorie');
      }
      
      const data = JSON.parse(responseText);
      console.log('📡 Categories data:', data);
      
      setCategories(data.categories || []);
      return data;
      
    } catch (err) {
      console.error('❌ Error in fetchCategoriesData:', err);
      throw err;
    }
  };

  // ✅ ROBUST FETCH SUPPLIERS
  const fetchSuppliersData = async () => {
    try {
      console.log('📡 Fetching suppliers...');
      
      const response = await fetch('/api/ingredients/suppliers', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Suppliers response:', response.status, response.statusText);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`Endpoint fornitori non disponibile (${response.status})`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('📡 Suppliers raw response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Risposta vuota per fornitori');
      }
      
      const data = JSON.parse(responseText);
      console.log('📡 Suppliers data:', data);
      
      setSuppliers(data.suppliers || []);
      return data;
      
    } catch (err) {
      console.error('❌ Error in fetchSuppliersData:', err);
      throw err;
    }
  };

  // ✅ ROBUST FETCH STORAGE TYPES
  const fetchStorageTypesData = async () => {
    try {
      console.log('📡 Fetching storage types...');
      
      const response = await fetch('/api/ingredients/storage-types', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Storage types response:', response.status, response.statusText);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`Endpoint storage types non disponibile (${response.status})`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('📡 Storage types raw response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Risposta vuota per storage types');
      }
      
      const data = JSON.parse(responseText);
      console.log('📡 Storage types data:', data);
      
      setStorageTypes(data.storageTypes || []);
      return data;
      
    } catch (err) {
      console.error('❌ Error in fetchStorageTypesData:', err);
      throw err;
    }
  };

  // ✅ FETCH SINGLE INGREDIENT DETAILS WITH ERROR HANDLING
  const fetchIngredientDetails = async (id) => {
    try {
      console.log('📡 Fetching ingredient details for ID:', id);
      
      const response = await fetch(`/api/ingredients/${id}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`Ingrediente non trovato (${response.status})`);
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        throw new Error(errorData.message || errorData.error || `Errore HTTP: ${response.status}`);
      }
      
      const responseText = await response.text();
      
      if (!responseText.trim()) {
        throw new Error('Risposta vuota per dettagli ingrediente');
      }
      
      const ingredient = JSON.parse(responseText);
      console.log('📡 Ingredient details:', ingredient);
      
      setSelectedIngredient(ingredient);
      setShowDetailsModal(true);
      
    } catch (err) {
      console.error('❌ Error fetching ingredient details:', err);
      alert(`Errore nel caricamento dettagli: ${err.message}`);
    }
  };

  // ✅ DELETE WITH BETTER ERROR HANDLING
  const handleDeleteIngredient = async (id, name) => {
    if (!confirm(`Sei sicuro di voler eliminare "${name}"?`)) return;
    
    try {
      console.log('🗑️ Deleting ingredient:', id, name);
      
      const response = await fetch(`/api/ingredients/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`Impossibile eliminare (${response.status}): endpoint non disponibile`);
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        throw new Error(errorData.message || errorData.error || 'Errore nell\'eliminazione');
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

  const handleShowDetails = (ingredient) => {
    fetchIngredientDetails(ingredient.id);
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

  // ✅ ENHANCED LOADING STATE
  if (loading) {
    return (
      <div className="ingredients-section">
        <div className="loading-state">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <div className="loading-content">
            <h3>🥕 Caricamento Ingredienti</h3>
            <p>Connessione al database in corso...</p>
            <small>Verificando disponibilità endpoint backend</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ingredients-section">
      {/* ✅ ENHANCED HEADER WITH CONNECTION STATUS */}
      <div className="section-header">
        <div className="header-left">
          <h2>🥕 Gestione Ingredienti</h2>
          <p className="section-subtitle">
            {totalCount > 0 ? `${totalCount} ingredienti catalogati` : 'Nessun ingrediente'}
            {ingredients.filter(i => !i.active).length > 0 && 
              ` • ${ingredients.filter(i => !i.active).length} disattivati`
            }
            {(appliedFilters.category && appliedFilters.category !== 'all') && 
              ` • Categoria: ${getCategoryLabel(appliedFilters.category)}`
            }
            {appliedFilters.supplier && 
              ` • Fornitore: ${appliedFilters.supplier}`
            }
            {appliedFilters.search && 
              ` • Ricerca: "${appliedFilters.search}"`
            }
            {/* ✅ CONNECTION STATUS INDICATOR */}
            <span className="connection-status">
              {error ? '🔴 Problemi di connessione' : '🟢 Connesso al database'}
            </span>
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={handleAddIngredient}
          disabled={categories.length === 0}
        >
          ➕ Aggiungi Ingrediente
        </button>
      </div>

      {/* ✅ ENHANCED ERROR BANNER WITH RETRY */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-text">
              <strong>Problema di connessione</strong>
              <p>{error}</p>
            </div>
          </div>
          <div className="error-actions">
            <button 
              className="btn-small secondary"
              onClick={initializeData}
              title="Riprova caricamento"
            >
              🔄 Riprova
            </button>
            <button 
              className="error-close"
              onClick={() => setError(null)}
              title="Chiudi"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Rest of component remains the same... */}
      {/* Filtri section */}
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
                      onClick={() => handleShowDetails(ingredient)}
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
      {ingredients.length === 0 && !loading && !error && (
        <div className="empty-state">
          <span className="empty-icon">🥕</span>
          <h3>
            {filters.search || filters.category !== 'all' || filters.supplier !== 'all' ? 
              'Nessun risultato trovato' : 
              'Nessun ingrediente catalogato'}
          </h3>
          <p>
            {filters.search || filters.category !== 'all' || filters.supplier !== 'all' ? 
              'Prova a modificare i filtri di ricerca' :
              'Inizia aggiungendo il tuo primo ingrediente al sistema'
            }
          </p>
          {(!filters.search && filters.category === 'all' && filters.supplier === 'all') && (
            <button 
              className="btn primary" 
              onClick={handleAddIngredient}
              disabled={categories.length === 0}
            >
              ➕ Aggiungi Primo Ingrediente
            </button>
          )}
        </div>
      )}

      {/* ✅ BACKEND CONNECTION INFO */}
      {!error && !loading && ingredients.length === 0 && (
        <div className="backend-info">
          <div className="info-card">
            <h4>🔧 Informazioni Backend</h4>
            <div className="info-grid">
              <div className="info-item">
                <span>Endpoint ingredienti:</span>
                <span className="endpoint-status">
                  {totalCount >= 0 ? '✅ Disponibile' : '❌ Non disponibile'}
                </span>
              </div>
              <div className="info-item">
                <span>Categorie caricate:</span>
                <span>{categories.length > 0 ? `✅ ${categories.length}` : '❌ 0'}</span>
              </div>
              <div className="info-item">
                <span>Fornitori disponibili:</span>
                <span>{suppliers.length > 0 ? `✅ ${suppliers.length}` : '❌ 0'}</span>
              </div>
              <div className="info-item">
                <span>Storage types:</span>
                <span>{storageTypes.length > 0 ? `✅ ${storageTypes.length}` : '❌ 0'}</span>
              </div>
            </div>
          </div>
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

      {/* Details Modal */}
      {showDetailsModal && selectedIngredient && (
        <IngredientDetailsModal
          ingredient={selectedIngredient}
          categories={categories}
          suppliers={suppliers}
          storageTypes={storageTypes}
          onClose={() => setShowDetailsModal(false)}
          onEdit={() => {
            setShowDetailsModal(false);
            handleEditIngredient(selectedIngredient);
          }}
          formatCurrency={formatCurrency}
          getCategoryLabel={getCategoryLabel}
          getStorageTypeLabel={getStorageTypeLabel}
          getStorageIcon={getStorageIcon}
        />
      )}
    </div>
  );
}

// ✅ KEEP EXISTING IngredientModal AND IngredientDetailsModal COMPONENTS AS THEY ARE
// [Include the existing modal components here - they're already correct]