import { useState, useEffect, useCallback } from "react";
import './TablesSection.css';

export default function TablesSection() {
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [showQRModal, setShowQRModal] = useState(null);
  const [viewingTable, setViewingTable] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    status: '',
    capacity: '',
    active: 'all'
  });
  
  const [stats, setStats] = useState({});
  const [locations, setLocations] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    fetchTables();
    fetchTablesStats();
    fetchLocations();
  }, []);

  // ✅ ENHANCED: Auto-refresh quando cambiano i filtri con debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search.length >= 1 || filters.search.length === 0) {
        fetchTables();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // ✅ ENHANCED: Fetch tables with proper error handling
  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          // ✅ FIXED: Map frontend field names to backend
          const backendKey = key === 'search' ? undefined : 
                            key === 'location' ? 'location' : key;
          if (backendKey) {
            params.append(backendKey, value);
          }
        }
      });
      
      console.log('🪑 Fetching tables with filters:', Object.fromEntries(params));
      
      // ✅ FIXED: Use actual API endpoint
      const response = await fetch(`/api/tables?${params}`, {
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
      console.log('✅ Tables data received:', data);
      
      // ✅ ENHANCED: Validate response structure
      if (!data.success) {
        throw new Error(data.error || 'Risposta del server non valida');
      }
      
      // ✅ ENHANCED: Map backend data to frontend format
      const mappedTables = (data.tables || []).map(table => ({
        ...table,
        // ✅ FIXED: Map location to area for frontend compatibility
        area: table.location || 'interno',
        // ✅ FIXED: Map qr_code to qrCode for frontend compatibility
        qrCode: table.qr_code,
        // ✅ FIXED: Map backend status to frontend format
        status: mapDbStatusToFrontend(table.status),
        // Keep backend fields for API calls
        location: table.location,
        qr_code: table.qr_code,
        db_status: table.status
      }));
      
      setTables(mappedTables);
      
      // Apply local search filter if present
      filterTablesLocal(mappedTables);
      
      console.log(`✅ Loaded ${mappedTables.length} tables`);
      
    } catch (err) {
      console.error('❌ Error fetching tables:', err);
      setError(err.message);
      setTables([]);
      setFilteredTables([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Fetch tables statistics
  const fetchTablesStats = async () => {
    try {
      console.log('📊 Fetching tables statistics...');
      
      const response = await fetch('/api/tables/stats', {
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
          console.log('✅ Tables stats loaded:', data.stats);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching tables stats:', err);
      // Non bloccare l'interfaccia
    }
  };

  // ✅ NEW: Fetch available locations
  const fetchLocations = async () => {
    try {
      console.log('📍 Fetching locations...');
      
      const response = await fetch('/api/tables/locations', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || ['interno', 'esterno']);
        console.log('✅ Locations loaded:', data.locations);
      } else {
        // Fallback to default locations
        setLocations(['interno', 'esterno']);
      }
    } catch (err) {
      console.error('❌ Error fetching locations:', err);
      setLocations(['interno', 'esterno']);
    }
  };

  // ✅ NEW: View table details with current order
  const handleViewTable = async (table) => {
    try {
      console.log(`👀 Loading details for table ${table.id}...`);
      
      const response = await fetch(`/api/tables/${table.id}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const tableDetails = {
            ...data.table,
            area: data.table.location || 'interno',
            qrCode: data.table.qr_code,
            status: mapDbStatusToFrontend(data.table.status)
          };
          setViewingTable(tableDetails);
          console.log('✅ Table details loaded:', tableDetails);
        }
      } else {
        setViewingTable(table);
      }
    } catch (err) {
      console.error('❌ Error loading table details:', err);
      setViewingTable(table);
    }
  };

  // ✅ ENHANCED: Filter tables locally for search
  const filterTablesLocal = (tablesToFilter) => {
    let filtered = tablesToFilter || tables;

    // Apply search filter locally
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(table =>
        table.number.toString().includes(term) ||
        table.notes?.toLowerCase().includes(term) ||
        table.qrCode?.toLowerCase().includes(term) ||
        table.qr_code?.toLowerCase().includes(term)
      );
    }

    setFilteredTables(filtered);
  };

  // ✅ ENHANCED: Filter change with API integration
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

  // ✅ ENHANCED: Change table status with API integration
  const changeTableStatus = async (tableId, newStatus) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const confirmMessage = `Cambiare stato del Tavolo ${table.number} a "${getStatusLabel(newStatus)}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      setError(null);
      console.log(`🔄 Changing table ${tableId} status to ${newStatus}...`);
      
      // ✅ FIXED: Map frontend status to backend
      const backendStatus = mapFrontendStatusToDb(newStatus);
      
      const response = await fetch(`/api/tables/${tableId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: backendStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel cambio stato');
      }

      const result = await response.json();
      console.log('✅ Table status updated:', result);
      
      setSuccessMessage(`Stato del Tavolo ${table.number} cambiato in "${getStatusLabel(newStatus)}"`);
      
      // Refresh tables
      await fetchTables();
      await fetchTablesStats();
      
    } catch (err) {
      console.error('❌ Error changing table status:', err);
      setError(`Errore cambio stato: ${err.message}`);
    }
  };

  // ✅ ENHANCED: Delete table with API integration
  const deleteTable = async (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.status === 'occupato') {
      alert('Non puoi eliminare un tavolo occupato!');
      return;
    }

    const confirmMessage = `Eliminare definitivamente il Tavolo ${table.number}?

⚠️ ATTENZIONE:
- Se ci sono ordini attivi, l'operazione non sarà permessa
- Questa operazione è irreversibile

Continuare?`;

    if (!confirm(confirmMessage)) return;

    try {
      setError(null);
      console.log(`🗑️ Deleting table ${tableId}...`);
      
      const response = await fetch(`/api/tables/${tableId}`, {
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
      console.log('✅ Table deleted:', result);
      
      setSuccessMessage(`Tavolo ${table.number} eliminato con successo`);
      
      // Refresh data
      await fetchTables();
      await fetchTablesStats();
      
    } catch (err) {
      console.error('❌ Error deleting table:', err);
      setError(`Errore eliminazione: ${err.message}`);
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

  // ✅ ENHANCED: Status mapping functions
  const mapDbStatusToFrontend = (dbStatus) => {
    const mapping = {
      'free': 'libero',
      'occupied': 'occupato',
      'reserved': 'riservato',
      'cleaning': 'pulizia'
    };
    return mapping[dbStatus] || dbStatus;
  };

  const mapFrontendStatusToDb = (frontendStatus) => {
    const mapping = {
      'libero': 'free',
      'occupato': 'occupied',
      'riservato': 'reserved',
      'pulizia': 'cleaning',
      'fuori_servizio': 'cleaning' // Map to cleaning for now
    };
    return mapping[frontendStatus] || frontendStatus;
  };

  // ✅ ENHANCED: Status helper functions
  const getStatusIcon = (status) => {
    const icons = {
      'libero': '🟢',
      'occupato': '🔴', 
      'riservato': '🟡',
      'pulizia': '🔵',
      'fuori_servizio': '⚫'
    };
    return icons[status] || '⚪';
  };

  const getStatusColor = (status) => {
    const colors = {
      'libero': 'success',
      'occupato': 'danger',
      'riservato': 'warning', 
      'pulizia': 'info',
      'fuori_servizio': 'dark'
    };
    return colors[status] || 'secondary';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'libero': 'Libero',
      'occupato': 'Occupato',
      'riservato': 'Riservato',
      'pulizia': 'Pulizia',
      'fuori_servizio': 'Fuori Servizio'
    };
    return labels[status] || status;
  };

  const getCapacityIcon = (capacity) => {
    if (capacity <= 2) return '👥';
    if (capacity <= 4) return '👨‍👩‍👧';
    if (capacity <= 6) return '👨‍👩‍👧‍👦';
    return '🏢';
  };

  const generateQRCode = (table) => {
    const qrData = {
      tableId: table.id,
      tableNumber: table.number,
      pubUrl: `${window.location.origin}/table/${table.qrCode || table.qr_code}`
    };
    
    setShowQRModal(qrData);
  };

  const getLastOccupiedText = (lastOccupied) => {
    if (!lastOccupied) return 'Mai';
    
    const now = new Date();
    const occupiedDate = new Date(lastOccupied);
    const diffTime = Math.abs(now - occupiedDate);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) return `${diffMinutes} min fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays <= 7) return `${diffDays} giorni fa`;
    return occupiedDate.toLocaleDateString('it-IT');
  };

  // ✅ ENHANCED: Use backend stats
  const getTotalCapacity = () => {
    return stats.total_capacity || tables.reduce((total, table) => total + table.capacity, 0);
  };

  const getAvailableCapacity = () => {
    return stats.available_capacity || tables
      .filter(table => table.status === 'libero')
      .reduce((total, table) => total + table.capacity, 0);
  };

  if (loading && tables.length === 0) {
    return (
      <div className="tables-section">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento tavoli...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tables-section">
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

      {/* Header enhanced */}
      <div className="section-header">
        <div className="header-left">
          <h2>🪑 Gestione Tavoli</h2>
          <p className="section-subtitle">
            {stats.total || tables.length} tavoli • 
            {stats.free || tables.filter(t => t.status === 'libero').length} liberi • 
            {getAvailableCapacity()}/{getTotalCapacity()} posti disponibili
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={() => {
              fetchTables();
              fetchTablesStats();
              fetchLocations();
            }}
            disabled={loading}
            title="Aggiorna dati tavoli"
          >
            {loading ? '⏳' : '🔄'} Aggiorna
          </button>
          <div className="view-toggle">
            <button 
              className={`btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista griglia"
            >
              ⊞
            </button>
            <button 
              className={`btn-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              ☰
            </button>
          </div>
          <button 
            className="btn primary" 
            onClick={() => setShowAddModal(true)}
          >
            + Aggiungi Tavolo
          </button>
        </div>
      </div>

      {/* ✅ ENHANCED: Statistiche con dati backend */}
      <div className="tables-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">{stats.free || tables.filter(t => t.status === 'libero').length}</div>
            <div className="stat-label">Liberi</div>
          </div>
        </div>
        <div className="stat-card mini danger">
          <span className="stat-icon">🔴</span>
          <div>
            <div className="stat-number">{stats.occupied || tables.filter(t => t.status === 'occupato').length}</div>
            <div className="stat-label">Occupati</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">🟡</span>
          <div>
            <div className="stat-number">{stats.reserved || tables.filter(t => t.status === 'riservato').length}</div>
            <div className="stat-label">Riservati</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">🔵</span>
          <div>
            <div className="stat-number">{stats.cleaning || tables.filter(t => t.status === 'pulizia').length}</div>
            <div className="stat-label">Pulizia</div>
          </div>
        </div>
        <div className="stat-card mini secondary">
          <span className="stat-icon">👥</span>
          <div>
            <div className="stat-number">{getTotalCapacity()}</div>
            <div className="stat-label">Posti Tot.</div>
          </div>
        </div>
        <div className="stat-card mini primary">
          <span className="stat-icon">📊</span>
          <div>
            <div className="stat-number">{stats.avg_capacity ? stats.avg_capacity.toFixed(1) : '0.0'}</div>
            <div className="stat-label">Media Posti</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca tavolo per numero, note, QR..."
            className="search-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={filters.location}
          onChange={(e) => handleFilterChange('location', e.target.value)}
        >
          <option value="">Tutte le aree</option>
          {locations.map(location => (
            <option key={location} value={location}>
              {location === 'interno' ? '🏠 Interno' : '🌿 Esterno'}
            </option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">Tutti gli stati</option>
          <option value="free">🟢 Libero</option>
          <option value="occupied">🔴 Occupato</option>
          <option value="reserved">🟡 Riservato</option>
          <option value="cleaning">🔵 Pulizia</option>
        </select>

        <select 
          className="filter-select"
          value={filters.capacity}
          onChange={(e) => handleFilterChange('capacity', e.target.value)}
        >
          <option value="">Tutte le capacità</option>
          <option value="1-2">👥 1-2 posti</option>
          <option value="3-4">👨‍👩‍👧 3-4 posti</option>
          <option value="5-6">👨‍👩‍👧‍👦 5-6 posti</option>
          <option value="7+">🏢 7+ posti</option>
        </select>

        <select 
          className="filter-select"
          value={filters.active}
          onChange={(e) => handleFilterChange('active', e.target.value)}
        >
          <option value="all">Tutti i tavoli</option>
          <option value="true">✅ Solo attivi</option>
          <option value="false">❌ Solo inattivi</option>
        </select>

        {Object.values(filters).some(v => v && v !== 'all') && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setFilters({
                search: '',
                location: '',
                status: '',
                capacity: '',
                active: 'all'
              });
            }}
            title="Pulisci tutti i filtri"
          >
            🧹 Pulisci
          </button>
        )}
      </div>

      {/* Vista Tavoli */}
      {filteredTables.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🪑</span>
          <h3>Nessun tavolo trovato</h3>
          <p>
            {loading 
              ? "Caricamento in corso..." 
              : Object.values(filters).some(v => v && v !== 'all')
                ? "Nessun tavolo corrisponde ai filtri selezionati"
                : "Inizia aggiungendo il primo tavolo"
            }
          </p>
          <div className="empty-actions">
            <button 
              className="btn primary" 
              onClick={() => setShowAddModal(true)}
            >
              + Aggiungi Primo Tavolo
            </button>
            {Object.values(filters).some(v => v && v !== 'all') && (
              <button 
                className="btn secondary" 
                onClick={() => {
                  setFilters({
                    search: '',
                    location: '',
                    status: '',
                    capacity: '',
                    active: 'all'
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
          {viewMode === 'grid' ? (
            /* Vista Griglia */
            <div className="tables-grid">
              {filteredTables.map(table => (
                <div key={table.id} className={`table-card ${table.status}`}>
                  <div className="table-header">
                    <div className="table-title">
                      <h3>Tavolo {table.number}</h3>
                      <span className="capacity-badge">
                        {getCapacityIcon(table.capacity)} {table.capacity}
                      </span>
                    </div>
                    <span className={`status-badge ${getStatusColor(table.status)}`}>
                      {getStatusIcon(table.status)} {getStatusLabel(table.status)}
                    </span>
                  </div>
                  
                  <div className="table-info">
                    <div className="info-item">
                      <span className="label">Area:</span>
                      <span className="value">
                        {table.area === 'interno' ? '🏠 Interno' : '🌿 Esterno'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">QR Code:</span>
                      <span className="value">{table.qrCode || table.qr_code}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Ultimo uso:</span>
                      <span className="value">{getLastOccupiedText(table.lastOccupied || table.updated_at)}</span>
                    </div>
                    {table.currentOrder && (
                      <div className="info-item current-order">
                        <span className="label">Ordine:</span>
                        <span className="value">
                          #{table.currentOrder.id} • {table.currentOrder.items} articoli • €{table.currentOrder.total}
                        </span>
                      </div>
                    )}
                    {table.notes && (
                      <div className="table-notes">
                        <span className="notes-icon">📝</span>
                        <span className="notes-text">{table.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="table-actions">
                    {/* Azioni cambio stato */}
                    <div className="status-actions">
                      {table.status !== 'libero' && (
                        <button 
                          className="btn-small success"
                          onClick={() => changeTableStatus(table.id, 'libero')}
                          title="Libera tavolo"
                        >
                          🟢
                        </button>
                      )}
                      {table.status !== 'occupato' && table.status !== 'fuori_servizio' && (
                        <button 
                          className="btn-small danger"
                          onClick={() => changeTableStatus(table.id, 'occupato')}
                          title="Segna come occupato"
                        >
                          🔴
                        </button>
                      )}
                      {table.status !== 'riservato' && table.status !== 'fuori_servizio' && (
                        <button 
                          className="btn-small warning"
                          onClick={() => changeTableStatus(table.id, 'riservato')}
                          title="Segna come riservato"
                        >
                          🟡
                        </button>
                      )}
                      {table.status !== 'pulizia' && table.status !== 'fuori_servizio' && (
                        <button 
                          className="btn-small info"
                          onClick={() => changeTableStatus(table.id, 'pulizia')}
                          title="Segna per pulizia"
                        >
                          🔵
                        </button>
                      )}
                    </div>

                    {/* Azioni generali */}
                    <div className="general-actions">
                      <button 
                        className="btn-small secondary"
                        onClick={() => handleViewTable(table)}
                        title="Visualizza dettagli"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-small primary"
                        onClick={() => setEditingTable(table)}
                        title="Modifica tavolo"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-small secondary"
                        onClick={() => generateQRCode(table)}
                        title="Mostra QR Code"
                      >
                        📱
                      </button>
                      <button 
                        className="btn-small danger"
                        onClick={() => deleteTable(table.id)}
                        title="Elimina tavolo"
                        disabled={table.status === 'occupato'}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista Lista */
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tavolo</th>
                    <th>Capacità</th>
                    <th>Area</th>
                    <th>Stato</th>
                    <th>Ultimo Uso</th>
                    <th>Note</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTables.map(table => (
                    <tr key={table.id} className={`table-row ${table.status}`}>
                      <td>
                        <div className="table-cell-info">
                          <strong>Tavolo {table.number}</strong>
                          <div className="table-meta">
                            QR: {table.qrCode || table.qr_code}
                            {table.currentOrder && (
                              <span className="current-order-badge">
                                Ordine #{table.currentOrder.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="capacity-display">
                          {getCapacityIcon(table.capacity)} {table.capacity}
                        </span>
                      </td>
                      <td>
                        <span className="area-badge">
                          {table.area === 'interno' ? '🏠 Interno' : '🌿 Esterno'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor(table.status)}`}>
                          {getStatusIcon(table.status)} {getStatusLabel(table.status)}
                        </span>
                      </td>
                      <td className="last-occupied">
                        {getLastOccupiedText(table.lastOccupied || table.updated_at)}
                      </td>
                      <td>
                        <div className="notes-cell">
                          {table.notes || <span className="text-muted">-</span>}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <div className="status-actions">
                            {table.status !== 'libero' && (
                              <button 
                                className="btn-small success"
                                onClick={() => changeTableStatus(table.id, 'libero')}
                                title="Libera"
                              >
                                🟢
                              </button>
                            )}
                            {table.status !== 'occupato' && table.status !== 'fuori_servizio' && (
                              <button 
                                className="btn-small danger"
                                onClick={() => changeTableStatus(table.id, 'occupato')}
                                title="Occupato"
                              >
                                🔴
                              </button>
                            )}
                          </div>
                          <button 
                            className="btn-small secondary"
                            onClick={() => handleViewTable(table)}
                            title="Dettagli"
                          >
                            👁️
                          </button>
                          <button 
                            className="btn-small primary"
                            onClick={() => setEditingTable(table)}
                            title="Modifica"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-small secondary"
                            onClick={() => generateQRCode(table)}
                            title="QR Code"
                          >
                            📱
                          </button>
                          <button 
                            className="btn-small danger"
                            onClick={() => deleteTable(table.id)}
                            title="Elimina"
                            disabled={table.status === 'occupato'}
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
                    Visualizzati: <strong>{filteredTables.length}</strong> tavoli • 
                    Capacità totale: <strong>{getTotalCapacity()}</strong> posti • 
                    Disponibili: <strong>{getAvailableCapacity()}</strong> posti
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ✅ ENHANCED: Modal Add/Edit allineato con backend */}
      {(showAddModal || editingTable) && (
        <TableModal
          table={editingTable}
          onClose={() => {
            setShowAddModal(false);
            setEditingTable(null);
          }}
          onSave={async (savedTable) => {
            setShowAddModal(false);
            setEditingTable(null);
            
            // ✅ ENHANCED: Show success message
            const operation = editingTable ? 'aggiornato' : 'creato';
            setSuccessMessage(
              `Tavolo ${operation} con successo! ${savedTable?.number ? 
                `(Tavolo ${savedTable.number})` : 
                ''}`
            );
            
            await fetchTables();
            await fetchTablesStats();
          }}
          existingNumbers={tables.filter(t => t.id !== editingTable?.id).map(t => t.number)}
          locations={locations}
        />
      )}

      {/* ✅ NEW: Table Details Modal */}
      {viewingTable && (
        <TableDetailsModal
          table={viewingTable}
          onClose={() => setViewingTable(null)}
          onEdit={() => {
            setEditingTable(viewingTable);
            setViewingTable(null);
            setShowAddModal(true);
          }}
        />
      )}

      {/* Modal QR Code */}
      {showQRModal && (
        <QRCodeModal
          qrData={showQRModal}
          onClose={() => setShowQRModal(null)}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED: Modal Component allineato con backend API
function TableModal({ table, onClose, onSave, existingNumbers, locations }) {
  const [formData, setFormData] = useState({
    number: table?.number || '',
    capacity: table?.capacity || 4,
    location: table?.location || 'interno', // Use backend field name
    status: table?.db_status || 'free', // Use backend status
    notes: table?.notes || '',
    qr_code: table?.qr_code || '', // Use backend field name
    active: table?.active !== undefined ? table.active : true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Genera QR code automaticamente se è un nuovo tavolo
    if (!table && !formData.qr_code && formData.number) {
      setFormData(prev => ({
        ...prev,
        qr_code: `QR${String(formData.number).padStart(3, '0')}`
      }));
    }
  }, [formData.number, table]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.number) {
      newErrors.number = 'Numero tavolo è obbligatorio';
    } else if (existingNumbers.includes(parseInt(formData.number))) {
      newErrors.number = 'Numero tavolo già esistente';
    } else if (formData.number < 1 || formData.number > 999) {
      newErrors.number = 'Numero tavolo deve essere tra 1 e 999';
    }

    if (!formData.capacity || formData.capacity < 1 || formData.capacity > 20) {
      newErrors.capacity = 'Capacità deve essere tra 1 e 20 posti';
    }

    if (!formData.qr_code?.trim()) {
      newErrors.qr_code = 'Codice QR è obbligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`💾 ${table ? 'Updating' : 'Creating'} table:`, formData);
      
      const url = table 
        ? `/api/tables/${table.id}`
        : '/api/tables';
      
      const method = table ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          number: parseInt(formData.number),
          capacity: parseInt(formData.capacity),
          location: formData.location,
          status: formData.status,
          qr_code: formData.qr_code,
          notes: formData.notes || null,
          active: formData.active
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Table saved successfully:', result);
      
      onSave(result.table || {
        number: parseInt(formData.number),
        id: table?.id
      });
      
    } catch (err) {
      console.error('❌ Error saving table:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Rimuovi errore quando l'utente corregge
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content table-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {table ? `✏️ Modifica Tavolo ${table.number}` : '🪑 Nuovo Tavolo'}
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
                <label className="form-label">Numero Tavolo *</label>
                <input
                  type="number"
                  name="number"
                  className={`form-input ${errors.number ? 'error' : ''}`}
                  value={formData.number}
                  onChange={handleChange}
                  min="1"
                  max="999"
                  required
                />
                {errors.number && <span className="error-text">{errors.number}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Capacità *</label>
                <input
                  type="number"
                  name="capacity"
                  className={`form-input ${errors.capacity ? 'error' : ''}`}
                  value={formData.capacity}
                  onChange={handleChange}
                  min="1"
                  max="20"
                  required
                />
                {errors.capacity && <span className="error-text">{errors.capacity}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Area *</label>
                <select
                  name="location"
                  className="form-select"
                  value={formData.location}
                  onChange={handleChange}
                  required
                >
                  {locations.map(location => (
                    <option key={location} value={location}>
                      {location === 'interno' ? '🏠 Interno' : '🌿 Esterno'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Stato *</label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="free">🟢 Libero</option>
                  <option value="occupied">🔴 Occupato</option>
                  <option value="reserved">🟡 Riservato</option>
                  <option value="cleaning">🔵 Pulizia</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Codice QR *</label>
              <input
                type="text"
                name="qr_code"
                className={`form-input ${errors.qr_code ? 'error' : ''}`}
                value={formData.qr_code}
                onChange={handleChange}
                placeholder="QR001"
                required
              />
              {errors.qr_code && <span className="error-text">{errors.qr_code}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Note</label>
              <textarea
                name="notes"
                className="form-textarea"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Note aggiuntive sul tavolo..."
              />
            </div>

            <div className="form-checkbox-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <span className="checkbox-label">Tavolo attivo</span>
              </label>
              <small className="form-help">
                I tavoli inattivi non appariranno nelle prenotazioni
              </small>
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
                  {table ? 'Aggiornando...' : 'Creando...'}
                </>
              ) : (
                table ? '💾 Aggiorna Tavolo' : '🪑 Crea Tavolo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ NEW: Table Details Modal
function TableDetailsModal({ table, onClose, onEdit }) {
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

  const getStatusIcon = (status) => {
    const icons = {
      'libero': '🟢',
      'occupato': '🔴', 
      'riservato': '🟡',
      'pulizia': '🔵',
      'fuori_servizio': '⚫'
    };
    return icons[status] || '⚪';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'libero': 'Libero',
      'occupato': 'Occupato',
      'riservato': 'Riservato',
      'pulizia': 'Pulizia',
      'fuori_servizio': 'Fuori Servizio'
    };
    return labels[status] || status;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>👁️ Dettagli Tavolo {table.number}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="table-details">
            <div className="details-section">
              <h4>📝 Informazioni Generali</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Numero Tavolo:</strong> {table.number}
                </div>
                <div className="detail-item">
                  <strong>Capacità:</strong> {table.capacity} posti
                </div>
                <div className="detail-item">
                  <strong>Area:</strong> {table.area === 'interno' ? '🏠 Interno' : '🌿 Esterno'}
                </div>
                <div className="detail-item">
                  <strong>Stato:</strong> 
                  <span className={`status-badge ${table.status}`}>
                    {getStatusIcon(table.status)} {getStatusLabel(table.status)}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>QR Code:</strong> {table.qrCode || table.qr_code}
                </div>
                <div className="detail-item">
                  <strong>Attivo:</strong> {table.active ? '✅ Sì' : '❌ No'}
                </div>
                <div className="detail-item">
                  <strong>Creato:</strong> {formatDate(table.created_at)}
                </div>
                <div className="detail-item">
                  <strong>Aggiornato:</strong> {formatDate(table.updated_at)}
                </div>
              </div>
            </div>

            {table.notes && (
              <div className="details-section">
                <h4>📝 Note</h4>
                <div className="notes-content">
                  {table.notes}
                </div>
              </div>
            )}

            {table.currentOrder && (
              <div className="details-section">
                <h4>📋 Ordine Corrente</h4>
                <div className="order-details">
                  <div className="detail-item">
                    <strong>ID Ordine:</strong> #{table.currentOrder.id}
                  </div>
                  <div className="detail-item">
                    <strong>Articoli:</strong> {table.currentOrder.items}
                  </div>
                  <div className="detail-item">
                    <strong>Totale:</strong> €{table.currentOrder.total}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button type="button" className="btn primary" onClick={onEdit}>
            ✏️ Modifica Tavolo
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal QR Code - unchanged
function QRCodeModal({ qrData, onClose }) {
  const downloadQR = () => {
    alert('Funzione di download QR code non ancora implementata');
  };

  const printQR = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content qr-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            QR Code Tavolo {qrData.tableNumber}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="qr-content">
          <div className="qr-code-display">
            <div className="qr-placeholder">
              <div className="qr-code-fake"></div>
              <p>QR CODE</p>
              <p>Tavolo {qrData.tableNumber}</p>
            </div>
          </div>
          
          <div className="qr-info">
            <h4>Informazioni QR Code</h4>
            <div className="qr-details">
              <div className="detail-row">
                <span>Tavolo:</span>
                <span>{qrData.tableNumber}</span>
              </div>
              <div className="detail-row">
                <span>ID Tavolo:</span>
                <span>{qrData.tableId}</span>
              </div>
              <div className="detail-row">
                <span>URL:</span>
                <span className="url">{qrData.pubUrl}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button className="btn info" onClick={printQR}>
            🖨️ Stampa
          </button>
          <button className="btn primary" onClick={downloadQR}>
            📥 Scarica
          </button>
        </div>
      </div>
    </div>
  );
}