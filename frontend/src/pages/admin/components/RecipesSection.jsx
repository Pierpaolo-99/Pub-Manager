import { useState, useEffect } from "react";

export default function RecipesSection() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    const mockRecipes = [
      { 
        id: 1, 
        name: 'Pizza Margherita', 
        product: 'Pizza Margherita',
        ingredients: 3,
        cost: 3.50,
        difficulty: 'Facile'
      },
      { 
        id: 2, 
        name: 'Hamburger Classico', 
        product: 'Hamburger',
        ingredients: 5,
        cost: 4.20,
        difficulty: 'Media'
      },
    ];
    setRecipes(mockRecipes);
  }, []);

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Facile': 'success',
      'Media': 'warning',
      'Difficile': 'danger'
    };
    return colors[difficulty] || 'secondary';
  };

  return (
    <div className="recipes-section">
      <div className="section-header">
        <div>
          <h2>📝 Gestione Ricette</h2>
          <p className="section-subtitle">{recipes.length} ricette create</p>
        </div>
        <button className="btn primary">+ Crea Ricetta</button>
      </div>

      <div className="recipes-grid">
        {recipes.map(recipe => (
          <div key={recipe.id} className="recipe-card">
            <div className="recipe-header">
              <h3>{recipe.name}</h3>
              <span className={`difficulty-badge ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
              </span>
            </div>
            <div className="recipe-info">
              <div className="info-row">
                <span>Prodotto:</span>
                <span>{recipe.product}</span>
              </div>
              <div className="info-row">
                <span>Ingredienti:</span>
                <span>{recipe.ingredients}</span>
              </div>
              <div className="info-row">
                <span>Costo stimato:</span>
                <span>€{recipe.cost.toFixed(2)}</span>
              </div>
            </div>
            <div className="recipe-actions">
              <button className="btn-small primary">Visualizza</button>
              <button className="btn-small secondary">Modifica</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}