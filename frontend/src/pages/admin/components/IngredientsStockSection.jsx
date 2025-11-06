import { useState, useEffect } from "react";

export default function IngredientsStockSection() {
  const [stock, setStock] = useState([]);

  useEffect(() => {
    const mockStock = [
      { 
        id: 1, 
        ingredient: 'Pomodoro', 
        quantity: 25, 
        unit: 'kg', 
        minLevel: 10,
        expiry: '2024-12-15',
        status: 'ok'
      },
      { 
        id: 2, 
        ingredient: 'Mozzarella', 
        quantity: 5, 
        unit: 'kg', 
        minLevel: 8,
        expiry: '2024-11-20',
        status: 'low'
      },
      { 
        id: 3, 
        ingredient: 'Farina 00', 
        quantity: 2, 
        unit: 'kg', 
        minLevel: 5,
        expiry: '2024-11-10',
        status: 'critical'
      },
    ];
    setStock(mockStock);
  }, []);

  const getStatusIcon = (status) => {
    const icons = {
      'ok': '🟢',
      'low': '🟡',
      'critical': '🔴',
      'expired': '💀'
    };
    return icons[status] || '⚪';
  };

  return (
    <div className="ingredients-stock-section">
      <div className="section-header">
        <div>
          <h2>🏪 Stock Ingredienti</h2>
          <p className="section-subtitle">
            {stock.length} ingredienti in stock • {stock.filter(s => s.status === 'critical').length} critici
          </p>
        </div>
        <button className="btn primary">+ Carico Merce</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Quantità</th>
              <th>Livello Min</th>
              <th>Scadenza</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {stock.map(item => (
              <tr key={item.id} className={`stock-row ${item.status}`}>
                <td>{item.ingredient}</td>
                <td>{item.quantity} {item.unit}</td>
                <td>{item.minLevel} {item.unit}</td>
                <td>{new Date(item.expiry).toLocaleDateString('it-IT')}</td>
                <td>
                  <span className={`status-badge ${item.status}`}>
                    {getStatusIcon(item.status)} {item.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-small primary">📥</button>
                    <button className="btn-small secondary">📊</button>
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