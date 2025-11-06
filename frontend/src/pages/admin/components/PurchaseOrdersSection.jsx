import { useState, useEffect } from "react";

export default function PurchaseOrdersSection() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const mockOrders = [
      { 
        id: 1, 
        number: 'ORD-2024-001',
        supplier: 'Ortofrutta Rossi',
        date: '2024-11-05',
        total: 125.50,
        status: 'pending',
        items: 3
      },
      { 
        id: 2, 
        number: 'ORD-2024-002',
        supplier: 'Caseificio Bianchi',
        date: '2024-11-03',
        total: 89.00,
        status: 'delivered',
        items: 2
      },
    ];
    setOrders(mockOrders);
  }, []);

  const getStatusIcon = (status) => {
    const icons = {
      'draft': '📝',
      'pending': '⏳',
      'confirmed': '✅',
      'delivered': '📦',
      'cancelled': '❌'
    };
    return icons[status] || '❓';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Bozza',
      'pending': 'In attesa',
      'confirmed': 'Confermato',
      'delivered': 'Consegnato',
      'cancelled': 'Annullato'
    };
    return labels[status] || status;
  };

  return (
    <div className="purchase-orders-section">
      <div className="section-header">
        <div>
          <h2>📋 Ordini Acquisto</h2>
          <p className="section-subtitle">{orders.length} ordini totali</p>
        </div>
        <button className="btn primary">+ Nuovo Ordine</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Numero Ordine</th>
              <th>Fornitore</th>
              <th>Data</th>
              <th>Articoli</th>
              <th>Totale</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>
                  <strong>{order.number}</strong>
                </td>
                <td>{order.supplier}</td>
                <td>{new Date(order.date).toLocaleDateString('it-IT')}</td>
                <td>{order.items} articoli</td>
                <td>€{order.total.toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {getStatusIcon(order.status)} {getStatusLabel(order.status)}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-small primary">👁️</button>
                    <button className="btn-small secondary">✏️</button>
                    <button className="btn-small info">📧</button>
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