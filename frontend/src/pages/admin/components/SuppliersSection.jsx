import { useState, useEffect } from "react";

export default function SuppliersSection() {
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const mockSuppliers = [
      { 
        id: 1, 
        name: 'Ortofrutta Rossi', 
        category: 'Verdure',
        contact: 'Mario Rossi',
        phone: '+39 123 456 789',
        email: 'info@ortofruttarossi.it',
        status: 'attivo'
      },
      { 
        id: 2, 
        name: 'Caseificio Bianchi', 
        category: 'Latticini',
        contact: 'Luigi Bianchi',
        phone: '+39 987 654 321',
        email: 'ordini@caseificiobianchi.it',
        status: 'attivo'
      },
    ];
    setSuppliers(mockSuppliers);
  }, []);

  return (
    <div className="suppliers-section">
      <div className="section-header">
        <div>
          <h2>🚚 Gestione Fornitori</h2>
          <p className="section-subtitle">{suppliers.length} fornitori attivi</p>
        </div>
        <button className="btn primary">+ Aggiungi Fornitore</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fornitore</th>
              <th>Categoria</th>
              <th>Contatto</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(supplier => (
              <tr key={supplier.id}>
                <td>
                  <div className="supplier-info">
                    <strong>{supplier.name}</strong>
                  </div>
                </td>
                <td>
                  <span className="category-badge">{supplier.category}</span>
                </td>
                <td>{supplier.contact}</td>
                <td>
                  <a href={`tel:${supplier.phone}`} className="phone-link">
                    {supplier.phone}
                  </a>
                </td>
                <td>
                  <a href={`mailto:${supplier.email}`} className="email-link">
                    {supplier.email}
                  </a>
                </td>
                <td>
                  <span className={`status-badge ${supplier.status}`}>
                    {supplier.status === 'attivo' ? '🟢' : '🔴'} {supplier.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-small primary">✏️</button>
                    <button className="btn-small secondary">📋</button>
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