import { useState, useEffect, useRef } from 'react';

export default function CheckoutPanel({ 
  order, 
  onSubmitOrder, 
  onUpdateCustomerName, 
  loading 
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState(order.customer_name || '');
  const [discountType, setDiscountType] = useState('none'); // none, percentage, fixed
  const [discountValue, setDiscountValue] = useState('');
  const [finalTotal, setFinalTotal] = useState(order.total);
  const [change, setChange] = useState(0);
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitMethods, setSplitMethods] = useState([]);
  const [receipt, setReceipt] = useState({
    email: '',
    phone: '',
    print: true,
    sendEmail: false,
    sendSMS: false
  });
  const [quickAmounts, setQuickAmounts] = useState([]);
  const [orderNotes, setOrderNotes] = useState(order.notes || '');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const amountInputRef = useRef(null);
  const customerNameRef = useRef(null);

  // Payment methods configuration
  const paymentMethods = [
    { id: 'cash', name: 'Contanti', icon: '💵', color: 'green' },
    { id: 'card', name: 'Carta', icon: '💳', color: 'blue' },
    { id: 'digital', name: 'Digitale', icon: '📱', color: 'purple' },
    { id: 'voucher', name: 'Buono', icon: '🎫', color: 'orange' },
    { id: 'credit', name: 'Credito', icon: '🏦', color: 'gray' }
  ];

  useEffect(() => {
    calculateFinalTotal();
  }, [order.total, discountType, discountValue]);

  useEffect(() => {
    calculateChange();
  }, [finalTotal, amountReceived, paymentMethod]);

  useEffect(() => {
    generateQuickAmounts();
  }, [finalTotal]);

  useEffect(() => {
    if (customerName !== order.customer_name) {
      onUpdateCustomerName(customerName);
    }
  }, [customerName]);

  const calculateFinalTotal = () => {
    let total = order.total || 0;
    
    if (discountType === 'percentage' && discountValue) {
      const discount = (total * parseFloat(discountValue)) / 100;
      total = total - discount;
    } else if (discountType === 'fixed' && discountValue) {
      total = total - parseFloat(discountValue);
    }
    
    total = Math.max(0, total); // Ensure total is not negative
    setFinalTotal(total);
  };

  const calculateChange = () => {
    if (paymentMethod === 'cash' && amountReceived) {
      const received = parseFloat(amountReceived) || 0;
      const changeAmount = received - finalTotal;
      setChange(Math.max(0, changeAmount));
    } else {
      setChange(0);
    }
  };

  const generateQuickAmounts = () => {
    const total = finalTotal;
    const amounts = [];
    
    // Add exact amount
    amounts.push(total);
    
    // Add rounded amounts
    const roundedUp = Math.ceil(total);
    if (roundedUp !== total) amounts.push(roundedUp);
    
    // Add common amounts above total
    [5, 10, 20, 50, 100].forEach(amount => {
      if (amount > total && amount <= total + 50) {
        amounts.push(amount);
      }
    });
    
    // Remove duplicates and sort
    const uniqueAmounts = [...new Set(amounts)]
      .sort((a, b) => a - b)
      .slice(0, 6); // Max 6 quick amounts
      
    setQuickAmounts(uniqueAmounts);
  };

  const handleQuickAmountClick = (amount) => {
    setAmountReceived(amount.toString());
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
  };

  const handleAddSplitPayment = () => {
    const newSplit = {
      id: Date.now(),
      method: 'cash',
      amount: 0
    };
    setSplitMethods([...splitMethods, newSplit]);
  };

  const handleRemoveSplitPayment = (splitId) => {
    setSplitMethods(splitMethods.filter(split => split.id !== splitId));
  };

  const handleSplitPaymentChange = (splitId, field, value) => {
    setSplitMethods(splitMethods.map(split => 
      split.id === splitId ? { ...split, [field]: value } : split
    ));
  };

  const getSplitPaymentTotal = () => {
    return splitMethods.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  };

  const getSplitPaymentRemaining = () => {
    return Math.max(0, finalTotal - getSplitPaymentTotal());
  };

  const validatePayment = () => {
    if (finalTotal <= 0) {
      return { isValid: false, error: 'Importo ordine non valido' };
    }

    if (splitPayment) {
      const splitTotal = getSplitPaymentTotal();
      if (Math.abs(splitTotal - finalTotal) > 0.01) {
        return { 
          isValid: false, 
          error: `Pagamento diviso incompleto. Mancano ${formatCurrency(finalTotal - splitTotal)}` 
        };
      }
    } else {
      if (paymentMethod === 'cash') {
        const received = parseFloat(amountReceived) || 0;
        if (received < finalTotal) {
          return { 
            isValid: false, 
            error: `Importo insufficiente. Mancano ${formatCurrency(finalTotal - received)}` 
          };
        }
      }
    }

    return { isValid: true };
  };

  const handleSubmit = async () => {
    const validation = validatePayment();
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsProcessing(true);

    try {
      const paymentData = {
        method: splitPayment ? 'split' : paymentMethod,
        amount_received: splitPayment ? finalTotal : (parseFloat(amountReceived) || finalTotal),
        change_given: change,
        split_payments: splitPayment ? splitMethods : null,
        discount_type: discountType,
        discount_value: discountValue,
        final_total: finalTotal,
        customer_name: customerName.trim(),
        receipt_options: receipt,
        notes: orderNotes.trim()
      };

      await onSubmitOrder(paymentData.method, paymentData);
      
      // Reset form after successful submission
      resetForm();
      
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Errore durante il pagamento. Riprova.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('cash');
    setAmountReceived('');
    setCustomerName('');
    setDiscountType('none');
    setDiscountValue('');
    setChange(0);
    setSplitPayment(false);
    setSplitMethods([]);
    setReceipt({
      email: '',
      phone: '',
      print: true,
      sendEmail: false,
      sendSMS: false
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getPaymentMethodConfig = (methodId) => {
    return paymentMethods.find(method => method.id === methodId) || paymentMethods[0];
  };

  if (!order.items || order.items.length === 0) {
    return (
      <div className="checkout-panel-container">
        <div className="empty-checkout">
          <div className="empty-checkout-content">
            <span className="empty-icon">💰</span>
            <h3>Nessun prodotto da pagare</h3>
            <p>Aggiungi prodotti all'ordine per procedere al pagamento</p>
            <div className="checkout-suggestions">
              <h4>💡 Per procedere:</h4>
              <ul>
                <li>📋 Seleziona prodotti dal <strong>Menu</strong></li>
                <li>🪑 Scegli un <strong>Tavolo</strong> (opzionale)</li>
                <li>🛒 Verifica l'<strong>Ordine</strong></li>
                <li>💰 Torna alla <strong>Cassa</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-panel-container">
      {/* Checkout Header */}
      <div className="checkout-header">
        <h2 className="checkout-title">💰 Cassa - Pagamento</h2>
        <div className="checkout-summary">
          <div className="summary-row">
            <span>Subtotale:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>IVA (22%):</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          {discountType !== 'none' && (
            <div className="summary-row discount">
              <span>Sconto:</span>
              <span>-{formatCurrency(order.total - finalTotal)}</span>
            </div>
          )}
          <div className="summary-row final">
            <span>Totale:</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="customer-section">
        <h3 className="section-title">👤 Informazioni Cliente</h3>
        <div className="customer-form">
          <input
            ref={customerNameRef}
            type="text"
            placeholder="Nome cliente (opzionale)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="customer-name-input"
          />
        </div>
      </div>

      {/* Discount Section */}
      <div className="discount-section">
        <h3 className="section-title">🏷️ Sconto</h3>
        <div className="discount-controls">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="discount-type-select"
          >
            <option value="none">Nessuno sconto</option>
            <option value="percentage">Percentuale (%)</option>
            <option value="fixed">Importo fisso (€)</option>
          </select>
          
          {discountType !== 'none' && (
            <input
              type="number"
              placeholder={discountType === 'percentage' ? 'Percentuale' : 'Importo €'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="discount-value-input"
              min="0"
              max={discountType === 'percentage' ? '100' : order.total.toString()}
              step={discountType === 'percentage' ? '1' : '0.01'}
            />
          )}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="payment-method-section">
        <h3 className="section-title">💳 Metodo di Pagamento</h3>
        
        <div className="payment-options">
          <label className="split-payment-option">
            <input
              type="checkbox"
              checked={splitPayment}
              onChange={(e) => setSplitPayment(e.target.checked)}
            />
            <span>Pagamento diviso</span>
          </label>
        </div>

        {splitPayment ? (
          <div className="split-payment-section">
            <div className="split-payments-list">
              {splitMethods.map(split => (
                <div key={split.id} className="split-payment-item">
                  <select
                    value={split.method}
                    onChange={(e) => handleSplitPaymentChange(split.id, 'method', e.target.value)}
                    className="split-method-select"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.icon} {method.name}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="number"
                    placeholder="Importo"
                    value={split.amount}
                    onChange={(e) => handleSplitPaymentChange(split.id, 'amount', e.target.value)}
                    className="split-amount-input"
                    min="0"
                    max={finalTotal.toString()}
                    step="0.01"
                  />
                  
                  <button
                    className="remove-split-btn"
                    onClick={() => handleRemoveSplitPayment(split.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
            
            <button
              className="add-split-btn"
              onClick={handleAddSplitPayment}
            >
              ➕ Aggiungi metodo
            </button>
            
            <div className="split-payment-summary">
              <div className="split-row">
                <span>Totale pagato:</span>
                <span>{formatCurrency(getSplitPaymentTotal())}</span>
              </div>
              <div className="split-row remaining">
                <span>Rimanente:</span>
                <span>{formatCurrency(getSplitPaymentRemaining())}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="payment-methods-grid">
            {paymentMethods.map(method => (
              <button
                key={method.id}
                className={`payment-method-btn ${method.color} ${paymentMethod === method.id ? 'selected' : ''}`}
                onClick={() => setPaymentMethod(method.id)}
              >
                <span className="payment-icon">{method.icon}</span>
                <span className="payment-name">{method.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cash Payment Details */}
      {!splitPayment && paymentMethod === 'cash' && (
        <div className="cash-payment-section">
          <h3 className="section-title">💵 Dettagli Pagamento Contanti</h3>
          
          <div className="amount-input-section">
            <label className="amount-label">Importo ricevuto:</label>
            <input
              ref={amountInputRef}
              type="number"
              placeholder="0.00"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              className="amount-received-input"
              min="0"
              step="0.01"
            />
          </div>

          {/* Quick Amount Buttons */}
          {quickAmounts.length > 0 && (
            <div className="quick-amounts">
              <span className="quick-amounts-label">Importi rapidi:</span>
              <div className="quick-amounts-grid">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    className="quick-amount-btn"
                    onClick={() => handleQuickAmountClick(amount)}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Change Display */}
          {change > 0 && (
            <div className="change-display">
              <span className="change-label">Resto da dare:</span>
              <span className="change-amount">{formatCurrency(change)}</span>
            </div>
          )}
        </div>
      )}

      {/* Receipt Options */}
      <div className="receipt-section">
        <h3 className="section-title">🧾 Opzioni Ricevuta</h3>
        
        <div className="receipt-options">
          <label className="receipt-option">
            <input
              type="checkbox"
              checked={receipt.print}
              onChange={(e) => setReceipt({...receipt, print: e.target.checked})}
            />
            <span>🖨️ Stampa ricevuta</span>
          </label>
          
          <label className="receipt-option">
            <input
              type="checkbox"
              checked={receipt.sendEmail}
              onChange={(e) => setReceipt({...receipt, sendEmail: e.target.checked})}
            />
            <span>📧 Invia via email</span>
          </label>
          
          {receipt.sendEmail && (
            <input
              type="email"
              placeholder="Email cliente"
              value={receipt.email}
              onChange={(e) => setReceipt({...receipt, email: e.target.value})}
              className="receipt-email-input"
            />
          )}
          
          <label className="receipt-option">
            <input
              type="checkbox"
              checked={receipt.sendSMS}
              onChange={(e) => setReceipt({...receipt, sendSMS: e.target.checked})}
            />
            <span>📱 Invia via SMS</span>
          </label>
          
          {receipt.sendSMS && (
            <input
              type="tel"
              placeholder="Numero telefono"
              value={receipt.phone}
              onChange={(e) => setReceipt({...receipt, phone: e.target.value})}
              className="receipt-phone-input"
            />
          )}
        </div>
      </div>

      {/* Order Notes */}
      <div className="notes-section">
        <h3 className="section-title">📝 Note Ordine</h3>
        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Note aggiuntive per cucina o servizio..."
          className="order-notes-textarea"
          rows={3}
        />
      </div>

      {/* Payment Actions */}
      <div className="payment-actions">
        <button
          className="cancel-payment-btn"
          onClick={() => window.history.back()}
          disabled={loading || isProcessing}
        >
          ❌ Annulla
        </button>
        
        <button
          className="process-payment-btn"
          onClick={handleSubmit}
          disabled={loading || isProcessing || finalTotal <= 0}
        >
          {loading || isProcessing ? (
            <>
              <span className="loading-spinner-small"></span>
              Elaborando...
            </>
          ) : (
            <>
              ✅ Conferma Pagamento
              <span className="payment-total">{formatCurrency(finalTotal)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}