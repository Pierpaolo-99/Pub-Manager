import { useState, useEffect } from "react";
import "./FinancialSection.css";

export default function FinancialSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // YYYY-MM format
  });
  const [financialData, setFinancialData] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous');

  // ✅ FETCH REAL DATA ONLY
  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod, selectedDate, comparisonPeriod]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching real financial data:', { selectedPeriod, selectedDate, comparisonPeriod });
      
      const response = await fetch(`/api/financial/summary?period=${selectedPeriod}&date=${selectedDate}&comparison=${comparisonPeriod}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      console.log('📈 Financial data received:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || `Errore HTTP: ${response.status}`);
      }

      // ✅ ONLY REAL DATA - NO MOCK
      if (responseData.success && responseData.data) {
        setFinancialData(responseData.data);
      } else {
        throw new Error('Dati non disponibili nel database');
      }
      
    } catch (err) {
      console.error('❌ Error fetching financial data:', err);
      setError(`Errore nel caricamento dei dati: ${err.message}`);
      
      // ✅ NO FALLBACK - ONLY ERROR STATE
      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async () => {
    try {
      const response = await fetch(`/api/financial/detailed?period=${selectedPeriod}&date=${selectedDate}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const responseData = await response.json();
      
      if (responseData.success && responseData.data) {
        setDetailsData(responseData.data);
        setShowDetailsModal(true);
      } else {
        throw new Error(responseData.error || 'Dati non disponibili');
      }
    } catch (err) {
      console.error('❌ Error fetching detailed report:', err);
      setError(`Errore nel caricamento del report: ${err.message}`);
    }
  };

  const exportFinancialData = async (format = 'json') => {
    try {
      const response = await fetch(`/api/financial/export?period=${selectedPeriod}&date=${selectedDate}&format=${format}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const responseData = await response.json();
      
      if (responseData.success) {
        if (format === 'json') {
          const dataStr = JSON.stringify(responseData.export_data, null, 2);
          const dataBlob = new Blob([dataStr], {type: 'application/json'});
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `financial-report-${selectedDate}.json`;
          link.click();
          URL.revokeObjectURL(url);
        } else {
          alert(`Export ${format} completato - ${responseData.summary?.records_count || 0} record esportati`);
        }
      } else {
        throw new Error(responseData.error || 'Errore nell\'esportazione');
      }
    } catch (err) {
      console.error('❌ Error exporting data:', err);
      setError(`Errore nell'esportazione: ${err.message}`);
    }
  };

  // ✅ UTILITY FUNCTIONS
  const formatCurrency = (amount) => {
    const value = parseFloat(amount) || 0;
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value) => {
    if (isNaN(value) || value === null || value === undefined) return '0.0%';
    const formatted = Math.abs(parseFloat(value)).toFixed(1);
    const sign = parseFloat(value) >= 0 ? '+' : '-';
    return `${sign}${formatted}%`;
  };

  const getChangeClass = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'neutral';
    return numValue >= 0 ? 'positive' : 'negative';
  };

  const getKPIStatus = (current, target) => {
    const ratio = (parseFloat(current) / parseFloat(target)) * 100;
    if (ratio >= 100) return 'excellent';
    if (ratio >= 90) return 'good';
    if (ratio >= 80) return 'warning';
    return 'poor';
  };

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    
    const today = new Date();
    let newDate;
    
    if (newPeriod === 'day') {
      newDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (newPeriod === 'week') {
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      newDate = monday.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (newPeriod === 'month') {
      newDate = today.toISOString().slice(0, 7); // YYYY-MM
    }
    
    setSelectedDate(newDate);
  };

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="financial-section">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento dati finanziari dal database...</p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE - NO DATA AVAILABLE
  if (!financialData) {
    return (
      <div className="financial-section">
        <div className="error-state">
          <span className="error-icon">📊</span>
          <h3>Nessun dato finanziario disponibile</h3>
          <p>
            {error ? error : 'Non ci sono dati nel database per il periodo selezionato'}
          </p>
          <div className="error-actions">
            <button className="btn primary" onClick={fetchFinancialData}>
              🔄 Ricarica
            </button>
            <button 
              className="btn secondary" 
              onClick={() => {
                setSelectedPeriod('month');
                const today = new Date();
                setSelectedDate(today.toISOString().slice(0, 7));
              }}
            >
              📅 Periodo Corrente
            </button>
          </div>
          <div className="data-info">
            <p><small>💡 I dati finanziari vengono calcolati automaticamente dai tuoi ordini e acquisti</small></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-section">
      {/* Header con controlli */}
      <div className="section-header">
        <div className="header-left">
          <h2>💰 Gestione Finanziaria</h2>
          <p className="section-subtitle">
            Dati reali dal database • Periodo: {
              selectedPeriod === 'month' ? 'Mensile' : 
              selectedPeriod === 'week' ? 'Settimanale' : 
              'Giornaliero'
            }
            {financialData.date_range && (
              <> • {financialData.date_range.start} → {financialData.date_range.end}</>
            )}
            {financialData.summary?.total_transactions && (
              <> • {financialData.summary.total_transactions} transazioni</>
            )}
          </p>
        </div>
        <div className="header-controls">
          <div className="period-selector">
            <button 
              className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('day')}
            >
              Giorno
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('week')}
            >
              Settimana
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              Mese
            </button>
          </div>
          <input 
            type={selectedPeriod === 'day' ? 'date' : selectedPeriod === 'week' ? 'date' : 'month'}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      {/* ✅ DATA SOURCE INDICATOR */}
      <div className="data-source-info">
        <span className="source-icon">🗄️</span>
        <span>
          Fonte dati: Database reale • 
          {financialData.costs?.source === 'purchase_orders' && financialData.costs.purchase_orders_count > 0 && (
            <> Ordini acquisto: {financialData.costs.purchase_orders_count} • </>
          )}
          {financialData.revenue?.breakdown && (
            <>
              Pagamenti: 💰 {formatCurrency(financialData.revenue.breakdown.cash)} • 
              💳 {formatCurrency(financialData.revenue.breakdown.card)} • 
              🏧 {formatCurrency(financialData.revenue.breakdown.debit)}
            </>
          )}
        </span>
      </div>

      {/* Navigazione Tab */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Panoramica
        </button>
        <button 
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          📈 Andamento
        </button>
        <button 
          className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
          onClick={() => setActiveTab('breakdown')}
        >
          📋 Dettaglio Costi
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          🧾 Transazioni
        </button>
      </div>

      {/* Messaggi di errore */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button 
            className="error-close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* ✅ OVERVIEW TAB - ONLY REAL DATA */}
      {activeTab === 'overview' && (
        <>
          <div className="financial-overview">
            <div className="financial-card revenue">
              <div className="card-header">
                <div className="card-icon">💵</div>
                <div className="card-title">
                  <h3>Ricavi Totali</h3>
                  <span className="card-subtitle">
                    Incassato nel periodo
                    {financialData.revenue?.tax_collected > 0 && (
                      <> • IVA: {formatCurrency(financialData.revenue.tax_collected)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{formatCurrency(financialData.revenue?.current || 0)}</div>
                <div className={`change ${getChangeClass(financialData.revenue?.change || 0)}`}>
                  {formatPercentage(financialData.revenue?.change || 0)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
                {financialData.revenue?.discounts_given > 0 && (
                  <div className="additional-info">
                    <small>Sconti applicati: {formatCurrency(financialData.revenue.discounts_given)}</small>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {formatCurrency(financialData.revenue?.previous || 0)}
                </span>
                {financialData.revenue?.breakdown && (
                  <div className="payment-methods">
                    <span>💰 {formatCurrency(financialData.revenue.breakdown.cash)}</span>
                    <span>💳 {formatCurrency(financialData.revenue.breakdown.card)}</span>
                    <span>🏧 {formatCurrency(financialData.revenue.breakdown.debit)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="financial-card costs">
              <div className="card-header">
                <div className="card-icon">💸</div>
                <div className="card-title">
                  <h3>Costi Totali</h3>
                  <span className="card-subtitle">
                    Spese operative • {
                      financialData.costs?.source === 'purchase_orders' ? 'Da ordini reali' :
                      financialData.costs?.source === 'stock_movements' ? 'Da movimenti stock' :
                      'Calcolato'
                    }
                  </span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{formatCurrency(financialData.costs?.current || 0)}</div>
                <div className={`change ${getChangeClass(-(financialData.costs?.change || 0))}`}>
                  {formatPercentage(financialData.costs?.change || 0)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
                {financialData.summary?.cost_ratio && (
                  <div className="additional-info">
                    <small>Incidenza sui ricavi: {financialData.summary.cost_ratio.toFixed(1)}%</small>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {formatCurrency(financialData.costs?.previous || 0)}
                </span>
                {financialData.costs?.purchase_orders_count > 0 && (
                  <small>{financialData.costs.purchase_orders_count} ordini d'acquisto</small>
                )}
              </div>
            </div>

            <div className="financial-card profit">
              <div className="card-header">
                <div className="card-icon">💰</div>
                <div className="card-title">
                  <h3>Profitto Netto</h3>
                  <span className="card-subtitle">Utile dopo costi</span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{formatCurrency(financialData.profit?.current || 0)}</div>
                <div className={`change ${getChangeClass(financialData.profit?.change || 0)}`}>
                  {formatPercentage(financialData.profit?.change || 0)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
                {financialData.profit?.margin_percentage !== undefined && (
                  <div className="additional-info">
                    <small>Margine di profitto: {financialData.profit.margin_percentage.toFixed(1)}%</small>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {formatCurrency(financialData.profit?.previous || 0)}
                </span>
              </div>
            </div>

            <div className="financial-card margin">
              <div className="card-header">
                <div className="card-icon">📊</div>
                <div className="card-title">
                  <h3>Margine %</h3>
                  <span className="card-subtitle">Percentuale di profitto</span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{(financialData.margin?.current || 0).toFixed(1)}%</div>
                <div className={`change ${getChangeClass(financialData.margin?.change || 0)}`}>
                  {formatPercentage(financialData.margin?.change || 0)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {(financialData.margin?.previous || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* ✅ REAL SECONDARY METRICS */}
          <div className="secondary-metrics">
            <div className="metric-card">
              <div className="metric-icon">🛒</div>
              <div className="metric-content">
                <div className="metric-value">{financialData.orders?.current || 0}</div>
                <div className="metric-label">Ordini Totali</div>
                <div className={`metric-change ${getChangeClass(financialData.orders?.change || 0)}`}>
                  {formatPercentage(financialData.orders?.change || 0)}
                </div>
                {financialData.orders?.payment_breakdown && (
                  <div className="metric-breakdown">
                    <small>
                      💰 {financialData.orders.payment_breakdown.cash} • 
                      💳 {financialData.orders.payment_breakdown.card} • 
                      🏧 {financialData.orders.payment_breakdown.debit}
                    </small>
                  </div>
                )}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🎯</div>
              <div className="metric-content">
                <div className="metric-value">{formatCurrency(financialData.avgOrder?.current || 0)}</div>
                <div className="metric-label">Ordine Medio</div>
                <div className={`metric-change ${getChangeClass(financialData.avgOrder?.change || 0)}`}>
                  {formatPercentage(financialData.avgOrder?.change || 0)}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-value">
                  {formatCurrency(selectedPeriod === 'month' ? (financialData.revenue?.current || 0) / 30 : 
                                  selectedPeriod === 'week' ? (financialData.revenue?.current || 0) / 7 :
                                  (financialData.revenue?.current || 0))}
                </div>
                <div className="metric-label">Revenue/Giorno</div>
                <div className="metric-change positive">
                  Trend {(financialData.revenue?.change || 0) >= 0 ? 'positivo' : 'negativo'}
                </div>
              </div>
            </div>

            {financialData.summary?.profit_margin && (
              <div className="metric-card">
                <div className="metric-icon">💹</div>
                <div className="metric-content">
                  <div className="metric-value">{financialData.summary.profit_margin.toFixed(1)}%</div>
                  <div className="metric-label">Profit Margin</div>
                  <div className={`metric-change ${getChangeClass(financialData.summary.profit_margin - 40)}`}>
                    Target: 40%
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ✅ TRENDS TAB - REAL DATA ANALYSIS */}
      {activeTab === 'trends' && (
        <div className="trends-section">
          <div className="trend-analysis">
            <h3>📈 Analisi Andamento 
              {financialData.date_range && (
                <small> ({financialData.date_range.start} → {financialData.date_range.end})</small>
              )}
            </h3>
            <div className="trend-insights">
              <div className="insight-card">
                <span className="insight-icon">
                  {(financialData.revenue?.change || 0) >= 0 ? '📈' : '📉'}
                </span>
                <div>
                  <strong>Andamento Revenue</strong>
                  <p>
                    {(financialData.revenue?.change || 0) >= 0 ? 'Crescita' : 'Diminuzione'} del {formatPercentage(financialData.revenue?.change || 0)} rispetto al periodo precedente
                  </p>
                  {financialData.revenue?.breakdown && (
                    <small>
                      Composizione: 
                      💰 {((financialData.revenue.breakdown.cash / (financialData.revenue.current || 1)) * 100).toFixed(0)}% • 
                      💳 {((financialData.revenue.breakdown.card / (financialData.revenue.current || 1)) * 100).toFixed(0)}% • 
                      🏧 {((financialData.revenue.breakdown.debit / (financialData.revenue.current || 1)) * 100).toFixed(0)}%
                    </small>
                  )}
                </div>
              </div>

              <div className="insight-card">
                <span className="insight-icon">
                  {(financialData.costs?.change || 0) <= 0 ? '✅' : '⚠️'}
                </span>
                <div>
                  <strong>Controllo Costi</strong>
                  <p>
                    I costi sono {(financialData.costs?.change || 0) >= 0 ? 'aumentati' : 'diminuiti'} del {formatPercentage(Math.abs(financialData.costs?.change || 0))}
                  </p>
                  <small>
                    Fonte: {
                      financialData.costs?.source === 'purchase_orders' ? 'Ordini d\'acquisto reali' :
                      financialData.costs?.source === 'stock_movements' ? 'Movimenti di magazzino' :
                      'Calcolo automatico'
                    }
                  </small>
                </div>
              </div>

              <div className="insight-card">
                <span className="insight-icon">
                  {(financialData.margin?.current || 0) >= 40 ? '✅' : (financialData.margin?.current || 0) >= 25 ? '⚠️' : '❌'}
                </span>
                <div>
                  <strong>Performance Margini</strong>
                  <p>
                    Margine attuale: {(financialData.margin?.current || 0).toFixed(1)}% 
                    {(financialData.margin?.current || 0) >= 40 ? ' (Eccellente)' : 
                     (financialData.margin?.current || 0) >= 25 ? ' (Buono)' : ' (Da migliorare)'}
                  </p>
                  {financialData.summary?.cost_ratio && (
                    <small>Rapporto costi/ricavi: {financialData.summary.cost_ratio.toFixed(1)}%</small>
                  )}
                </div>
              </div>

              {financialData.orders && (
                <div className="insight-card">
                  <span className="insight-icon">🛒</span>
                  <div>
                    <strong>Volume Ordini</strong>
                    <p>
                      {financialData.orders.current} ordini totali 
                      ({(financialData.orders.change || 0) >= 0 ? '+' : ''}{formatPercentage(financialData.orders.change || 0)} vs precedente)
                    </p>
                    <small>
                      Ordine medio: {formatCurrency(financialData.avgOrder?.current || 0)}
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ PERIOD COMPARISON */}
          {(financialData.revenue?.previous > 0 || financialData.costs?.previous > 0) && (
            <div className="period-comparison">
              <h3>⚖️ Confronto Periodi</h3>
              <div className="comparison-table">
                <div className="comparison-header">
                  <span>Metrica</span>
                  <span>Periodo Corrente</span>
                  <span>Periodo Precedente</span>
                  <span>Variazione</span>
                </div>
                <div className="comparison-row">
                  <span>💵 Revenue</span>
                  <span>{formatCurrency(financialData.revenue?.current || 0)}</span>
                  <span>{formatCurrency(financialData.revenue?.previous || 0)}</span>
                  <span className={getChangeClass(financialData.revenue?.change || 0)}>
                    {formatPercentage(financialData.revenue?.change || 0)}
                  </span>
                </div>
                <div className="comparison-row">
                  <span>💸 Costi</span>
                  <span>{formatCurrency(financialData.costs?.current || 0)}</span>
                  <span>{formatCurrency(financialData.costs?.previous || 0)}</span>
                  <span className={getChangeClass(-(financialData.costs?.change || 0))}>
                    {formatPercentage(financialData.costs?.change || 0)}
                  </span>
                </div>
                <div className="comparison-row">
                  <span>💰 Profitto</span>
                  <span>{formatCurrency(financialData.profit?.current || 0)}</span>
                  <span>{formatCurrency(financialData.profit?.previous || 0)}</span>
                  <span className={getChangeClass(financialData.profit?.change || 0)}>
                    {formatPercentage(financialData.profit?.change || 0)}
                  </span>
                </div>
                <div className="comparison-row">
                  <span>📊 Margine %</span>
                  <span>{(financialData.margin?.current || 0).toFixed(1)}%</span>
                  <span>{(financialData.margin?.previous || 0).toFixed(1)}%</span>
                  <span className={getChangeClass(financialData.margin?.change || 0)}>
                    {formatPercentage(financialData.margin?.change || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ BREAKDOWN TAB - REAL EXPENSES FROM DB */}
      {activeTab === 'breakdown' && (
        <div className="breakdown-section">
          <div className="expenses-breakdown">
            <h3>💸 Breakdown Costi Reali 
              {financialData.costs?.source && (
                <small> (Fonte: {
                  financialData.costs.source === 'purchase_orders' ? 'Ordini d\'acquisto' :
                  financialData.costs.source === 'stock_movements' ? 'Movimenti magazzino' :
                  'Calcolo automatico'
                })</small>
              )}
            </h3>
            
            {financialData.expenses ? (
              <div className="expense-items">
                {Object.entries(financialData.expenses).map(([category, amount]) => {
                  const icons = {
                    ingredients: '🥘',
                    beverages: '🍺', 
                    meat: '🥩',
                    labor: '👥',
                    utilities: '⚡',
                    rent: '🏠',
                    other: '📦'
                  };
                  
                  const labels = {
                    ingredients: 'Ingredienti',
                    beverages: 'Bevande',
                    meat: 'Carne', 
                    labor: 'Personale',
                    utilities: 'Utilities',
                    rent: 'Affitto',
                    other: 'Altri Costi'
                  };
                  
                  if (amount > 0) {
                    return (
                      <div key={category} className="expense-item">
                        <span className="expense-label">
                          {icons[category] || '📦'} {labels[category] || category}
                        </span>
                        <span className="expense-amount">{formatCurrency(amount)}</span>
                        <span className="expense-percentage">
                          {(financialData.costs?.current || 0) > 0 ? 
                            ((amount / (financialData.costs?.current || 1)) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="no-expense-data">
                <span className="no-data-icon">📊</span>
                <p>Nessun dettaglio costi disponibile</p>
                <small>I dati verranno popolati automaticamente con ordini e movimenti</small>
              </div>
            )}
          </div>

          {/* ✅ REAL COST ANALYSIS */}
          {financialData.expenses && Object.values(financialData.expenses).some(amount => amount > 0) && (
            <div className="cost-analysis">
              <h3>🔍 Analisi Costi</h3>
              <div className="analysis-insights">
                <div className="analysis-item">
                  <span className="analysis-label">Categoria Principale:</span>
                  <span className="analysis-value">
                    {(() => {
                      const maxCategory = Object.entries(financialData.expenses)
                        .reduce((max, [cat, amount]) => amount > max.amount ? {category: cat, amount} : max, {category: '', amount: 0});
                      const labels = {
                        ingredients: '🥘 Ingredienti',
                        beverages: '🍺 Bevande',
                        meat: '🥩 Carne',
                        labor: '👥 Personale',
                        utilities: '⚡ Utilities',
                        rent: '🏠 Affitto',
                        other: '📦 Altri'
                      };
                      return labels[maxCategory.category] || maxCategory.category;
                    })()}
                  </span>
                </div>
                
                <div className="analysis-item">
                  <span className="analysis-label">Incidenza sui Ricavi:</span>
                  <span className="analysis-value">
                    {financialData.summary?.cost_ratio ? 
                      `${financialData.summary.cost_ratio.toFixed(1)}%` : 
                      `${(((financialData.costs?.current || 0) / (financialData.revenue?.current || 1)) * 100).toFixed(1)}%`
                    }
                  </span>
                </div>

                <div className="analysis-item">
                  <span className="analysis-label">Status Controllo:</span>
                  <span className={`analysis-value ${
                    (financialData.summary?.cost_ratio || 0) <= 60 ? 'positive' : 
                    (financialData.summary?.cost_ratio || 0) <= 70 ? 'warning' : 'negative'
                  }`}>
                    {(financialData.summary?.cost_ratio || 0) <= 60 ? '✅ Ottimale' : 
                     (financialData.summary?.cost_ratio || 0) <= 70 ? '⚠️ Accettabile' : '❌ Critico'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ TRANSACTIONS TAB - REAL TRANSACTION DATA */}
      {activeTab === 'transactions' && (
        <div className="transactions-section">
          <h3>🧾 Riepilogo Transazioni</h3>
          
          {financialData.summary ? (
            <div className="transactions-summary">
              <div className="summary-cards">
                <div className="summary-card">
                  <span className="summary-icon">📊</span>
                  <div className="summary-content">
                    <div className="summary-number">{financialData.summary.total_transactions || 0}</div>
                    <div className="summary-label">Transazioni Totali</div>
                  </div>
                </div>

                <div className="summary-card">
                  <span className="summary-icon">💰</span>
                  <div className="summary-content">
                    <div className="summary-number">{formatCurrency(financialData.summary.gross_revenue || 0)}</div>
                    <div className="summary-label">Revenue Lorda</div>
                  </div>
                </div>

                <div className="summary-card">
                  <span className="summary-icon">💎</span>
                  <div className="summary-content">
                    <div className="summary-number">{formatCurrency(financialData.summary.net_profit || 0)}</div>
                    <div className="summary-label">Profitto Netto</div>
                  </div>
                </div>

                <div className="summary-card">
                  <span className="summary-icon">📈</span>
                  <div className="summary-content">
                    <div className="summary-number">
                      {(financialData.summary.profit_margin || 0).toFixed(1)}%
                    </div>
                    <div className="summary-label">Profit Margin</div>
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              {financialData.summary.payment_methods && (
                <div className="payment-breakdown">
                  <h4>💳 Metodi di Pagamento</h4>
                  <div className="payment-methods">
                    {Object.entries(financialData.summary.payment_methods).map(([method, amount]) => {
                      const icons = {
                        contanti: '💰',
                        carta: '💳', 
                        bancomat: '🏧',
                        card: '💳',
                        cash: '💰',
                        debit: '🏧'
                      };
                      
                      return (
                        <div key={method} className="payment-method-item">
                          <span className="payment-icon">{icons[method] || '💳'}</span>
                          <span className="payment-method">{method.charAt(0).toUpperCase() + method.slice(1)}</span>
                          <span className="payment-amount">{formatCurrency(amount)}</span>
                          <span className="payment-percentage">
                            {(financialData.revenue?.current > 0 ? 
                              (amount / financialData.revenue.current * 100).toFixed(1) : '0.0')}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-transactions-data">
              <span className="no-data-icon">🧾</span>
              <p>Nessun dato transazione disponibile</p>
              <small>I dati appariranno automaticamente con le prime vendite</small>
            </div>
          )}

          <div className="transactions-actions">
            <button 
              className="btn primary"
              onClick={fetchDetailedReport}
              disabled={!financialData.summary?.total_transactions}
            >
              📄 Report Completo
            </button>
            <button 
              className="btn secondary"
              onClick={() => exportFinancialData('json')}
              disabled={!financialData.summary?.total_transactions}
            >
              💾 Esporta Dati
            </button>
          </div>
        </div>
      )}

      {/* Azioni rapide */}
      <div className="financial-actions">
        <button 
          className="btn primary"
          onClick={fetchDetailedReport}
          disabled={!financialData.summary?.total_transactions}
        >
          📊 Report Dettagliato
        </button>
        <button 
          className="btn secondary"
          onClick={() => setActiveTab('trends')}
        >
          📈 Analisi Trend
        </button>
        <button 
          className="btn secondary"
          onClick={() => exportFinancialData('json')}
          disabled={!financialData}
        >
          📁 Esporta JSON
        </button>
        <button 
          className="btn secondary"
          onClick={() => setShowBudgetModal(true)}
        >
          ⚙️ Impostazioni
        </button>
      </div>

      {/* ✅ MODALS WITH REAL DATA ONLY */}
      {showDetailsModal && detailsData && (
        <DetailedReportModal 
          data={detailsData}
          onClose={() => setShowDetailsModal(false)}
          period={selectedPeriod}
          date={selectedDate}
          formatCurrency={formatCurrency}
        />
      )}

      {showBudgetModal && (
        <BudgetSettingsModal 
          currentData={financialData}
          onClose={() => setShowBudgetModal(false)}
          onSave={(budgetData) => {
            console.log('Budget salvato:', budgetData);
            setShowBudgetModal(false);
            alert('Funzione salvataggio budget in sviluppo');
          }}
        />
      )}
    </div>
  );
}

// ✅ ENHANCED DETAILED REPORT MODAL - REAL DATA ONLY
function DetailedReportModal({ data, onClose, period, date, formatCurrency }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">
            📊 Report Dettagliato - Database Reale
            <small> • {period} • {date}</small>
            {data.date_range && (
              <span> ({data.date_range.start} → {data.date_range.end})</span>
            )}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="report-section">
            <h4>💰 Riepilogo Database</h4>
            <div className="report-grid">
              <div className="report-item">
                <span className="report-label">📊 Fonte Dati:</span>
                <span className="report-value">Database reale - {data.summary?.total_orders || 0} ordini</span>
              </div>
              <div className="report-item">
                <span className="report-label">💵 Ricavi Lordi:</span>
                <span className="report-value">{formatCurrency(data.summary?.total_revenue || 0)}</span>
              </div>
              <div className="report-item">
                <span className="report-label">💰 Ordine Medio:</span>
                <span className="report-value">{formatCurrency(data.summary?.avg_order_value || 0)}</span>
              </div>
              {data.summary?.total_tax > 0 && (
                <div className="report-item">
                  <span className="report-label">🏛️ IVA Totale:</span>
                  <span className="report-value">{formatCurrency(data.summary.total_tax)}</span>
                </div>
              )}
              {data.summary?.total_discounts > 0 && (
                <div className="report-item">
                  <span className="report-label">💸 Sconti:</span>
                  <span className="report-value">{formatCurrency(data.summary.total_discounts)}</span>
                </div>
              )}
              {data.summary?.payment_methods && (
                <>
                  {Object.entries(data.summary.payment_methods).map(([method, amount]) => (
                    <div key={method} className="report-item">
                      <span className="report-label">
                        {method === 'contanti' ? '💰' : method === 'carta' ? '💳' : '🏧'} {method}:
                      </span>
                      <span className="report-value">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {data.orders && data.orders.length > 0 ? (
            <div className="report-section">
              <h4>🧾 Ordini Database ({data.orders.length} record)</h4>
              <div className="orders-table">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Data/Ora</th>
                        <th>Tavolo</th>
                        <th>Cliente</th>
                        <th>Totale</th>
                        <th>Stato</th>
                        <th>Pagamento</th>
                        <th>Articoli</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.slice(0, 20).map(order => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{new Date(order.created_at).toLocaleString('it-IT')}</td>
                          <td>{order.table_number ? `Tavolo ${order.table_number}` : '-'}</td>
                          <td>{order.customer_name || '-'}</td>
                          <td>{formatCurrency(order.total)}</td>
                          <td>
                            <span className={`status ${order.status}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{order.payment_method || 'N/A'}</td>
                          <td>{order.items_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.orders.length > 20 && (
                    <p className="table-note">
                      Mostrati 20 di {data.orders.length} ordini dal database
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-orders">
              <span className="no-data-icon">📊</span>
              <p>Nessun ordine nel database per questo periodo</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button 
            className="btn primary" 
            onClick={() => alert('Export da database reale in sviluppo')}
            disabled={!data.orders || data.orders.length === 0}
          >
            📄 Esporta Database
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ BUDGET MODAL WITH CURRENT REAL DATA CONTEXT
function BudgetSettingsModal({ currentData, onClose, onSave }) {
  const [budgetData, setBudgetData] = useState({
    monthlyRevenue: currentData?.revenue?.current ? Math.round(currentData.revenue.current * 1.1) : 16000,
    monthlyCosts: currentData?.costs?.current ? Math.round(currentData.costs.current * 0.95) : 8000,
    targetMargin: currentData?.margin?.current ? Math.round(currentData.margin.current + 5) : 50,
    ingredientsBudget: currentData?.expenses?.ingredients ? Math.round(currentData.expenses.ingredients * 0.9) : 4000,
    laborBudget: currentData?.expenses?.labor ? Math.round(currentData.expenses.labor * 1.05) : 2000,
    utilitiesBudget: currentData?.expenses?.utilities ? Math.round(currentData.expenses.utilities * 1.02) : 900,
    rentBudget: currentData?.expenses?.rent || 1200,
    otherBudget: currentData?.expenses?.other ? Math.round(currentData.expenses.other * 0.95) : 900
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(budgetData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBudgetData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">⚙️ Impostazioni Budget 
            <small> (Basato su dati reali correnti)</small>
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Current vs Target Comparison */}
            {currentData && (
              <div className="current-vs-target">
                <h4>📊 Dati Attuali vs Target</h4>
                <div className="comparison-grid">
                  <div className="comparison-item">
                    <span>Revenue Attuale:</span>
                    <span>{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(currentData.revenue?.current || 0)}</span>
                  </div>
                  <div className="comparison-item">
                    <span>Costi Attuali:</span>
                    <span>{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(currentData.costs?.current || 0)}</span>
                  </div>
                  <div className="comparison-item">
                    <span>Margine Attuale:</span>
                    <span>{(currentData.margin?.current || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="form-section">
              <h4>🎯 Target Futuri</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Revenue Target</label>
                  <input
                    type="number"
                    name="monthlyRevenue"
                    className="form-input"
                    value={budgetData.monthlyRevenue}
                    onChange={handleChange}
                    min="0"
                    step="100"
                  />
                  <small>Suggerito: +10% rispetto attuale</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Costi Target</label>
                  <input
                    type="number"
                    name="monthlyCosts"
                    className="form-input"
                    value={budgetData.monthlyCosts}
                    onChange={handleChange}
                    min="0"
                    step="100"
                  />
                  <small>Suggerito: -5% rispetto attuale</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Margine Target (%)</label>
                  <input
                    type="number"
                    name="targetMargin"
                    className="form-input"
                    value={budgetData.targetMargin}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>💸 Budget Dettagliati</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">🥘 Ingredienti</label>
                  <input
                    type="number"
                    name="ingredientsBudget"
                    className="form-input"
                    value={budgetData.ingredientsBudget}
                    onChange={handleChange}
                    min="0"
                    step="50"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">👥 Personale</label>
                  <input
                    type="number"
                    name="laborBudget"
                    className="form-input"
                    value={budgetData.laborBudget}
                    onChange={handleChange}
                    min="0"
                    step="50"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">⚡ Utilities</label>
                  <input
                    type="number"
                    name="utilitiesBudget"
                    className="form-input"
                    value={budgetData.utilitiesBudget}
                    onChange={handleChange}
                    min="0"
                    step="50"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">🏠 Affitto</label>
                  <input
                    type="number"
                    name="rentBudget"
                    className="form-input"
                    value={budgetData.rentBudget}
                    onChange={handleChange}
                    min="0"
                    step="50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn primary">
              💾 Salva Budget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}