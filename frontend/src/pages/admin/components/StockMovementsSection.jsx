import { useState, useEffect } from "react";

export default function StockMovementsSection() {
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    const mockMovements = [
      { 
        id: 1, 
        type: 'entrata', 
        item: 'Pomodoro', 
        quantity: 10, 
        reason: 'Carico fornitore',
        date: '2024-11-05',
        user: 'admin'
      },
      { 
        id: 2, 
        type: 'uscita', 
        item: 'Mozzarella', 
        quantity: -2, 
        reason: 'Preparazione pizza',
        date: '2024-11-05',
        user: 'kitchen'
      },
    ];
    setMovements(mockMovements);
  }, []);

  const getTypeIcon = (type) => {
    return type === 'entrata' ? '📥' : '📤';
  };

  const getTypeColor = (type) => {
    return type === 'entrata' ? 'success' : 'info';
  };

  return (
    <div className="stock-movements-section">
      <div className="section-header">
        <div>
          <h2>📈 Movimenti Magazzino</h2>
          <p className="section-subtitle">{movements.length} movimenti registrati</p>
        </div>
        <button className="btn primary">+ Registra Movimento</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Articolo</th>
              <th>Quantità</th>
              <th>Motivo</th>
              <th>Data</th>
              <th>Utente</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(movement => (
              <tr key={movement.id}>
                <td>
                  <span className={`type-badge ${getTypeColor(movement.type)}`}>
                    {getTypeIcon(movement.type)} {movement.type}
                  </span>
                </td>
                <td>{movement.item}</td>
                <td className={movement.quantity > 0 ? 'positive' : 'negative'}>
                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                </td>
                <td>{movement.reason}</td>
                <td>{new Date(movement.date).toLocaleDateString('it-IT')}</td>
                <td>{movement.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}