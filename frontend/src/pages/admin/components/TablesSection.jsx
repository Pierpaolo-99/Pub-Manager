import { useState, useEffect } from "react";
import './TablesSection.css'

export default function TablesSection() {
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [showQRModal, setShowQRModal] = useState(null);
  const [filterArea, setFilterArea] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [error, setError] = useState(null);

  // Mock data per ora
  useEffect(() => {
    const mockTables = [
      { 
        id: 1, 
        number: 1, 
        capacity: 4, 
        status: 'libero', 
        area: 'interno', 
        qrCode: 'QR001',
        notes: '',
        lastOccupied: '2024-11-05T14:30:00',
        currentOrder: null,
        position: { x: 100, y: 150 }
      },
      { 
        id: 2, 
        number: 2, 
        capacity: 2, 
        status: 'occupato', 
        area: 'interno', 
        qrCode: 'QR002',
        notes: 'Vicino alla finestra',
        lastOccupied: '2024-11-05T18:15:00',
        currentOrder: { id: 123, items: 3, total: 45.50 },
        position: { x: 200, y: 150 }
      },
      { 
        id: 3, 
        number: 3, 
        capacity: 6, 
        status: 'riservato', 
        area: 'esterno', 
        qrCode: 'QR003',
        notes: 'Prenotazione per le 20:00',
        lastOccupied: '2024-11-04T19:45:00',
        currentOrder: null,
        position: { x: 300, y: 100 }
      },
      { 
        id: 4, 
        number: 4, 
        capacity: 4, 
        status: 'pulizia', 
        area: 'interno', 
        qrCode: 'QR004',
        notes: 'Pulizia in corso',
        lastOccupied: '2024-11-05T17:30:00',
        currentOrder: null,
        position: { x: 150, y: 250 }
      },
      { 
        id: 5, 
        number: 5, 
        capacity: 8, 
        status: 'libero', 
        area: 'esterno', 
        qrCode: 'QR005',
        notes: 'Tavolo grande per gruppi',
        lastOccupied: '2024-11-04T21:00:00',
        currentOrder: null,
        position: { x: 250, y: 300 }
      },
      { 
        id: 6, 
        number: 6, 
        capacity: 2, 
        status: 'fuori_servizio', 
        area: 'interno', 
        qrCode: 'QR006',
        notes: 'Sedia rotta - in riparazione',
        lastOccupied: '2024-11-03T16:20:00',
        currentOrder: null,
        position: { x: 350, y: 200 }
      }
    ];
    setTables(mockTables);
  }, []);

  // Filtra tavoli quando cambiano i filtri
  useEffect(() => {
    filterTables();
  }, [tables, searchTerm, filterArea, filterStatus, filterCapacity]);

  const filterTables = () => {
    let filtered = tables;

    // Filtro per testo (numero tavolo, note)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(table =>
        table.number.toString().includes(term) ||
        table.notes?.toLowerCase().includes(term) ||
        table.qrCode.toLowerCase().includes(term)
      );
    }

    // Filtro per area
    if (filterArea) {
      filtered = filtered.filter(table => table.area === filterArea);
    }

    // Filtro per stato
    if (filterStatus) {
      filtered = filtered.filter(table => table.status === filterStatus);
    }

    // Filtro per capacità
    if (filterCapacity) {
      if (filterCapacity === '1-2') {
        filtered = filtered.filter(table => table.capacity <= 2);
      } else if (filterCapacity === '3-4') {
        filtered = filtered.filter(table => table.capacity >= 3 && table.capacity <= 4);
      } else if (filterCapacity === '5-6') {
        filtered = filtered.filter(table => table.capacity >= 5 && table.capacity <= 6);
      } else if (filterCapacity === '7+') {
        filtered = filtered.filter(table => table.capacity >= 7);
      }
    }

    setFilteredTables(filtered);
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

  const changeTableStatus = (tableId, newStatus) => {
    if (!window.confirm(`Cambiare stato del tavolo?`)) return;

    setTables(tables.map(table => 
      table.id === tableId 
        ? { 
            ...table, 
            status: newStatus,
            lastOccupied: newStatus === 'occupato' ? new Date().toISOString() : table.lastOccupied,
            currentOrder: newStatus === 'libero' ? null : table.currentOrder
          } 
        : table
    ));
  };

  const deleteTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.status === 'occupato') {
      alert('Non puoi eliminare un tavolo occupato!');
      return;
    }

    if (!window.confirm(`Eliminare definitivamente il Tavolo ${table.number}?`)) return;

    setTables(tables.filter(t => t.id !== tableId));
  };

  const generateQRCode = (table) => {
    // In un'app reale, questo genererebbe un QR code vero
    const qrData = {
      tableId: table.id,
      tableNumber: table.number,
      pubUrl: `${window.location.origin}/table/${table.qrCode}`
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

  const getTotalCapacity = () => {
    return tables.reduce((total, table) => total + table.capacity, 0);
  };

  const getAvailableCapacity = () => {
    return tables
      .filter(table => table.status === 'libero')
      .reduce((total, table) => total + table.capacity, 0);
  };

  const areas = [...new Set(tables.map(t => t.area))];
  const statuses = [...new Set(tables.map(t => t.status))];

  return (
    <div className="tables-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>🪑 Gestione Tavoli</h2>
          <p className="section-subtitle">
            {tables.length} tavoli • {tables.filter(t => t.status === 'libero').length} liberi • 
            {getAvailableCapacity()}/{getTotalCapacity()} posti disponibili
          </p>
        </div>
        <div className="header-actions">
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

      {/* Statistiche rapide */}
      <div className="tables-stats">
        <div className="stat-card mini success">
          <span className="stat-icon">🟢</span>
          <div>
            <div className="stat-number">{tables.filter(t => t.status === 'libero').length}</div>
            <div className="stat-label">Liberi</div>
          </div>
        </div>
        <div className="stat-card mini danger">
          <span className="stat-icon">🔴</span>
          <div>
            <div className="stat-number">{tables.filter(t => t.status === 'occupato').length}</div>
            <div className="stat-label">Occupati</div>
          </div>
        </div>
        <div className="stat-card mini warning">
          <span className="stat-icon">🟡</span>
          <div>
            <div className="stat-number">{tables.filter(t => t.status === 'riservato').length}</div>
            <div className="stat-label">Riservati</div>
          </div>
        </div>
        <div className="stat-card mini info">
          <span className="stat-icon">🔵</span>
          <div>
            <div className="stat-number">{tables.filter(t => t.status === 'pulizia').length}</div>
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
      </div>

      {/* Filtri */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca tavolo per numero, note, QR..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <select 
          className="filter-select"
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
        >
          <option value="">Tutte le aree</option>
          {areas.map(area => (
            <option key={area} value={area}>
              {area === 'interno' ? '🏠 Interno' : '🌿 Esterno'}
            </option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tutti gli stati</option>
          {statuses.map(status => (
            <option key={status} value={status}>
              {getStatusIcon(status)} {getStatusLabel(status)}
            </option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={filterCapacity}
          onChange={(e) => setFilterCapacity(e.target.value)}
        >
          <option value="">Tutte le capacità</option>
          <option value="1-2">👥 1-2 posti</option>
          <option value="3-4">👨‍👩‍👧 3-4 posti</option>
          <option value="5-6">👨‍👩‍👧‍👦 5-6 posti</option>
          <option value="7+">🏢 7+ posti</option>
        </select>

        {(searchTerm || filterArea || filterStatus || filterCapacity) && (
          <button 
            className="btn secondary clear-filters"
            onClick={() => {
              setSearchTerm("");
              setFilterArea("");
              setFilterStatus("");
              setFilterCapacity("");
            }}
          >
            Pulisci Filtri
          </button>
        )}
      </div>

      {/* Vista Tavoli */}
      {filteredTables.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🪑</span>
          <h3>Nessun tavolo trovato</h3>
          <p>
            {tables.length === 0 
              ? "Inizia aggiungendo il primo tavolo"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
          {tables.length === 0 && (
            <button 
              className="btn primary"
              onClick={() => setShowAddModal(true)}
            >
              Aggiungi Primo Tavolo
            </button>
          )}
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
                      <span className="value">{table.qrCode}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Ultimo uso:</span>
                      <span className="value">{getLastOccupiedText(table.lastOccupied)}</span>
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
                            QR: {table.qrCode}
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
                        {getLastOccupiedText(table.lastOccupied)}
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
            </div>
          )}
        </>
      )}

      {/* Modal Aggiungi/Modifica Tavolo */}
      {(showAddModal || editingTable) && (
        <TableModal
          table={editingTable}
          onClose={() => {
            setShowAddModal(false);
            setEditingTable(null);
          }}
          onSave={(savedTable) => {
            if (editingTable) {
              setTables(tables.map(t => 
                t.id === savedTable.id ? savedTable : t
              ));
            } else {
              setTables([...tables, { ...savedTable, id: Date.now() }]);
            }
            setShowAddModal(false);
            setEditingTable(null);
          }}
          existingNumbers={tables.filter(t => t.id !== editingTable?.id).map(t => t.number)}
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

// Modal per aggiungere/modificare tavolo
function TableModal({ table, onClose, onSave, existingNumbers }) {
  const [formData, setFormData] = useState({
    number: table?.number || '',
    capacity: table?.capacity || 4,
    area: table?.area || 'interno',
    status: table?.status || 'libero',
    notes: table?.notes || '',
    qrCode: table?.qrCode || '',
    position: table?.position || { x: 100, y: 100 }
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Genera QR code automaticamente se è un nuovo tavolo
    if (!table && !formData.qrCode && formData.number) {
      setFormData(prev => ({
        ...prev,
        qrCode: `QR${String(formData.number).padStart(3, '0')}`
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

    if (!formData.qrCode.trim()) {
      newErrors.qrCode = 'Codice QR è obbligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    
    // Simula salvataggio
    setTimeout(() => {
      const savedTable = {
        ...table,
        ...formData,
        number: parseInt(formData.number),
        capacity: parseInt(formData.capacity),
        lastOccupied: table?.lastOccupied || null,
        currentOrder: table?.currentOrder || null
      };
      
      onSave(savedTable);
      setSaving(false);
    }, 500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content table-modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {table ? `Modifica Tavolo ${table.number}` : 'Nuovo Tavolo'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
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
              {errors.number && <span className="error-message">{errors.number}</span>}
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
              {errors.capacity && <span className="error-message">{errors.capacity}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Area *</label>
              <select
                name="area"
                className="form-select"
                value={formData.area}
                onChange={handleChange}
                required
              >
                <option value="interno">🏠 Interno</option>
                <option value="esterno">🌿 Esterno</option>
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
                <option value="libero">🟢 Libero</option>
                <option value="occupato">🔴 Occupato</option>
                <option value="riservato">🟡 Riservato</option>
                <option value="pulizia">🔵 Pulizia</option>
                <option value="fuori_servizio">⚫ Fuori Servizio</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Codice QR *</label>
            <input
              type="text"
              name="qrCode"
              className={`form-input ${errors.qrCode ? 'error' : ''}`}
              value={formData.qrCode}
              onChange={handleChange}
              placeholder="QR001"
              required
            />
            {errors.qrCode && <span className="error-message">{errors.qrCode}</span>}
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
              {saving ? 'Salvando...' : (table ? 'Aggiorna' : 'Crea Tavolo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal QR Code
function QRCodeModal({ qrData, onClose }) {
  const downloadQR = () => {
    // In un'app reale, genererebbe e scaricherebbe il QR code
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
            {/* Qui in un'app reale ci sarebbe il QR code generato */}
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