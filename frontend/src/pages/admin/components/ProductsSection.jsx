import { useState, useEffect } from "react";
import "./ProductsSection.css";

export default function ProductsSection() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    category_id: 'all',
    active: 'all',
    featured: 'all'
  });
  
  const [viewMode, setViewMode] = useState('grid');
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadData();
    loadStats();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, filters]);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const responses = await Promise.all([
        fetch('http://localhost:3000/api/products', { credentials: 'include' }),
        fetch('http://localhost:3000/api/categories', { credentials: 'include' }),
        fetch('http://localhost:3000/api/allergens', { credentials: 'include' })
      ]);

      const [productsRes, categoriesRes, allergensRes] = responses;

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
      if (allergensRes.ok) {
        const allergensData = await allergensRes.json();
        setAllergens(allergensData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category_id !== 'all') {
      filtered = filtered.filter(product => 
        product.category_id == filters.category_id
      );
    }

    if (filters.active !== 'all') {
      filtered = filtered.filter(product => 
        filters.active === 'true' ? product.active === 1 : product.active === 0
      );
    }

    if (filters.featured !== 'all') {
      filtered = filtered.filter(product => 
        filters.featured === 'true' ? product.featured === 1 : product.featured === 0
      );
    }

    setFilteredProducts(filtered);
  };

  const handleDeleteProduct = async (id, productName, hasDependencies = false) => {
    const message = hasDependencies 
      ? `Eliminare "${productName}"?\n\nATTENZIONE: Questo prodotto ha varianti/ordini/stock. L'eliminazione sarà forzata.`
      : `Eliminare "${productName}"?`;
      
    if (!confirm(message)) return;

    try {
      const response = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force: hasDependencies })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          const forceDelete = confirm(
            `Impossibile eliminare "${productName}" perché utilizzato.\n\n` +
            `Varianti: ${errorData.dependencies.variants_count}\n` +
            `Ordini: ${errorData.dependencies.order_items_count}\n` +
            `Stock: ${errorData.dependencies.stock_records}\n\n` +
            `Forzare l'eliminazione?`
          );
          
          if (forceDelete) {
            return handleDeleteProduct(id, productName, true);
          }
          return;
        }
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }

      await loadData();
      await loadStats();
      console.log(`✅ Deleted product: ${id}`);
    } catch (err) {
      console.error('❌ Error deleting product:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  const handleToggleField = async (id, field, currentValue) => {
    try {
      const response = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          field, 
          value: !currentValue 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore nell'aggiornamento ${field}`);
      }

      setProducts(products.map(product => 
        product.id === id ? { ...product, [field]: !currentValue ? 1 : 0 } : product
      ));
      
      await loadStats();
    } catch (err) {
      console.error(`❌ Error toggling ${field}:`, err);
      alert(`Errore: ${err.message}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="products-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento prodotti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="products-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>🍺 Gestione Prodotti</h2>
          <p className="section-subtitle">
            {stats.total_products || 0} prodotti • {stats.active_products || 0} attivi • 
            {stats.featured_products || 0} in evidenza
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
            className="btn secondary refresh-btn"
            onClick={() => {
              loadData();
              loadStats();
            }}
            title="Aggiorna prodotti"
          >
            🔄 Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Nuovo Prodotto
          </button>
        </div>
      </div>

      {/* Statistiche rapide */}
      <div className="products-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">🍺</span>
          <div>
            <div className="stat-number">{stats.total_products || 0}</div>
            <div className="stat-label">Totali</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">{stats.active_products || 0}</div>
            <div className="stat-label">Attivi</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">⭐</span>
          <div>
            <div className="stat-number">{stats.featured_products || 0}</div>
            <div className="stat-label">In Evidenza</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">{formatCurrency(stats.avg_price || 0)}</div>
            <div className="stat-label">Prezzo Medio</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">📁</span>
          <div>
            <div className="stat-number">{stats.categories_count || 0}</div>
            <div className="stat-label">Categorie</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca prodotti per nome o descrizione..."
            className="search-input"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={filters.category_id}
          onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
        >
          <option value="all">Tutte le categorie</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={filters.active}
          onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
        >
          <option value="all">Tutti gli stati</option>
          <option value="true">✅ Solo attivi</option>
          <option value="false">❌ Solo disattivi</option>
        </select>

        <select 
          className="filter-select"
          value={filters.featured}
          onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.value }))}
        >
          <option value="all">Tutti i prodotti</option>
          <option value="true">⭐ Solo in evidenza</option>
          <option value="false">🔍 Solo normali</option>
        </select>

        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => setFilters({
              search: '',
              category_id: 'all',
              active: 'all',
              featured: 'all'
            })}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Errori */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Contenuto principale */}
      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🍺</span>
          <h3>Nessun prodotto trovato</h3>
          <p>
            {products.length === 0 
              ? "Inizia aggiungendo il primo prodotto al menu"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
          {products.length === 0 && (
            <button 
              className="btn primary"
              onClick={() => setShowAddModal(true)}
            >
              + Primo Prodotto
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <ProductsGrid 
          products={filteredProducts}
          categories={categories}
          onEdit={setEditingProduct}
          onDelete={handleDeleteProduct}
          onToggleField={handleToggleField}
        />
      ) : (
        <ProductsTable 
          products={filteredProducts}
          categories={categories}
          onEdit={setEditingProduct}
          onDelete={handleDeleteProduct}
          onToggleField={handleToggleField}
        />
      )}

      {/* Modal Aggiungi/Modifica Prodotto */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          allergens={allergens}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          onSave={(savedProduct) => {
            loadData();
            loadStats();
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// Componente Vista Griglia
function ProductsGrid({ products, categories, onEdit, onDelete, onToggleField }) {
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Senza categoria';
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || '🍽️';
  };

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          categoryName={getCategoryName(product.category_id)}
          categoryIcon={getCategoryIcon(product.category_id)}
          onEdit={() => onEdit(product)}
          onDelete={() => onDelete(product.id, product.name)}
          onToggleField={onToggleField}
        />
      ))}
    </div>
  );
}

// Componente Vista Tabella
function ProductsTable({ products, categories, onEdit, onDelete, onToggleField }) {
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Senza categoria';
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || '🍽️';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Ordine</th>
            <th>Prodotto</th>
            <th>Categoria</th>
            <th>Prezzo Base</th>
            <th>Tempo Prep.</th>
            <th>Calorie</th>
            <th>Varianti</th>
            <th>Stato</th>
            <th>Evidenza</th>
            <th>Allergeni</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id} className={`product-row ${product.active ? 'active' : 'inactive'} ${product.featured ? 'featured' : ''}`}>
              <td>
                <span className="sort-order">{product.sort_order}</span>
              </td>
              <td>
                <div className="product-info">
                  <div className="product-image-small">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} />
                    ) : (
                      <span className="product-placeholder">{getCategoryIcon(product.category_id)}</span>
                    )}
                  </div>
                  <div>
                    <div className="product-name">{product.name}</div>
                    <div className="product-description">
                      {product.description || 'Nessuna descrizione'}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <span className="category-badge">
                  {getCategoryIcon(product.category_id)} {getCategoryName(product.category_id)}
                </span>
              </td>
              <td className="product-price">{formatCurrency(product.base_price)}</td>
              <td>
                <span className="prep-time">
                  {product.preparation_time ? `${product.preparation_time} min` : '-'}
                </span>
              </td>
              <td>
                <span className="calories">
                  {product.calories ? `${product.calories} kcal` : '-'}
                </span>
              </td>
              <td>
                <span className="variants-count">{product.variants_count || 0}</span>
              </td>
              <td>
                <button
                  className={`status-toggle ${product.active ? 'active' : 'inactive'}`}
                  onClick={() => onToggleField(product.id, 'active', product.active)}
                >
                  <span className="status-dot"></span>
                  {product.active ? 'Attivo' : 'Disattivo'}
                </button>
              </td>
              <td>
                <button
                  className={`featured-toggle ${product.featured ? 'featured' : 'normal'}`}
                  onClick={() => onToggleField(product.id, 'featured', product.featured)}
                  title={product.featured ? 'Rimuovi da evidenza' : 'Metti in evidenza'}
                >
                  {product.featured ? '⭐' : '☆'}
                </button>
              </td>
              <td>
                <div className="allergens-list">
                  {product.allergens && product.allergens.length > 0 ? (
                    product.allergens.map(allergen => (
                      <span key={allergen.id} className="allergen-tag">
                        {allergen.code || allergen.name}
                      </span>
                    ))
                  ) : (
                    <span className="no-allergens">Nessuno</span>
                  )}
                </div>
              </td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="btn-small secondary"
                    onClick={() => onEdit(product)}
                    title="Modifica prodotto"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-small danger"
                    onClick={() => onDelete(product.id, product.name)}
                    title="Elimina prodotto"
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

// Componente Card Prodotto
function ProductCard({ product, categoryName, categoryIcon, onEdit, onDelete, onToggleField }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className={`product-card ${!product.active ? 'inactive' : ''} ${product.featured ? 'featured' : ''}`}>
      <div className="product-image-container">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="product-image" />
        ) : (
          <div className="product-placeholder">
            <span>{categoryIcon}</span>
          </div>
        )}
        
        <div className="product-badges">
          <button
            className={`status-btn ${product.active ? 'active' : 'inactive'}`}
            onClick={() => onToggleField(product.id, 'active', product.active)}
            title={product.active ? 'Disattiva' : 'Attiva'}
          >
            {product.active ? '✅' : '❌'}
          </button>
          
          <button
            className={`featured-btn ${product.featured ? 'featured' : 'normal'}`}
            onClick={() => onToggleField(product.id, 'featured', product.featured)}
            title={product.featured ? 'Rimuovi da evidenza' : 'Metti in evidenza'}
          >
            {product.featured ? '⭐' : '☆'}
          </button>
        </div>
        
        <div className="sort-order-badge">{product.sort_order}</div>
      </div>

      <div className="product-content">
        <div className="product-header">
          <h3 className="product-name">{product.name}</h3>
          <span className="product-price">{formatCurrency(product.base_price)}</span>
        </div>

        <div className="product-category">
          <span className="category-tag">
            {categoryIcon} {categoryName}
          </span>
        </div>

        {product.description && (
          <p className="product-description">{product.description}</p>
        )}

        <div className="product-meta">
          {product.preparation_time > 0 && (
            <span className="meta-item">
              ⏱️ {product.preparation_time} min
            </span>
          )}
          {product.calories && (
            <span className="meta-item">
              🔥 {product.calories} kcal
            </span>
          )}
          {product.variants_count > 0 && (
            <span className="meta-item">
              🔄 {product.variants_count} varianti
            </span>
          )}
        </div>

        {product.allergens && product.allergens.length > 0 && (
          <div className="product-allergens">
            <strong>Allergeni:</strong>
            <div className="allergens-tags">
              {product.allergens.map(allergen => (
                <span key={allergen.id} className="allergen-tag">
                  {allergen.code || allergen.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="product-actions">
          <button 
            className="btn-small secondary"
            onClick={onEdit}
          >
            ✏️ Modifica
          </button>
          <button 
            className="btn-small danger"
            onClick={onDelete}
          >
            🗑️ Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal per aggiungere/modificare prodotto
function ProductModal({ product, categories, allergens, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    base_price: product?.base_price || '',
    category_id: product?.category_id || '',
    active: product?.active !== undefined ? Boolean(product.active) : true,
    featured: product?.featured !== undefined ? Boolean(product.featured) : false,
    image_url: product?.image_url || '',
    sort_order: product?.sort_order || 0,
    preparation_time: product?.preparation_time || 0,
    calories: product?.calories || '',
    allergen_ids: product?.allergens?.map(a => a.id) || []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.base_price || !formData.category_id) {
      setError('Nome, prezzo base e categoria sono obbligatori');
      return;
    }

    if (parseFloat(formData.base_price) < 0) {
      setError('Il prezzo deve essere positivo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = product 
        ? `http://localhost:3000/api/products/${product.id}`
        : 'http://localhost:3000/api/products';
      
      const method = product ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          base_price: parseFloat(formData.base_price),
          sort_order: parseInt(formData.sort_order) || 0,
          preparation_time: parseInt(formData.preparation_time) || 0,
          calories: formData.calories ? parseInt(formData.calories) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore nella ${product ? 'modifica' : 'creazione'} prodotto`);
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

  const handleAllergenChange = (allergenId) => {
    const newAllergenIds = formData.allergen_ids.includes(allergenId)
      ? formData.allergen_ids.filter(id => id !== allergenId)
      : [...formData.allergen_ids, allergenId];
    
    setFormData(prev => ({ ...prev, allergen_ids: newAllergenIds }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>{product ? `Modifica ${product.name}` : 'Nuovo Prodotto'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">❌ {error}</div>}
            
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome Prodotto *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="es. Birra alla spina, Carbonara..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prezzo Base (€) *</label>
                  <input
                    type="number"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleChange}
                    className="form-input"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">Seleziona categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">URL Immagine</label>
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="https://esempio.com/immagine.jpg"
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
                  placeholder="Descrizione dettagliata del prodotto..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tempo Preparazione (minuti)</label>
                  <input
                    type="number"
                    name="preparation_time"
                    value={formData.preparation_time}
                    onChange={handleChange}
                    className="form-input"
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Calorie</label>
                  <input
                    type="number"
                    name="calories"
                    value={formData.calories}
                    onChange={handleChange}
                    className="form-input"
                    min="0"
                    placeholder="es. 250"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ordine di Visualizzazione</label>
                <input
                  type="number"
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                  placeholder="0"
                />
                <small className="form-help">
                  Numero per ordinamento (0 = primo, maggiore = dopo)
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Allergeni</label>
                <div className="allergens-grid">
                  {allergens.map(allergen => (
                    <label key={allergen.id} className="allergen-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.allergen_ids.includes(allergen.id)}
                        onChange={() => handleAllergenChange(allergen.id)}
                      />
                      <span className="allergen-label">
                        {allergen.name} {allergen.code && `(${allergen.code})`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                    />
                    <span className="checkbox-label">Prodotto attivo</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={formData.featured}
                      onChange={handleChange}
                    />
                    <span className="checkbox-label">Prodotto in evidenza</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Salvando...' : (product ? 'Aggiorna Prodotto' : 'Crea Prodotto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}