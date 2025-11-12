import { useState, useEffect, useCallback } from 'react';

export default function ProductGrid({ onProductSelect, loading }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProductsAndCategories();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, searchTerm]);

  const loadProductsAndCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load products with variants
      const productsResponse = await fetch('/api/products?include_variants=true&active_only=true', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      // Load categories
      const categoriesResponse = await fetch('/api/categories?active_only=true', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (productsResponse.ok && categoriesResponse.ok) {
        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();

        setProducts(productsData.products || []);
        setCategories(categoriesData.categories || []);
      } else {
        throw new Error('Errore nel caricamento menu');
      }

    } catch (error) {
      console.error('Error loading menu:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = useCallback(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category_id == selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category_name?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by popularity/order
    filtered.sort((a, b) => {
      // First by category order, then by product order
      if (a.category_order !== b.category_order) {
        return (a.category_order || 999) - (b.category_order || 999);
      }
      return (a.sort_order || 999) - (b.sort_order || 999);
    });

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  const handleProductClick = (product) => {
    // If product has variants, show variant selection
    if (product.variants && product.variants.length > 0) {
      showVariantSelection(product);
    } else {
      // Add product directly
      onProductSelect(product);
    }
  };

  const showVariantSelection = (product) => {
    // Create variant selection modal/bottom sheet
    const variantModal = document.createElement('div');
    variantModal.className = 'variant-selection-modal';
    variantModal.innerHTML = `
      <div class="variant-modal-content">
        <div class="variant-header">
          <h3>🔄 Scegli ${product.name}</h3>
          <button class="variant-close">×</button>
        </div>
        <div class="variant-grid">
          ${product.variants.map(variant => `
            <button class="variant-option" data-variant-id="${variant.id}">
              <div class="variant-name">${variant.name}</div>
              <div class="variant-price">${formatCurrency(variant.price)}</div>
              ${variant.stock_quantity <= 0 ? '<div class="variant-out-stock">Esaurito</div>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(variantModal);

    // Handle variant selection
    variantModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('variant-close') || e.target.classList.contains('variant-selection-modal')) {
        document.body.removeChild(variantModal);
      } else if (e.target.closest('.variant-option')) {
        const variantId = e.target.closest('.variant-option').dataset.variantId;
        const selectedVariant = product.variants.find(v => v.id == variantId);
        
        if (selectedVariant && selectedVariant.stock_quantity > 0) {
          onProductSelect(product, selectedVariant);
          document.body.removeChild(variantModal);
        }
      }
    });

    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (document.body.contains(variantModal)) {
        document.body.removeChild(variantModal);
      }
    }, 30000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getProductDisplayPrice = (product) => {
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice === maxPrice) {
        return formatCurrency(minPrice);
      } else {
        return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
      }
    }
    return formatCurrency(product.price);
  };

  const isProductAvailable = (product) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some(v => v.stock_quantity > 0);
    }
    return product.stock_quantity > 0;
  };

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'bevande': '🍺',
      'birre': '🍻',
      'cocktails': '🍹',
      'food': '🍽️',
      'panini': '🥪',
      'pizze': '🍕',
      'antipasti': '🧀',
      'dolci': '🍰',
      'caffè': '☕',
      'vini': '🍷',
      'liquori': '🥃',
      'aperitivi': '🍸'
    };
    
    const key = categoryName?.toLowerCase() || '';
    return iconMap[key] || '📋';
  };

  if (isLoading) {
    return (
      <div className="product-grid-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-grid-error">
        <div className="error-content">
          <span className="error-icon">❌</span>
          <h3>Errore caricamento menu</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={loadProductsAndCategories}>
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-grid-container">
      {/* Quick Search */}
      <div className="product-search">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="🔍 Cerca prodotti..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search" 
              onClick={() => setSearchTerm('')}
              title="Pulisci ricerca"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="category-filters">
        <button
          className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <span className="category-icon">🏷️</span>
          <span className="category-label">Tutti</span>
          <span className="category-count">({products.length})</span>
        </button>
        
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.category_id === category.id);
          return (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory == category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{getCategoryIcon(category.name)}</span>
              <span className="category-label">{category.name}</span>
              <span className="category-count">({categoryProducts.length})</span>
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="empty-products">
          <span className="empty-icon">🍽️</span>
          <h3>Nessun prodotto trovato</h3>
          <p>
            {searchTerm 
              ? `Nessun prodotto corrisponde a "${searchTerm}"`
              : selectedCategory !== 'all'
                ? 'Categoria vuota o prodotti non disponibili'
                : 'Menu non disponibile'
            }
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button 
              className="reset-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
            >
              🔄 Mostra tutto il menu
            </button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map(product => {
            const available = isProductAvailable(product);
            return (
              <button
                key={product.id}
                className={`product-card ${!available ? 'unavailable' : ''}`}
                onClick={() => handleProductClick(product)}
                disabled={!available}
              >
                {/* Product Image Placeholder */}
                <div className="product-image">
                  <span className="product-emoji">
                    {getCategoryIcon(product.category_name)}
                  </span>
                  {!available && (
                    <div className="out-of-stock-overlay">
                      <span>Esaurito</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="product-info">
                  <h4 className="product-name">{product.name}</h4>
                  
                  {product.description && (
                    <p className="product-description">
                      {product.description.substring(0, 60)}
                      {product.description.length > 60 ? '...' : ''}
                    </p>
                  )}

                  <div className="product-details">
                    <span className="product-price">
                      {getProductDisplayPrice(product)}
                    </span>
                    
                    {product.variants && product.variants.length > 0 && (
                      <span className="variant-indicator">
                        🔄 {product.variants.length} opzioni
                      </span>
                    )}
                  </div>

                  {/* Stock indicator */}
                  {product.variants && product.variants.length > 0 ? (
                    <div className="stock-info">
                      {product.variants.filter(v => v.stock_quantity > 0).length} / {product.variants.length} disponibili
                    </div>
                  ) : (
                    <div className="stock-info">
                      Stock: {product.stock_quantity || 0}
                    </div>
                  )}
                </div>

                {/* Quick Add Button */}
                {available && (
                  <div className="quick-add">
                    <span className="add-icon">+</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Products Summary */}
      <div className="products-summary">
        <span>
          {filteredProducts.length} prodott{filteredProducts.length !== 1 ? 'i' : 'o'} 
          {selectedCategory !== 'all' && ` in ${categories.find(c => c.id == selectedCategory)?.name}`}
          {searchTerm && ` per "${searchTerm}"`}
        </span>
      </div>
    </div>
  );
}