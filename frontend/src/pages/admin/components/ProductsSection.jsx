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
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'table'
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const loadData = async () => {
    try {
      setError(null);
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

  const filterProducts = () => {
    let filtered = products;

    // Filtro per testo (nome o descrizione)
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro per categoria
    if (categoryFilter) {
      filtered = filtered.filter(product => 
        product.category_id === parseInt(categoryFilter)
      );
    }

    // Filtro per stato
    if (statusFilter) {
      const isAvailable = statusFilter === 'available';
      filtered = filtered.filter(product => product.available === isAvailable);
    }

    setFilteredProducts(filtered);
  };

  const deleteProduct = async (id, productName) => {
    if (!window.confirm(`Sei sicuro di voler eliminare "${productName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setProducts(products.filter(product => product.id !== id));
        alert('Prodotto eliminato con successo');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Errore nell\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Errore di rete');
    }
  };

  const toggleProductAvailability = async (id, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ available: !currentStatus })
      });

      if (response.ok) {
        setProducts(products.map(product => 
          product.id === id ? { ...product, available: !currentStatus } : product
        ));
        alert(`Prodotto ${!currentStatus ? 'disponibile' : 'non disponibile'}`);
      } else {
        alert('Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating product availability:', error);
      alert('Errore di rete');
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Senza categoria';
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || '🍽️';
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Caricamento prodotti...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <h3>Errore nel caricamento</h3>
        <p>{error}</p>
        <button className="btn primary" onClick={loadData}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="products-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>🍺 Gestione Prodotti</h2>
          <p className="section-subtitle">
            {products.length} prodotti totali • {products.filter(p => p.available).length} disponibili
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
            onClick={() => setShowAddModal(true)}
          >
            + Aggiungi Prodotto
          </button>
        </div>
      </div>

      {/* Statistiche rapide */}
      <div className="products-stats">
        <div className="stat-card mini">
          <span className="stat-icon">🍺</span>
          <div>
            <div className="stat-number">{products.length}</div>
            <div className="stat-label">Prodotti Totali</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-number">
              {products.filter(p => p.available).length}
            </div>
            <div className="stat-label">Disponibili</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">📁</span>
          <div>
            <div className="stat-number">{categories.length}</div>
            <div className="stat-label">Categorie</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">
              €{products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0).toFixed(0)}
            </div>
            <div className="stat-label">Valore Totale</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca prodotti..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Tutte le categorie</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tutti gli stati</option>
          <option value="available">Disponibili</option>
          <option value="unavailable">Non disponibili</option>
        </select>

        {(searchTerm || categoryFilter || statusFilter) && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter("");
              setStatusFilter("");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

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
              Aggiungi Primo Prodotto
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <ProductsGrid 
          products={filteredProducts}
          categories={categories}
          onEdit={setEditingProduct}
          onDelete={deleteProduct}
          onToggleAvailability={toggleProductAvailability}
        />
      ) : (
        <ProductsTable 
          products={filteredProducts}
          categories={categories}
          onEdit={setEditingProduct}
          onDelete={deleteProduct}
          onToggleAvailability={toggleProductAvailability}
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
            if (editingProduct) {
              setProducts(products.map(p => 
                p.id === savedProduct.id ? savedProduct : p
              ));
            } else {
              setProducts([...products, savedProduct]);
            }
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// Componente Vista Griglia
function ProductsGrid({ products, categories, onEdit, onDelete, onToggleAvailability }) {
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
          onToggleAvailability={() => onToggleAvailability(product.id, product.available)}
        />
      ))}
    </div>
  );
}

// Componente Vista Tabella
function ProductsTable({ products, categories, onEdit, onDelete, onToggleAvailability }) {
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Senza categoria';
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || '🍽️';
  };

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Prodotto</th>
            <th>Categoria</th>
            <th>Prezzo</th>
            <th>Stato</th>
            <th>Allergeni</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>
                <div className="product-info">
                  <div className="product-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <span className="product-placeholder">🍽️</span>
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
              <td className="product-price">€{parseFloat(product.price || 0).toFixed(2)}</td>
              <td>
                <button
                  className={`availability-toggle ${product.available ? 'available' : 'unavailable'}`}
                  onClick={() => onToggleAvailability(product.id, product.available)}
                >
                  <span className="availability-dot"></span>
                  {product.available ? 'Disponibile' : 'Non disponibile'}
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
                    className="btn-small primary"
                    onClick={() => onEdit(product)}
                    title="Modifica prodotto"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-small secondary"
                    onClick={() => alert('Visualizza dettagli - da implementare')}
                    title="Visualizza dettagli"
                  >
                    👁️
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
function ProductCard({ product, categoryName, categoryIcon, onEdit, onDelete, onToggleAvailability }) {
  return (
    <div className={`product-card ${!product.available ? 'unavailable' : ''}`}>
      <div className="product-image-container">
        {product.image ? (
          <img src={product.image} alt={product.name} className="product-image" />
        ) : (
          <div className="product-placeholder">
            <span>{categoryIcon}</span>
          </div>
        )}
        <div className="product-availability">
          <button
            className={`availability-btn ${product.available ? 'available' : 'unavailable'}`}
            onClick={onToggleAvailability}
            title={product.available ? 'Rendi non disponibile' : 'Rendi disponibile'}
          >
            {product.available ? '✅' : '❌'}
          </button>
        </div>
      </div>

      <div className="product-content">
        <div className="product-header">
          <h3 className="product-name">{product.name}</h3>
          <span className="product-price">€{parseFloat(product.price || 0).toFixed(2)}</span>
        </div>

        <div className="product-category">
          <span className="category-tag">
            {categoryIcon} {categoryName}
          </span>
        </div>

        {product.description && (
          <p className="product-description">{product.description}</p>
        )}

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
            className="btn-small primary"
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
    price: product?.price || '',
    category_id: product?.category_id || '',
    available: product?.available ?? true,
    image: product?.image || '',
    allergen_ids: product?.allergens?.map(a => a.id) || []
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!formData.name.trim() || !formData.price || !formData.category_id) {
      alert('Nome, prezzo e categoria sono obbligatori');
      setSaving(false);
      return;
    }

    try {
      const url = product 
        ? `http://localhost:3000/api/products/${product.id}`
        : 'http://localhost:3000/api/products';
      
      const method = product ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const savedProduct = await response.json();
        onSave(savedProduct);
        alert(product ? 'Prodotto aggiornato!' : 'Prodotto creato!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Errore nel salvare il prodotto');
      }
    } catch (error) {
      console.error('Error saving product:', error);
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

  const handleAllergenChange = (allergenId) => {
    const newAllergenIds = formData.allergen_ids.includes(allergenId)
      ? formData.allergen_ids.filter(id => id !== allergenId)
      : [...formData.allergen_ids, allergenId];
    
    setFormData({ ...formData, allergen_ids: newAllergenIds });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">
            {product ? `Modifica ${product.name}` : 'Nuovo Prodotto'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome Prodotto *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="es. Birra alla spina, Carbonara..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prezzo *</label>
              <input
                type="number"
                name="price"
                className="form-input"
                value={formData.price}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Categoria *</label>
            <select
              name="category_id"
              className="form-select"
              value={formData.category_id}
              onChange={handleChange}
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
            <label className="form-label">Descrizione</label>
            <textarea
              name="description"
              className="form-textarea"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Descrizione del prodotto..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL Immagine</label>
            <input
              type="url"
              name="image"
              className="form-input"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://esempio.com/immagine.jpg"
            />
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

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="available"
                checked={formData.available}
                onChange={handleChange}
              />
              <span className="checkbox-label">Prodotto disponibile</span>
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
              {saving ? 'Salvando...' : (product ? 'Aggiorna' : 'Crea Prodotto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}