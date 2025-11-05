import { useState, useEffect } from "react";

export default function UsersSection() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtra utenti quando cambiano i filtri
  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3000/api/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Errore nel caricamento utenti');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filtro per testo (nome o email)
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro per ruolo
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtro per stato
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.active === isActive);
    }

    setFilteredUsers(filtered);
  };

  const deleteUser = async (id, userName) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'utente "${userName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== id));
        alert('Utente eliminato con successo');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Errore nell\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Errore di rete');
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ active: !currentStatus })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(user => 
          user.id === id ? { ...user, active: !currentStatus } : user
        ));
        alert(`Utente ${!currentStatus ? 'attivato' : 'disattivato'} con successo`);
      } else {
        alert('Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Errore di rete');
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': '👑',
      'cameriere': '🍽️',
      'cuoco': '👨‍🍳',
      'barista': '🍹',
      'manager': '📊'
    };
    return icons[role] || '👤';
  };

  const getLastLoginText = (lastLogin) => {
    if (!lastLogin) return 'Mai';
    
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffTime = Math.abs(now - loginDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Oggi';
    if (diffDays === 2) return 'Ieri';
    if (diffDays <= 7) return `${diffDays} giorni fa`;
    return loginDate.toLocaleDateString('it-IT');
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Caricamento utenti...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <h3>Errore nel caricamento</h3>
        <p>{error}</p>
        <button className="btn primary" onClick={loadUsers}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="users-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>👥 Gestione Utenti</h2>
          <p className="section-subtitle">
            {users.length} utenti totali • {users.filter(u => u.active).length} attivi
          </p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowAddModal(true)}
        >
          + Aggiungi Utente
        </button>
      </div>

      {/* Statistiche rapide */}
      <div className="users-stats">
        <div className="stat-card mini">
          <span className="stat-icon">👑</span>
          <div>
            <div className="stat-number">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <div className="stat-label">Admin</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">🍽️</span>
          <div>
            <div className="stat-number">
              {users.filter(u => u.role === 'cameriere').length}
            </div>
            <div className="stat-label">Camerieri</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">👨‍🍳</span>
          <div>
            <div className="stat-number">
              {users.filter(u => u.role === 'cuoco').length}
            </div>
            <div className="stat-label">Cuochi</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">
              {users.filter(u => u.active).length}
            </div>
            <div className="stat-label">Attivi</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tutti i ruoli</option>
          <option value="admin">Admin</option>
          <option value="cameriere">Cameriere</option>
          <option value="cuoco">Cuoco</option>
          <option value="barista">Barista</option>
          <option value="manager">Manager</option>
        </select>

        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tutti gli stati</option>
          <option value="active">Attivi</option>
          <option value="inactive">Inattivi</option>
        </select>

        {(searchTerm || roleFilter || statusFilter) && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setRoleFilter("");
              setStatusFilter("");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Tabella Utenti */}
      <div className="table-container">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <h3>Nessun utente trovato</h3>
            <p>
              {users.length === 0 
                ? "Inizia aggiungendo il primo utente"
                : "Prova a modificare i filtri di ricerca"
              }
            </p>
            {users.length === 0 && (
              <button 
                className="btn primary"
                onClick={() => setShowAddModal(true)}
              >
                Aggiungi Primo Utente
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Utente</th>
                <th>Email</th>
                <th>Ruolo</th>
                <th>Stato</th>
                <th>Ultimo Accesso</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <span className="user-avatar">
                        {getRoleIcon(user.role)}
                      </span>
                      <div>
                        <div className="user-name">{user.name}</div>
                        <div className="user-id">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <a href={`mailto:${user.email}`} className="email-link">
                      {user.email}
                    </a>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {getRoleIcon(user.role)} {user.role}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`status-toggle ${user.active ? 'active' : 'inactive'}`}
                      onClick={() => toggleUserStatus(user.id, user.active)}
                      title={`Clicca per ${user.active ? 'disattivare' : 'attivare'}`}
                    >
                      <span className="status-dot"></span>
                      {user.active ? 'Attivo' : 'Inattivo'}
                    </button>
                  </td>
                  <td className="last-login">
                    {getLastLoginText(user.last_login)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-small primary"
                        onClick={() => setEditingUser(user)}
                        title="Modifica utente"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-small secondary"
                        onClick={() => alert('Funzione non ancora implementata')}
                        title="Visualizza dettagli"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-small danger"
                        onClick={() => deleteUser(user.id, user.name)}
                        title="Elimina utente"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Aggiungi/Modifica Utente */}
      {(showAddModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          onSave={(savedUser) => {
            if (editingUser) {
              // Aggiorna utente esistente
              setUsers(users.map(u => 
                u.id === savedUser.id ? savedUser : u
              ));
            } else {
              // Aggiungi nuovo utente
              setUsers([...users, savedUser]);
            }
            setShowAddModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

// Modal per aggiungere/modificare utente
function UserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'cameriere',
    active: user?.active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Validazione base
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Nome e email sono obbligatori');
      setSaving(false);
      return;
    }

    if (!user && !formData.password.trim()) {
      alert('Password è obbligatoria per nuovi utenti');
      setSaving(false);
      return;
    }

    try {
      const url = user 
        ? `http://localhost:3000/api/users/${user.id}`
        : 'http://localhost:3000/api/users/register';
      
      const method = user ? 'PUT' : 'POST';

      // Prepara i dati da inviare
      const dataToSend = { ...formData };
      if (user && !formData.password.trim()) {
        delete dataToSend.password; // Non inviare password vuota per aggiornamenti
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        const savedUser = await response.json();
        // Se è una registrazione, il backend potrebbe restituire l'oggetto user
        const userData = savedUser.user || savedUser;
        onSave(userData);
        alert(user ? 'Utente aggiornato!' : 'Utente creato!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Errore nel salvare l\'utente');
      }
    } catch (error) {
      console.error('Error saving user:', error);
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            {user ? `Modifica ${user.name}` : 'Nuovo Utente'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Inserisci nome e cognome"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="email@esempio.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Password {!user && '*'}
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required={!user}
                placeholder={user ? "Lascia vuoto per non modificare" : "Inserisci password"}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ruolo *</label>
            <select
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="cameriere">🍽️ Cameriere</option>
              <option value="cuoco">👨‍🍳 Cuoco</option>
              <option value="barista">🍹 Barista</option>
              <option value="manager">📊 Manager</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <span className="checkbox-label">Utente attivo</span>
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
              {saving ? 'Salvando...' : (user ? 'Aggiorna' : 'Crea Utente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}