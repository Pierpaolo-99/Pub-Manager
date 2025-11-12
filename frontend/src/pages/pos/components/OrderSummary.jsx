import { useState, useEffect, useRef } from 'react';

export default function OrderSummary({ 
  order, 
  onUpdateQuantity, 
  onRemoveItem, 
  onUpdateNotes 
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(order.notes || '');
  const notesTextareaRef = useRef(null);

  useEffect(() => {
    setNotesText(order.notes || '');
  }, [order.notes]);

  useEffect(() => {
    if (editingNotes && notesTextareaRef.current) {
      notesTextareaRef.current.focus();
    }
  }, [editingNotes]);

  const handleQuantityChange = (itemId, newQuantity) => {
    const quantity = Math.max(0, parseInt(newQuantity) || 0);
    onUpdateQuantity(itemId, quantity);
    setEditingItem(null);
  };

  const handleNotesSubmit = () => {
    onUpdateNotes(notesText.trim());
    setEditingNotes(false);
  };

  const handleNotesCancel = () => {
    setNotesText(order.notes || '');
    setEditingNotes(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getItemTotal = (item) => {
    return item.price * item.quantity;
  };

  const getTaxAmount = () => {
    return order.tax || (order.subtotal * 0.22);
  };

  const getOrderTotal = () => {
    return order.total || (order.subtotal + getTaxAmount());
  };

  if (!order.items || order.items.length === 0) {
    return (
      <div className="order-summary-container">
        <div className="empty-order">
          <div className="empty-order-content">
            <span className="empty-icon">🛒</span>
            <h3>Nessun prodotto nell'ordine</h3>
            <p>Aggiungi prodotti dal menu per iniziare un nuovo ordine</p>
            <div className="empty-suggestions">
              <h4>💡 Suggerimenti:</h4>
              <ul>
                <li>📋 Vai al <strong>Menu</strong> per selezionare prodotti</li>
                <li>🪑 Seleziona un <strong>Tavolo</strong> per ordini al tavolo</li>
                <li>🔍 Usa la <strong>Ricerca</strong> per trovare prodotti specifici</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-summary-container">
      {/* Order Header */}
      <div className="order-header">
        <div className="order-info">
          <h2 className="order-title">
            🛒 Ordine Corrente
            <span className="item-count">({order.items.length} prodott{order.items.length !== 1 ? 'i' : 'o'})</span>
          </h2>
          {order.table_id && (
            <div className="table-info">
              🪑 Tavolo selezionato
            </div>
          )}
        </div>
        
        <div className="order-total-preview">
          <span className="total-label">Totale</span>
          <span className="total-amount">{formatCurrency(getOrderTotal())}</span>
        </div>
      </div>

      {/* Order Items List */}
      <div className="order-items-container">
        <div className="order-items-list">
          {order.items.map((item, index) => (
            <div key={item.id || index} className="order-item">
              <div className="item-main-content">
                {/* Item Info */}
                <div className="item-info">
                  <h4 className="item-name">{item.name}</h4>
                  <div className="item-details">
                    <span className="item-unit-price">
                      {formatCurrency(item.price)} cad.
                    </span>
                    {item.notes && (
                      <span className="item-individual-notes">
                        💬 {item.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="item-quantity-section">
                  {editingItem === item.id ? (
                    <div className="quantity-editor">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        defaultValue={item.quantity}
                        className="quantity-input"
                        onBlur={(e) => handleQuantityChange(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuantityChange(item.id, e.target.value);
                          } else if (e.key === 'Escape') {
                            setEditingItem(null);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        className="quantity-confirm"
                        onClick={(e) => {
                          const input = e.target.parentNode.querySelector('.quantity-input');
                          handleQuantityChange(item.id, input.value);
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className="quantity-controls">
                      <button
                        className="quantity-btn decrease"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>
                      
                      <button
                        className="quantity-display"
                        onClick={() => setEditingItem(item.id)}
                        title="Clicca per modificare quantità"
                      >
                        {item.quantity}
                      </button>
                      
                      <button
                        className="quantity-btn increase"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={item.quantity >= 99}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Item Total */}
                <div className="item-total-section">
                  <span className="item-total">{formatCurrency(getItemTotal(item))}</span>
                </div>

                {/* Remove Button */}
                <button
                  className="remove-item-btn"
                  onClick={() => onRemoveItem(item.id)}
                  title="Rimuovi prodotto"
                >
                  🗑️
                </button>
              </div>

              {/* Item Actions */}
              <div className="item-actions">
                <button className="item-action-btn note-btn">
                  💬 Note speciali
                </button>
                <button className="item-action-btn duplicate-btn">
                  📋 Duplica
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Notes Section */}
      <div className="order-notes-section">
        <div className="notes-header">
          <h4>📝 Note ordine</h4>
          <button
            className="edit-notes-btn"
            onClick={() => setEditingNotes(true)}
          >
            ✏️ {order.notes ? 'Modifica' : 'Aggiungi'}
          </button>
        </div>

        {editingNotes ? (
          <div className="notes-editor">
            <textarea
              ref={notesTextareaRef}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Aggiungi note per la cucina (allergeni, modifiche, ecc.)"
              className="notes-textarea"
              rows={3}
            />
            <div className="notes-actions">
              <button
                className="notes-action-btn save"
                onClick={handleNotesSubmit}
              >
                💾 Salva
              </button>
              <button
                className="notes-action-btn cancel"
                onClick={handleNotesCancel}
              >
                ❌ Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="notes-display">
            {order.notes ? (
              <p className="notes-text">{order.notes}</p>
            ) : (
              <p className="notes-placeholder">Nessuna nota aggiunta</p>
            )}
          </div>
        )}
      </div>

      {/* Order Summary Totals */}
      <div className="order-totals">
        <div className="totals-breakdown">
          <div className="total-row subtotal">
            <span className="total-label">Subtotale</span>
            <span className="total-value">{formatCurrency(order.subtotal)}</span>
          </div>
          
          <div className="total-row tax">
            <span className="total-label">IVA (22%)</span>
            <span className="total-value">{formatCurrency(getTaxAmount())}</span>
          </div>
          
          <div className="total-row final-total">
            <span className="total-label">Totale</span>
            <span className="total-value">{formatCurrency(getOrderTotal())}</span>
          </div>
        </div>
      </div>

      {/* Quick Order Actions */}
      <div className="order-quick-actions">
        <button className="quick-action-btn save-draft">
          💾 Salva bozza
        </button>
        
        <button className="quick-action-btn duplicate-order">
          📋 Duplica ordine
        </button>
        
        <button className="quick-action-btn print-receipt">
          🖨️ Stampa ricevuta
        </button>
      </div>

      {/* Order Statistics */}
      <div className="order-statistics">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-icon">📊</span>
            <div className="stat-content">
              <span className="stat-value">{order.items.length}</span>
              <span className="stat-label">Prodotti</span>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon">📦</span>
            <div className="stat-content">
              <span className="stat-value">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
              <span className="stat-label">Quantità</span>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon">💰</span>
            <div className="stat-content">
              <span className="stat-value">
                {formatCurrency(getOrderTotal() / order.items.reduce((sum, item) => sum + item.quantity, 0))}
              </span>
              <span className="stat-label">Media</span>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon">🕐</span>
            <div className="stat-content">
              <span className="stat-value">
                {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="stat-label">Ora</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}