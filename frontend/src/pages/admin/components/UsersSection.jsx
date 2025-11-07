import { useState, useEffect } from "react";
import './UsersSection.css'

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
      console.log('🔄 Loading users...');
      
      const response = await fetch('http://localhost:3000/api/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Users loaded:', data.length);
        setUsers(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Error loading users:', errorText);
        setError('Errore nel caricamento utenti');
      }
    } catch (error) {
      console.error('🚨 Network error loading users:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filtro per testo (username, nome, cognome, email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(term) ||
        user.first_name?.toLowerCase().includes(term) ||
        user.last_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        getFullName(user).toLowerCase().includes(term)
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

  // Funzione helper per ottenere il nome completo
  const getFullName = (user) => {
    const parts = [];
    if (user.first_name) parts.push(user.first_name);
    if (user.last_name) parts.push(user.last_name);
    return parts.length > 0 ? parts.join(' ') : user.username || 'Utente';
  };

  const deleteUser = async (id, userDisplay) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'utente "${userDisplay}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== id)); // CORRETTO: aggiungi parentesi
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
        setUsers(users.map(user => 
          user.id === id ? { ...user, active: !currentStatus } : user
        ));
        alert(`Utente ${!currentStatus ? 'attivato' : 'disattivato'} con successo`);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Errore di rete');
    }
  };

  // Aggiornato per i nuovi ruoli del database
  const getRoleIcon = (role) => {
    const icons = {
      'admin': '👑',
      'waiter': '🍽️',
      'kitchen': '👨‍🍳',
      'cashier': '💰'
    };
    return icons[role] || '👤';
  };

  // Traduzione ruoli per display
  const getRoleLabel = (role) => {
    const labels = {
      'admin': 'Amministratore',
      'waiter': 'Cameriere',
      'kitchen': 'Cucina',
      'cashier': 'Cassiere'
    };
    return labels[role] || role;
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

      {/* Statistiche rapide - aggiornate per i nuovi ruoli */}
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
              {users.filter(u => u.role === 'waiter').length}
            </div>
            <div className="stat-label">Camerieri</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">👨‍🍳</span>
          <div>
            <div className="stat-number">
              {users.filter(u => u.role === 'kitchen').length}
            </div>
            <div className="stat-label">Cucina</div>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">
              {users.filter(u => u.role === 'cashier').length}
            </div>
            <div className="stat-label">Cassieri</div>
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

      {/* Filtri - aggiornati per i nuovi ruoli */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per username, nome, email..."
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
          <option value="admin">👑 Amministratore</option>
          <option value="waiter">🍽️ Cameriere</option>
          <option value="kitchen">👨‍🍳 Cucina</option>
          <option value="cashier">💰 Cassiere</option>
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

      {/* Tabella Utenti - aggiornata per i nuovi campi */}
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
                <th>Username</th>
                <th>Email</th>
                <th>Telefono</th>
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
                        <div className="user-name">{getFullName(user)}</div>
                        <div className="user-id">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="username">@{user.username}</span>
                  </td>
                  <td>
                    <a href={`mailto:${user.email}`} className="email-link">
                      {user.email}
                    </a>
                  </td>
                  <td>
                    {user.phone ? (
                      <a href={`tel:${user.phone}`} className="phone-link">
                        {user.phone}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {getRoleIcon(user.role)} {getRoleLabel(user.role)}
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
                        onClick={() => deleteUser(user.id, getFullName(user))}
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

// Modal per aggiungere/modificare utente - AGGIORNATO
function UserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: user?.role || 'waiter',
    active: user?.active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username è obbligatorio';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username deve essere almeno 3 caratteri';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email è obbligatoria';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = 'Password è obbligatoria per nuovi utenti';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password deve essere almeno 6 caratteri';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]{8,}$/.test(formData.phone)) {
      newErrors.phone = 'Numero di telefono non valido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    setSaving(true);

    try {
        // CORRETTO: per nuovi utenti usa il controller users direttamente
        const url = user 
            ? `http://localhost:3000/api/users/${user.id}`
            : 'http://localhost:3000/api/users'; // NON /register ma la route users normale

        const method = user ? 'PUT' : 'POST';

        // Prepara i dati da inviare
        const dataToSend = { ...formData };
        
        // Per gli aggiornamenti, rimuovi password se vuota
        if (user && !formData.password.trim()) {
            delete dataToSend.password;
        }

        // Rimuovi campi vuoti opzionali
        if (!dataToSend.first_name?.trim()) dataToSend.first_name = null;
        if (!dataToSend.last_name?.trim()) dataToSend.last_name = null;
        if (!dataToSend.phone?.trim()) dataToSend.phone = null;

        console.log('💾 Saving user:', { ...dataToSend, password: '[HIDDEN]' });

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(dataToSend)
        });

        if (response.ok) {
            const responseData = await response.json();
            // Il backend restituisce l'oggetto user direttamente o dentro .user
            const userData = responseData.user || responseData;
            
            console.log('✅ User saved:', userData);
            onSave(userData);
            alert(user ? 'Utente aggiornato!' : 'Utente creato!');
        } else {
            const errorData = await response.json();
            console.error('❌ Error saving user:', errorData);
            alert(errorData.message || errorData.error || 'Errore nel salvare l\'utente');
        }
    } catch (error) {
        console.error('🚨 Network error saving user:', error);
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
    
    // Rimuovi errore quando l'utente corregge
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content user-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {user ? `Modifica ${user.username}` : 'Nuovo Utente'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                type="text"
                name="username"
                className={`form-input ${errors.username ? 'error' : ''}`}
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="username_unico"
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="email@esempio.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input
                type="text"
                name="first_name"
                className="form-input"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Nome"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cognome</label>
              <input
                type="text"
                name="last_name"
                className="form-input"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Cognome"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Telefono</label>
            <input
              type="tel"
              name="phone"
              className={`form-input ${errors.phone ? 'error' : ''}`}
              value={formData.phone}
              onChange={handleChange}
              placeholder="+39 123 456 7890"
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Password {!user && '*'}
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
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
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ruolo *</label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="waiter">🍽️ Cameriere</option>
                <option value="kitchen">👨‍🍳 Cucina</option>
                <option value="cashier">💰 Cassiere</option>
                <option value="admin">👑 Amministratore</option>
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