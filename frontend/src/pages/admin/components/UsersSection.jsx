import { useState, useEffect, useCallback } from "react";
import './UsersSection.css'

export default function UsersSection() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [changingPassword, setChangingPassword] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: ''
  });
  
  const [stats, setStats] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUsers();
    loadUserStats();
    loadCurrentUser();
  }, []);

  // ✅ ENHANCED: Auto-refresh quando cambiano i filtri con debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [users, filters]);

  // ✅ ENHANCED: Load current user
  const loadCurrentUser = async () => {
    try {
      console.log('👤 Loading current user...');
      
      const response = await fetch('/api/users/me', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentUser(data.user);
          console.log('✅ Current user loaded:', data.user.username);
        }
      }
    } catch (error) {
      console.error('❌ Error loading current user:', error);
      // Non bloccare l'interfaccia
    }
  };

  // ✅ ENHANCED: Load users with proper error handling
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading users...');
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch('/api/users', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessione scaduta. Effettua nuovamente il login.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Users loaded:', data.length);
      setUsers(data);
      
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setError(error.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Load user statistics from backend
  const loadUserStats = async () => {
    try {
      console.log('📊 Loading user statistics...');
      
      const response = await fetch('/api/users/stats', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setStats(data.stats || {});
          console.log('✅ User stats loaded:', data.stats);
        }
      }
    } catch (error) {
      console.error('❌ Error loading user stats:', error);
      // Fallback to local calculation
      console.log('⚠️ Falling back to local stats calculation');
    }
  };

  // ✅ NEW: Load user details
  const loadUserDetails = async (userId) => {
    try {
      console.log(`👀 Loading details for user ${userId}...`);
      
      const response = await fetch(`/api/users/${userId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setViewingUser(userData);
        console.log('✅ User details loaded:', userData);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel caricamento dettagli');
      }
    } catch (error) {
      console.error('❌ Error loading user details:', error);
      setError(`Errore dettagli utente: ${error.message}`);
    }
  };

  // ✅ ENHANCED: Filter users locally
  const filterUsers = useCallback(() => {
    let filtered = users;

    // Search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(term) ||
        user.first_name?.toLowerCase().includes(term) ||
        user.last_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        getFullName(user).toLowerCase().includes(term)
      );
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Status filter
    if (filters.status) {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(user => user.active === isActive);
    }

    setFilteredUsers(filtered);
  }, [users, filters]);

  // ✅ ENHANCED: Filter change handler
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value 
    }));
    
    // Reset error when changing filters
    if (error) {
      setError(null);
    }
  }, [error]);

  // ✅ ENHANCED: Delete user with better error handling
  const deleteUser = async (id, userDisplay) => {
    // Prevent self-deletion
    if (currentUser && currentUser.id === id) {
      setError('Non puoi eliminare il tuo stesso account!');
      return;
    }

    const confirmMessage = `Sei sicuro di voler eliminare l'utente "${userDisplay}"?

⚠️ ATTENZIONE:
- Questa operazione è irreversibile
- L'utente perderà immediatamente l'accesso

Continuare?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setError(null);
      console.log(`🗑️ Deleting user ${id}...`);
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }

      const result = await response.json();
      console.log('✅ User deleted:', result);
      
      setUsers(users.filter(user => user.id !== id));
      setSuccessMessage(`Utente "${userDisplay}" eliminato con successo`);
      
      // Refresh stats
      await loadUserStats();
      
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      setError(`Errore eliminazione: ${error.message}`);
    }
  };

  // ✅ ENHANCED: Toggle user status with better feedback
  const toggleUserStatus = async (id, currentStatus) => {
    // Prevent self-deactivation
    if (currentUser && currentUser.id === id && currentStatus) {
      setError('Non puoi disattivare il tuo stesso account!');
      return;
    }

    const newStatus = !currentStatus;
    const action = newStatus ? 'attivare' : 'disattivare';
    
    if (!window.confirm(`Sei sicuro di voler ${action} questo utente?`)) {
      return;
    }

    try {
      setError(null);
      console.log(`🔄 Toggling user ${id} status to ${newStatus}...`);
      
      // ✅ FIXED: Removed hardcoded URL
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ active: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento stato');
      }

      const result = await response.json();
      console.log('✅ User status updated:', result);
      
      setUsers(users.map(user => 
        user.id === id ? { ...user, active: newStatus } : user
      ));
      
      setSuccessMessage(`Utente ${newStatus ? 'attivato' : 'disattivato'} con successo`);
      
      // Refresh stats
      await loadUserStats();
      
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      setError(`Errore cambio stato: ${error.message}`);
    }
  };

  // ✅ ENHANCED: Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Helper functions
  const getFullName = (user) => {
    const parts = [];
    if (user.first_name) parts.push(user.first_name);
    if (user.last_name) parts.push(user.last_name);
    return parts.length > 0 ? parts.join(' ') : user.username || 'Utente';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': '👑',
      'waiter': '🍽️',
      'kitchen': '👨‍🍳',
      'cashier': '💰'
    };
    return icons[role] || '👤';
  };

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
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) return `${diffMinutes} min fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays <= 7) return `${diffDays} giorni fa`;
    return loginDate.toLocaleDateString('it-IT');
  };

  // ✅ ENHANCED: Use backend stats with fallback
  const getStatsValue = (key, fallbackCalculation) => {
    return stats[key] !== undefined ? stats[key] : fallbackCalculation();
  };

  if (loading && users.length === 0) {
    return (
      <div className="users-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento utenti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-section">
      {/* Enhanced Error Banner */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Enhanced Success Banner */}
      {successMessage && (
        <div className="success-banner">
          <span className="success-icon">✅</span>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="success-close">×</button>
        </div>
      )}

      {/* Enhanced Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>👥 Gestione Utenti</h2>
          <p className="section-subtitle">
            {getStatsValue('total_users', () => users.length)} utenti totali • 
            {getStatsValue('active_users', () => users.filter(u => u.active).length)} attivi • 
            {getStatsValue('new_today', () => 0)} nuovi oggi
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              loadUsers();
              loadUserStats();
              loadCurrentUser();
            }}
            disabled={loading}
            title="Aggiorna dati utenti"
          >
            {loading ? '⏳' : '🔄'} Aggiorna
          </button>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Aggiungi Utente
          </button>
        </div>
      </div>

      {/* ✅ ENHANCED: Statistics with backend data */}
      <div className="users-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">👑</span>
          <div>
            <div className="stat-number">
              {getStatsValue('admin_users', () => users.filter(u => u.role === 'admin').length)}
            </div>
            <div className="stat-label">Admin</div>
          </div>
        </div>
        <div className="stat-card mini primary">
          <span className="stat-icon">🍽️</span>
          <div>
            <div className="stat-number">
              {getStatsValue('waiter_users', () => users.filter(u => u.role === 'waiter').length)}
            </div>
            <div className="stat-label">Camerieri</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">👨‍🍳</span>
          <div>
            <div className="stat-number">
              {getStatsValue('kitchen_users', () => users.filter(u => u.role === 'kitchen').length)}
            </div>
            <div className="stat-label">Cucina</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-number">
              {getStatsValue('cashier_users', () => users.filter(u => u.role === 'cashier').length)}
            </div>
            <div className="stat-label">Cassieri</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">
              {getStatsValue('active_users', () => users.filter(u => u.active).length)}
            </div>
            <div className="stat-label">Attivi</div>
          </div>
        </div>
        <div className="stat-card mini tertiary">
          <span className="stat-icon">📈</span>
          <div>
            <div className="stat-number">
              {getStatsValue('active_today', () => 0)}
            </div>
            <div className="stat-label">Online Oggi</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per username, nome, email..."
            className="search-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={filters.role}
          onChange={(e) => handleFilterChange('role', e.target.value)}
        >
          <option value="">Tutti i ruoli</option>
          <option value="admin">👑 Amministratore</option>
          <option value="waiter">🍽️ Cameriere</option>
          <option value="kitchen">👨‍🍳 Cucina</option>
          <option value="cashier">💰 Cassiere</option>
        </select>

        <select 
          className="filter-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">Tutti gli stati</option>
          <option value="active">✅ Attivi</option>
          <option value="inactive">❌ Inattivi</option>
        </select>

        {Object.values(filters).some(v => v) && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setFilters({
                search: '',
                role: '',
                status: ''
              });
            }}
            title="Pulisci tutti i filtri"
          >
            🧹 Pulisci
          </button>
        )}
      </div>

      {/* Enhanced Users Table */}
      <div className="table-container">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <h3>Nessun utente trovato</h3>
            <p>
              {loading 
                ? "Caricamento in corso..." 
                : users.length === 0 
                  ? "Inizia aggiungendo il primo utente"
                  : "Nessun utente corrisponde ai filtri selezionati"
              }
            </p>
            <div className="empty-actions">
              <button 
                className="btn primary"
                onClick={() => setShowAddModal(true)}
              >
                + Aggiungi Primo Utente
              </button>
              {Object.values(filters).some(v => v) && (
                <button 
                  className="btn secondary" 
                  onClick={() => {
                    setFilters({
                      search: '',
                      role: '',
                      status: ''
                    });
                  }}
                >
                  🔄 Reset Filtri
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
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
                  <tr key={user.id} className={!user.active ? 'user-inactive' : ''}>
                    <td>
                      <div className="user-info">
                        <span className="user-avatar">
                          {getRoleIcon(user.role)}
                        </span>
                        <div>
                          <div className="user-name">
                            {getFullName(user)}
                            {currentUser && currentUser.id === user.id && (
                              <span className="current-user-badge">Tu</span>
                            )}
                          </div>
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
                        disabled={currentUser && currentUser.id === user.id}
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
                          onClick={() => loadUserDetails(user.id)}
                          title="Visualizza dettagli"
                        >
                          👁️
                        </button>
                        <button 
                          className="btn-small info"
                          onClick={() => setChangingPassword(user)}
                          title="Cambia password"
                        >
                          🔑
                        </button>
                        <button 
                          className="btn-small danger"
                          onClick={() => deleteUser(user.id, getFullName(user))}
                          title="Elimina utente"
                          disabled={currentUser && currentUser.id === user.id}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Enhanced Table Footer */}
            <div className="table-footer">
              <div className="table-summary">
                <span>
                  Visualizzati: <strong>{filteredUsers.length}</strong> utenti • 
                  Attivi: <strong>{filteredUsers.filter(u => u.active).length}</strong> • 
                  Admin: <strong>{filteredUsers.filter(u => u.role === 'admin').length}</strong>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ✅ ENHANCED: Modal Add/Edit allineato con backend */}
      {(showAddModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          onSave={async (savedUser) => {
            setShowAddModal(false);
            setEditingUser(null);
            
            // ✅ ENHANCED: Show success message
            const operation = editingUser ? 'aggiornato' : 'creato';
            setSuccessMessage(
              `Utente ${operation} con successo! ${savedUser?.username ? 
                `(${savedUser.username})` : 
                ''}`
            );
            
            await loadUsers();
            await loadUserStats();
          }}
        />
      )}

      {/* ✅ NEW: User Details Modal */}
      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          currentUser={currentUser}
          onClose={() => setViewingUser(null)}
          onEdit={() => {
            setEditingUser(viewingUser);
            setViewingUser(null);
          }}
        />
      )}

      {/* ✅ NEW: Password Change Modal */}
      {changingPassword && (
        <PasswordChangeModal
          user={changingPassword}
          onClose={() => setChangingPassword(null)}
          onSuccess={(message) => {
            setChangingPassword(null);
            setSuccessMessage(message);
          }}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED: Modal allineato con backend API
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
  const [error, setError] = useState(null);

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
    setError(null);

    try {
        // ✅ FIXED: Removed hardcoded URL
        const url = user 
            ? `/api/users/${user.id}`
            : '/api/users';

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
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(dataToSend)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        const responseData = await response.json();
        // Il backend restituisce l'oggetto user direttamente o dentro .user
        const userData = responseData.user || responseData;
        
        console.log('✅ User saved:', userData);
        onSave(userData);
        
    } catch (error) {
        console.error('❌ Error saving user:', error);
        setError(error.message);
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
    
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content user-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {user ? `✏️ Modifica ${user.username}` : '👥 Nuovo Utente'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

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
                {errors.username && <span className="error-text">{errors.username}</span>}
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
                {errors.email && <span className="error-text">{errors.email}</span>}
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
              {errors.phone && <span className="error-text">{errors.phone}</span>}
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
              {errors.password && <span className="error-text">{errors.password}</span>}
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
                <small className="form-help">
                  Gli utenti inattivi non potranno accedere al sistema
                </small>
              </div>
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
              {saving ? (
                <>
                  <div className="btn-spinner"></div>
                  {user ? 'Aggiornando...' : 'Creando...'}
                </>
              ) : (
                user ? '💾 Aggiorna Utente' : '👥 Crea Utente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ NEW: User Details Modal
function UserDetailsModal({ user, currentUser, onClose, onEdit }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFullName = (user) => {
    const parts = [];
    if (user.first_name) parts.push(user.first_name);
    if (user.last_name) parts.push(user.last_name);
    return parts.length > 0 ? parts.join(' ') : user.username || 'Utente';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': '👑',
      'waiter': '🍽️',
      'kitchen': '👨‍🍳',
      'cashier': '💰'
    };
    return icons[role] || '👤';
  };

  const getRoleLabel = (role) => {
    const labels = {
      'admin': 'Amministratore',
      'waiter': 'Cameriere',
      'kitchen': 'Cucina',
      'cashier': 'Cassiere'
    };
    return labels[role] || role;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>👁️ Dettagli Utente: {getFullName(user)}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="user-details">
            <div className="details-section">
              <h4>👤 Informazioni Generali</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>ID:</strong> {user.id}
                </div>
                <div className="detail-item">
                  <strong>Nome Completo:</strong> {getFullName(user)}
                  {currentUser && currentUser.id === user.id && (
                    <span className="current-user-badge">Tu</span>
                  )}
                </div>
                <div className="detail-item">
                  <strong>Username:</strong> @{user.username}
                </div>
                <div className="detail-item">
                  <strong>Email:</strong> 
                  <a href={`mailto:${user.email}`} className="contact-link">
                    {user.email}
                  </a>
                </div>
                {user.phone && (
                  <div className="detail-item">
                    <strong>Telefono:</strong> 
                    <a href={`tel:${user.phone}`} className="contact-link">
                      {user.phone}
                    </a>
                  </div>
                )}
                <div className="detail-item">
                  <strong>Ruolo:</strong> 
                  <span className={`role-badge ${user.role}`}>
                    {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Stato:</strong> 
                  <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                    {user.active ? '✅ Attivo' : '❌ Inattivo'}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Registrato:</strong> {formatDate(user.created_at)}
                </div>
                <div className="detail-item">
                  <strong>Ultima modifica:</strong> {formatDate(user.updated_at)}
                </div>
                <div className="detail-item">
                  <strong>Ultimo accesso:</strong> {formatDate(user.last_login)}
                </div>
              </div>
            </div>

            {/* Additional sections could be added here for permissions, activity log, etc. */}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button type="button" className="btn primary" onClick={onEdit}>
            ✏️ Modifica Utente
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ NEW: Password Change Modal
function PasswordChangeModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('La nuova password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔑 Changing password for user ${user.id}...`);
      
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel cambio password');
      }

      const result = await response.json();
      console.log('✅ Password changed successfully:', result);
      
      onSuccess(`Password cambiata con successo per ${user.username}`);
      
    } catch (error) {
      console.error('❌ Error changing password:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      setError(null);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content password-modal">
        <div className="modal-header">
          <h3>🔑 Cambia Password: {user.username}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password Attuale *</label>
              <div className="password-input-container">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  name="currentPassword"
                  className="form-input"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  placeholder="Inserisci password attuale"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nuova Password *</label>
              <div className="password-input-container">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  name="newPassword"
                  className="form-input"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  placeholder="Inserisci nuova password"
                  minLength="6"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? '🙈' : '👁️'}
                </button>
              </div>
              <small className="form-help">
                Minimo 6 caratteri
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Conferma Nuova Password *</label>
              <div className="password-input-container">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  name="confirmPassword"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Conferma nuova password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className="btn primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Cambiando...
                </>
              ) : (
                '🔑 Cambia Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}