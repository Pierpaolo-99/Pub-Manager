import { useState, useEffect, useRef } from 'react';

export default function QuickActions({ 
  onOpenCashDrawer,
  onPrintReport,
  onVoidTransaction,
  onRefund,
  onApplyDiscount,
  onHoldOrder,
  onRecallOrder,
  currentUser,
  orderCount,
  totalSales,
  onEmergencyClose 
}) {
  const [showActions, setShowActions] = useState(false);
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [heldOrders, setHeldOrders] = useState([]);
  const [quickStats, setQuickStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    averageOrder: 0,
    busyTables: 0
  });
  
  // Cash drawer state
  const [cashOperation, setCashOperation] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashReason, setCashReason] = useState('');
  
  // Refund state
  const [refundOrderId, setRefundOrderId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  
  // Discount state
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  
  const actionsRef = useRef(null);

  useEffect(() => {
    loadHeldOrders();
    loadQuickStats();
    
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadQuickStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadHeldOrders = async () => {
    try {
      const response = await fetch('/api/orders/held', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setHeldOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading held orders:', error);
    }
  };

  const loadQuickStats = async () => {
    try {
      const response = await fetch('/api/analytics/quick-stats', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const stats = await response.json();
        setQuickStats(stats);
      }
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  };

  const handleCashDrawerOperation = async () => {
    if (!cashOperation || !cashAmount || !cashReason) {
      alert('Compila tutti i campi richiesti');
      return;
    }

    try {
      const response = await fetch('/api/cash-drawer/operation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          operation: cashOperation,
          amount: parseFloat(cashAmount),
          reason: cashReason
        })
      });

      if (response.ok) {
        onOpenCashDrawer();
        resetCashDrawerForm();
        setShowCashDrawer(false);
        alert(`Operazione ${cashOperation} completata con successo`);
      } else {
        throw new Error('Errore nell\'operazione');
      }
    } catch (error) {
      console.error('Cash drawer operation error:', error);
      alert('Errore nell\'operazione cassa');
    }
  };

  const handleRefund = async () => {
    if (!refundOrderId || !refundAmount || !refundReason) {
      alert('Compila tutti i campi richiesti');
      return;
    }

    try {
      const response = await fetch(`/api/orders/${refundOrderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason
        })
      });

      if (response.ok) {
        onRefund(refundOrderId, parseFloat(refundAmount), refundReason);
        resetRefundForm();
        setShowRefund(false);
        alert('Rimborso elaborato con successo');
      } else {
        throw new Error('Errore nel rimborso');
      }
    } catch (error) {
      console.error('Refund error:', error);
      alert('Errore nell\'elaborazione del rimborso');
    }
  };

  const handleVoidTransaction = async () => {
    if (!window.confirm('Sei sicuro di voler annullare l\'ultima transazione?')) {
      return;
    }

    try {
      await onVoidTransaction();
      setShowVoid(false);
      alert('Transazione annullata con successo');
    } catch (error) {
      console.error('Void transaction error:', error);
      alert('Errore nell\'annullamento della transazione');
    }
  };

  const handleApplyQuickDiscount = () => {
    if (!discountValue) {
      alert('Inserisci il valore dello sconto');
      return;
    }

    onApplyDiscount(discountType, parseFloat(discountValue), discountReason);
    resetDiscountForm();
    setShowDiscount(false);
  };

  const handleRecallHeldOrder = async (orderId) => {
    try {
      await onRecallOrder(orderId);
      await loadHeldOrders(); // Refresh held orders
      alert('Ordine recuperato con successo');
    } catch (error) {
      console.error('Recall order error:', error);
      alert('Errore nel recupero dell\'ordine');
    }
  };

  const resetCashDrawerForm = () => {
    setCashOperation('');
    setCashAmount('');
    setCashReason('');
  };

  const resetRefundForm = () => {
    setRefundOrderId('');
    setRefundAmount('');
    setRefundReason('');
  };

  const resetDiscountForm = () => {
    setDiscountType('percentage');
    setDiscountValue('');
    setDiscountReason('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Quick actions configuration
  const quickActionButtons = [
    {
      id: 'cash-drawer',
      icon: '💰',
      label: 'Cassa',
      color: 'green',
      onClick: () => setShowCashDrawer(true),
      permission: 'cash_operations'
    },
    {
      id: 'reports',
      icon: '📊',
      label: 'Report',
      color: 'blue',
      onClick: () => setShowReports(true),
      permission: 'view_reports'
    },
    {
      id: 'hold-order',
      icon: '⏸️',
      label: 'Sospendi',
      color: 'orange',
      onClick: onHoldOrder,
      permission: 'hold_orders'
    },
    {
      id: 'recall-order',
      icon: '📥',
      label: 'Recupera',
      color: 'purple',
      onClick: () => setShowActions(true),
      permission: 'recall_orders',
      badge: heldOrders.length > 0 ? heldOrders.length : null
    },
    {
      id: 'discount',
      icon: '🏷️',
      label: 'Sconto',
      color: 'yellow',
      onClick: () => setShowDiscount(true),
      permission: 'apply_discounts'
    },
    {
      id: 'refund',
      icon: '💸',
      label: 'Rimborso',
      color: 'red',
      onClick: () => setShowRefund(true),
      permission: 'process_refunds'
    },
    {
      id: 'void',
      icon: '❌',
      label: 'Annulla',
      color: 'gray',
      onClick: () => setShowVoid(true),
      permission: 'void_transactions'
    },
    {
      id: 'emergency',
      icon: '🚨',
      label: 'Emergency',
      color: 'emergency',
      onClick: onEmergencyClose,
      permission: 'emergency_operations'
    }
  ];

  // Filter actions based on user permissions
  const availableActions = quickActionButtons.filter(action => 
    !action.permission || currentUser?.permissions?.includes(action.permission)
  );

  return (
    <div className="quick-actions-container" ref={actionsRef}>
      {/* Quick Stats Bar */}
      <div className="quick-stats-bar">
        <div className="stat-item">
          <span className="stat-icon">📋</span>
          <div className="stat-content">
            <span className="stat-value">{quickStats.todayOrders}</span>
            <span className="stat-label">Ordini</span>
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-icon">💰</span>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(quickStats.todayRevenue)}</span>
            <span className="stat-label">Incasso</span>
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(quickStats.averageOrder)}</span>
            <span className="stat-label">Media</span>
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-icon">🪑</span>
          <div className="stat-content">
            <span className="stat-value">{quickStats.busyTables}</span>
            <span className="stat-label">Tavoli</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="quick-actions-grid">
        {availableActions.map(action => (
          <button
            key={action.id}
            className={`quick-action-btn ${action.color}`}
            onClick={action.onClick}
            title={action.label}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
            {action.badge && (
              <span className="action-badge">{action.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Current Time & User */}
      <div className="quick-info-bar">
        <div className="current-time">
          🕐 {new Date().toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
        <div className="current-user">
          👤 {currentUser.name || 'Operatore'}
        </div>
      </div>

      {/* Cash Drawer Modal */}
      {showCashDrawer && (
        <div className="quick-modal-overlay" onClick={() => setShowCashDrawer(false)}>
          <div className="quick-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Operazioni Cassa</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCashDrawer(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Operazione:</label>
                <select
                  value={cashOperation}
                  onChange={(e) => setCashOperation(e.target.value)}
                  className="form-select"
                >
                  <option value="">Seleziona operazione</option>
                  <option value="cash_in">💵 Versamento</option>
                  <option value="cash_out">💸 Prelievo</option>
                  <option value="no_sale">📂 Solo apertura</option>
                </select>
              </div>

              {cashOperation && cashOperation !== 'no_sale' && (
                <div className="form-group">
                  <label>Importo (€):</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="form-input"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Motivo:</label>
                <input
                  type="text"
                  value={cashReason}
                  onChange={(e) => setCashReason(e.target.value)}
                  className="form-input"
                  placeholder="Descrivi il motivo dell'operazione"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowCashDrawer(false)}
                >
                  Annulla
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCashDrawerOperation}
                  disabled={!cashOperation || (!cashAmount && cashOperation !== 'no_sale') || !cashReason}
                >
                  Esegui Operazione
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <div className="quick-modal-overlay" onClick={() => setShowReports(false)}>
          <div className="quick-modal reports-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Report Rapidi</h3>
              <button 
                className="modal-close"
                onClick={() => setShowReports(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="reports-grid">
                <button
                  className="report-btn"
                  onClick={() => onPrintReport('daily_sales')}
                >
                  <span className="report-icon">📈</span>
                  <span className="report-title">Vendite Giornaliere</span>
                  <span className="report-subtitle">Riepilogo di oggi</span>
                </button>

                <button
                  className="report-btn"
                  onClick={() => onPrintReport('cash_register')}
                >
                  <span className="report-icon">💰</span>
                  <span className="report-title">Registro Cassa</span>
                  <span className="report-subtitle">Movimento contanti</span>
                </button>

                <button
                  className="report-btn"
                  onClick={() => onPrintReport('hourly_sales')}
                >
                  <span className="report-icon">🕐</span>
                  <span className="report-title">Vendite Orarie</span>
                  <span className="report-subtitle">Andamento per ora</span>
                </button>

                <button
                  className="report-btn"
                  onClick={() => onPrintReport('top_products')}
                >
                  <span className="report-icon">🏆</span>
                  <span className="report-title">Top Prodotti</span>
                  <span className="report-subtitle">Più venduti oggi</span>
                </button>

                <button
                  className="report-btn"
                  onClick={() => onPrintReport('payment_methods')}
                >
                  <span className="report-icon">💳</span>
                  <span className="report-title">Metodi Pagamento</span>
                  <span className="report-subtitle">Suddivisione pagamenti</span>
                </button>

                <button
                  className="report-btn"
                  onClick={() => onPrintReport('staff_performance')}
                >
                  <span className="report-icon">👥</span>
                  <span className="report-title">Performance Staff</span>
                  <span className="report-subtitle">Vendite per operatore</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefund && (
        <div className="quick-modal-overlay" onClick={() => setShowRefund(false)}>
          <div className="quick-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💸 Rimborso</h3>
              <button 
                className="modal-close"
                onClick={() => setShowRefund(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>ID Ordine:</label>
                <input
                  type="text"
                  value={refundOrderId}
                  onChange={(e) => setRefundOrderId(e.target.value)}
                  className="form-input"
                  placeholder="Inserisci ID ordine"
                />
              </div>

              <div className="form-group">
                <label>Importo Rimborso (€):</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="form-input"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Motivo:</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="form-textarea"
                  placeholder="Descrivi il motivo del rimborso"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowRefund(false)}
                >
                  Annulla
                </button>
                <button
                  className="btn-primary"
                  onClick={handleRefund}
                  disabled={!refundOrderId || !refundAmount || !refundReason}
                >
                  Elabora Rimborso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Transaction Modal */}
      {showVoid && (
        <div className="quick-modal-overlay" onClick={() => setShowVoid(false)}>
          <div className="quick-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>❌ Annulla Transazione</h3>
              <button 
                className="modal-close"
                onClick={() => setShowVoid(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="warning-message">
                <span className="warning-icon">⚠️</span>
                <div className="warning-text">
                  <h4>Attenzione!</h4>
                  <p>Stai per annullare l'ultima transazione. Questa operazione non può essere annullata.</p>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowVoid(false)}
                >
                  Annulla
                </button>
                <button
                  className="btn-danger"
                  onClick={handleVoidTransaction}
                >
                  Conferma Annullamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscount && (
        <div className="quick-modal-overlay" onClick={() => setShowDiscount(false)}>
          <div className="quick-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏷️ Applica Sconto</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDiscount(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Tipo Sconto:</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="form-select"
                >
                  <option value="percentage">Percentuale (%)</option>
                  <option value="fixed">Importo fisso (€)</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Valore {discountType === 'percentage' ? '(%)' : '(€)'}:
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="form-input"
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                  step={discountType === 'percentage' ? '1' : '0.01'}
                  placeholder={discountType === 'percentage' ? '10' : '5.00'}
                />
              </div>

              <div className="form-group">
                <label>Motivo (opzionale):</label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="form-input"
                  placeholder="Es: Cliente abituale, promozione speciale"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowDiscount(false)}
                >
                  Annulla
                </button>
                <button
                  className="btn-primary"
                  onClick={handleApplyQuickDiscount}
                  disabled={!discountValue}
                >
                  Applica Sconto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Orders Modal */}
      {showActions && heldOrders.length > 0 && (
        <div className="quick-modal-overlay" onClick={() => setShowActions(false)}>
          <div className="quick-modal held-orders-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📥 Ordini Sospesi</h3>
              <button 
                className="modal-close"
                onClick={() => setShowActions(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              {heldOrders.length === 0 ? (
                <div className="empty-held-orders">
                  <span className="empty-icon">📥</span>
                  <p>Nessun ordine sospeso</p>
                </div>
              ) : (
                <div className="held-orders-list">
                  {heldOrders.map(order => (
                    <div key={order.id} className="held-order-item">
                      <div className="held-order-info">
                        <div className="order-header">
                          <span className="order-id">Ordine #{order.id}</span>
                          <span className="order-time">{formatTime(order.held_at)}</span>
                        </div>
                        <div className="order-details">
                          <span className="order-total">{formatCurrency(order.total)}</span>
                          <span className="order-items">{order.items?.length || 0} prodotti</span>
                          {order.table_id && (
                            <span className="order-table">🪑 Tavolo {order.table_id}</span>
                          )}
                        </div>
                      </div>
                      <button
                        className="recall-order-btn"
                        onClick={() => handleRecallHeldOrder(order.id)}
                      >
                        📥 Recupera
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}