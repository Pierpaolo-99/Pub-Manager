import { useState, useEffect, useCallback } from 'react';

export default function TableSelector({ 
  selectedTable, 
  onTableSelect, 
  activeOrders 
}) {
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTables, setFilteredTables] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('number'); // number, status, area
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // Real-time stats
  const [tableStats, setTableStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0
  });

  useEffect(() => {
    loadTablesAndAreas();
  }, []);

  useEffect(() => {
    filterAndSortTables();
  }, [tables, selectedArea, searchTerm, sortBy, showOnlyAvailable]);

  useEffect(() => {
    calculateTableStats();
  }, [tables]);

  const loadTablesAndAreas = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load tables with current status
      const tablesResponse = await fetch('/api/tables?include_status=true', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json();
        const tablesWithStatus = (tablesData.tables || []).map(table => ({
          ...table,
          status: getTableStatus(table),
          currentOrder: getTableCurrentOrder(table.id)
        }));
        
        setTables(tablesWithStatus);
        
        // Extract unique areas
        const uniqueAreas = [...new Set(tablesWithStatus
          .filter(table => table.area)
          .map(table => table.area)
        )].sort();
        setAreas(uniqueAreas);
      } else {
        throw new Error('Errore nel caricamento tavoli');
      }

    } catch (error) {
      console.error('Error loading tables:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTableStatus = (table) => {
    // Check if table has active orders
    const hasActiveOrder = activeOrders.some(order => 
      order.table_id === table.id && 
      ['pending', 'preparing', 'ready'].includes(order.status)
    );

    if (hasActiveOrder) return 'occupied';
    if (table.is_cleaning) return 'cleaning';
    if (table.is_reserved) return 'reserved';
    if (!table.is_active) return 'inactive';
    return 'available';
  };

  const getTableCurrentOrder = (tableId) => {
    return activeOrders.find(order => 
      order.table_id === tableId && 
      ['pending', 'preparing', 'ready'].includes(order.status)
    );
  };

  const calculateTableStats = () => {
    const stats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'cleaning').length
    };
    setTableStats(stats);
  };

  const filterAndSortTables = useCallback(() => {
    let filtered = [...tables];

    // Filter by area
    if (selectedArea !== 'all') {
      filtered = filtered.filter(table => table.area === selectedArea);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(table =>
        table.name?.toLowerCase().includes(searchLower) ||
        table.number?.toString().includes(searchTerm) ||
        table.area?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by availability
    if (showOnlyAvailable) {
      filtered = filtered.filter(table => table.status === 'available');
    }

    // Sort tables
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'number':
          return (a.number || 0) - (b.number || 0);
        case 'status':
          const statusOrder = { available: 0, reserved: 1, occupied: 2, cleaning: 3, inactive: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'area':
          return (a.area || '').localeCompare(b.area || '');
        default:
          return 0;
      }
    });

    setFilteredTables(filtered);
  }, [tables, selectedArea, searchTerm, sortBy, showOnlyAvailable]);

  const handleTableSelect = (table) => {
    if (table.status === 'available' || table.status === 'reserved') {
      onTableSelect(table);
    }
  };

  const handleTableAction = async (table, action) => {
    try {
      const response = await fetch(`/api/tables/${table.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        await loadTablesAndAreas(); // Reload to get updated status
      }
    } catch (error) {
      console.error(`Error performing table action ${action}:`, error);
    }
  };

  const getTableStatusIcon = (status) => {
    const iconMap = {
      available: '✅',
      occupied: '🔴',
      reserved: '🟡',
      cleaning: '🧽',
      inactive: '⚫'
    };
    return iconMap[status] || '❓';
  };

  const getTableStatusColor = (status) => {
    const colorMap = {
      available: 'success',
      occupied: 'danger',
      reserved: 'warning',
      cleaning: 'info',
      inactive: 'secondary'
    };
    return colorMap[status] || 'secondary';
  };

  const getTableStatusText = (status) => {
    const textMap = {
      available: 'Disponibile',
      occupied: 'Occupato',
      reserved: 'Riservato',
      cleaning: 'Pulizia',
      inactive: 'Non attivo'
    };
    return textMap[status] || 'Sconosciuto';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getOrderTimeElapsed = (order) => {
    if (!order?.created_at) return '';
    
    const now = new Date();
    const orderTime = new Date(order.created_at);
    const minutes = Math.floor((now - orderTime) / (1000 * 60));
    
    if (minutes < 1) return 'Appena ordinato';
    if (minutes < 60) return `${minutes} min fa`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m fa`;
  };

  if (isLoading) {
    return (
      <div className="table-selector-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento tavoli...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-selector-error">
        <div className="error-content">
          <span className="error-icon">❌</span>
          <h3>Errore caricamento tavoli</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={loadTablesAndAreas}>
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="table-selector-container">
      {/* Table Stats Header */}
      <div className="table-stats-header">
        <div className="stats-grid">
          <div className="stat-card available">
            <span className="stat-icon">✅</span>
            <div className="stat-content">
              <span className="stat-number">{tableStats.available}</span>
              <span className="stat-label">Disponibili</span>
            </div>
          </div>

          <div className="stat-card occupied">
            <span className="stat-icon">🔴</span>
            <div className="stat-content">
              <span className="stat-number">{tableStats.occupied}</span>
              <span className="stat-label">Occupati</span>
            </div>
          </div>

          <div className="stat-card reserved">
            <span className="stat-icon">🟡</span>
            <div className="stat-content">
              <span className="stat-number">{tableStats.reserved}</span>
              <span className="stat-label">Riservati</span>
            </div>
          </div>

          <div className="stat-card cleaning">
            <span className="stat-icon">🧽</span>
            <div className="stat-content">
              <span className="stat-number">{tableStats.cleaning}</span>
              <span className="stat-label">Pulizia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="table-controls">
        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Cerca tavolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="table-search"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        {/* Area Filter */}
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="area-filter"
        >
          <option value="all">🏪 Tutte le aree</option>
          {areas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>

        {/* Sort Options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="number">📊 Numero</option>
          <option value="status">🚦 Status</option>
          <option value="area">🏪 Area</option>
        </select>
      </div>

      {/* Filter Options */}
      <div className="filter-options">
        <label className="filter-option">
          <input
            type="checkbox"
            checked={showOnlyAvailable}
            onChange={(e) => setShowOnlyAvailable(e.target.checked)}
          />
          <span className="filter-label">Solo disponibili</span>
        </label>

        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            🏢 Griglia
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 Lista
          </button>
        </div>
      </div>

      {/* Tables Display */}
      {filteredTables.length === 0 ? (
        <div className="empty-tables">
          <span className="empty-icon">🪑</span>
          <h3>Nessun tavolo trovato</h3>
          <p>
            {searchTerm 
              ? `Nessun tavolo corrisponde a "${searchTerm}"`
              : showOnlyAvailable
                ? 'Nessun tavolo disponibile al momento'
                : 'Nessun tavolo configurato'
            }
          </p>
          {(searchTerm || showOnlyAvailable) && (
            <button 
              className="reset-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setShowOnlyAvailable(false);
                setSelectedArea('all');
              }}
            >
              🔄 Mostra tutti i tavoli
            </button>
          )}
        </div>
      ) : (
        <div className={`tables-container ${viewMode}`}>
          {filteredTables.map(table => (
            <div
              key={table.id}
              className={`table-card ${table.status} ${selectedTable?.id === table.id ? 'selected' : ''}`}
            >
              {/* Table Header */}
              <div className="table-header">
                <div className="table-info">
                  <h4 className="table-name">
                    {table.name || `Tavolo ${table.number}`}
                  </h4>
                  <span className="table-details">
                    {table.capacity && `👥 ${table.capacity} posti`}
                    {table.area && ` • 🏪 ${table.area}`}
                  </span>
                </div>

                <div className="table-status-badge">
                  <span className="status-icon">
                    {getTableStatusIcon(table.status)}
                  </span>
                  <span className="status-text">
                    {getTableStatusText(table.status)}
                  </span>
                </div>
              </div>

              {/* Current Order Info (if occupied) */}
              {table.status === 'occupied' && table.currentOrder && (
                <div className="current-order-info">
                  <div className="order-summary">
                    <span className="order-id">
                      📋 Ordine #{table.currentOrder.id}
                    </span>
                    <span className="order-total">
                      {formatCurrency(table.currentOrder.total)}
                    </span>
                  </div>
                  <div className="order-details">
                    <span className="order-time">
                      🕐 {getOrderTimeElapsed(table.currentOrder)}
                    </span>
                    <span className="order-items">
                      📦 {table.currentOrder.items?.length || 0} prodotti
                    </span>
                  </div>
                  <div className="order-status">
                    <span className={`order-status-badge ${table.currentOrder.status}`}>
                      {table.currentOrder.status === 'pending' && '⏳ In attesa'}
                      {table.currentOrder.status === 'preparing' && '👨‍🍳 In preparazione'}
                      {table.currentOrder.status === 'ready' && '✅ Pronto'}
                    </span>
                  </div>
                </div>
              )}

              {/* Table Actions */}
              <div className="table-actions">
                {table.status === 'available' && (
                  <button
                    className="table-action-btn primary select"
                    onClick={() => handleTableSelect(table)}
                  >
                    ✅ Seleziona tavolo
                  </button>
                )}

                {table.status === 'reserved' && (
                  <>
                    <button
                      className="table-action-btn primary select"
                      onClick={() => handleTableSelect(table)}
                    >
                      🪑 Usa tavolo riservato
                    </button>
                    <button
                      className="table-action-btn secondary"
                      onClick={() => handleTableAction(table, 'unreserve')}
                    >
                      ❌ Rimuovi prenotazione
                    </button>
                  </>
                )}

                {table.status === 'occupied' && (
                  <div className="occupied-actions">
                    <button
                      className="table-action-btn info view"
                      onClick={() => {
                        // Show order details modal
                        console.log('View order details', table.currentOrder);
                      }}
                    >
                      👁️ Vedi ordine
                    </button>
                    <button
                      className="table-action-btn warning"
                      onClick={() => handleTableAction(table, 'start_cleaning')}
                    >
                      🧽 Segna per pulizia
                    </button>
                  </div>
                )}

                {table.status === 'cleaning' && (
                  <button
                    className="table-action-btn success"
                    onClick={() => handleTableAction(table, 'finish_cleaning')}
                  >
                    ✅ Pulizia completata
                  </button>
                )}

                {table.status === 'available' && (
                  <button
                    className="table-action-btn secondary reserve"
                    onClick={() => handleTableAction(table, 'reserve')}
                  >
                    🟡 Prenota tavolo
                  </button>
                )}
              </div>

              {/* Table Selection Indicator */}
              {selectedTable?.id === table.id && (
                <div className="selection-indicator">
                  <span className="selection-icon">🎯</span>
                  <span className="selection-text">Tavolo selezionato</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Takeaway Option */}
      <div className="takeaway-option">
        <button
          className={`takeaway-btn ${!selectedTable ? 'selected' : ''}`}
          onClick={() => onTableSelect(null)}
        >
          <span className="takeaway-icon">📦</span>
          <div className="takeaway-content">
            <span className="takeaway-title">Ordine da asporto</span>
            <span className="takeaway-subtitle">Senza tavolo assegnato</span>
          </div>
          {!selectedTable && (
            <span className="takeaway-selected">✅</span>
          )}
        </button>
      </div>

      {/* Tables Summary */}
      <div className="tables-summary">
        <span>
          {filteredTables.length} tavol{filteredTables.length !== 1 ? 'i' : 'o'} 
          {selectedArea !== 'all' && ` in ${selectedArea}`}
          {searchTerm && ` per "${searchTerm}"`}
          {showOnlyAvailable && ' disponibili'}
        </span>
      </div>
    </div>
  );
}