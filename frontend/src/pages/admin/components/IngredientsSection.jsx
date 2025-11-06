import { useState, useEffect } from "react";

export default function IngredientsSection() {
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    const mockIngredients = [
      { id: 1, name: 'Pomodoro', category: 'Verdure', unit: 'kg', cost: 2.50, supplier: 'Fornitore A' },
      { id: 2, name: 'Mozzarella', category: 'Latticini', unit: 'kg', cost: 8.00, supplier: 'Fornitore B' },
      { id: 3, name: 'Farina 00', category: 'Farine', unit: 'kg', cost: 1.20, supplier: 'Fornitore A' },
      { id: 4, name: 'Olio EVO', category: 'Condimenti', unit: 'l', cost: 12.00, supplier: 'Fornitore C' },
    ];
    setIngredients(mockIngredients);
  }, []);

  return (
    <div className="ingredients-section">
      <div className="section-header">
        <div>
          <h2>🥕 Gestione Ingredienti</h2>
          <p className="section-subtitle">{ingredients.length} ingredienti catalogati</p>
        </div>
        <button className="btn primary">+ Aggiungi Ingrediente</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Categoria</th>
              <th>Unità</th>
              <th>Costo</th>
              <th>Fornitore</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map(ingredient => (
              <tr key={ingredient.id}>
                <td>
                  <div className="ingredient-info">
                    <span className="ingredient-name">{ingredient.name}</span>
                  </div>
                </td>
                <td>
                  <span className="category-badge">{ingredient.category}</span>
                </td>
                <td>{ingredient.unit}</td>
                <td>€{ingredient.cost.toFixed(2)}</td>
                <td>{ingredient.supplier}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-small primary">✏️</button>
                    <button className="btn-small danger">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}