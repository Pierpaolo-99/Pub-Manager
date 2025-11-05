import { useState, useEffect } from "react";

export default function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/users', {
        credentials: 'include'
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Caricamento utenti...</div>;
  }

  return (
    <div className="users-section">
      <div className="section-header">
        <h2>👥 Gestione Utenti</h2>
        <button className="btn primary">+ Aggiungi Utente</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Ruolo</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                    {user.active ? 'Attivo' : 'Inattivo'}
                  </span>
                </td>
                <td>
                  <button className="btn-small primary">Modifica</button>
                  <button className="btn-small danger">Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}