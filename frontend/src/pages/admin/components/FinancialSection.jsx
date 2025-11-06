import { useState, useEffect } from "react";
import "./FinancialSection.css";

export default function FinancialSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // YYYY-MM format per default
  });
  const [financialData, setFinancialData] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous');

  // Carica dati finanziari dal backend
  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod, selectedDate]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching financial data:', { selectedPeriod, selectedDate });
      
      const response = await fetch(`http://localhost:3000/api/financial/summary?period=${selectedPeriod}&date=${selectedDate}&comparison=${comparisonPeriod}`, {
        credentials: 'include',
      });

      const data = await response.json();
      console.log('📈 Financial data received:', data);
      
      // Se la risposta contiene un errore ma include dati di fallback
      if (!response.ok) {
        if (data.data) {
          // Usa i dati di fallback dal backend
          setFinancialData(data.data);
          setError(`Attenzione: ${data.error} - Visualizzazione dati di esempio`);
        } else {
          throw new Error(data.message || `Errore HTTP: ${response.status}`);
        }
      } else {
        // Aggiungi dati mancanti se non presenti
        if (!data.dailyTrend || data.dailyTrend.length === 0) {
          data.dailyTrend = generateDailyTrend(selectedPeriod, selectedDate);
        }
        
        if (!data.topProducts || data.topProducts.length === 0) {
          data.topProducts = generateTopProducts();
        }
        
        setFinancialData(data);
      }
    } catch (err) {
      console.error('❌ Error fetching financial data:', err);
      setError(`Errore nel caricamento dei dati: ${err.message}`);
      
      // Fallback con dati mock in caso di errore totale
      setFinancialData(generateFallbackData());
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/financial/detailed?period=${selectedPeriod}&date=${selectedDate}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      setDetailsData(data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('❌ Error fetching detailed report:', err);
      setError(`Errore nel caricamento del report: ${err.message}`);
    }
  };

  const exportFinancialData = async (format = 'excel') => {
    try {
      const response = await fetch(`http://localhost:3000/api/financial/export?period=${selectedPeriod}&date=${selectedDate}&format=${format}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('📁 Export response:', data);
      alert(`Funzione di esportazione in sviluppo - Formato: ${format}`);
    } catch (err) {
      console.error('❌ Error exporting data:', err);
      setError(`Errore nell'esportazione: ${err.message}`);
    }
  };

  // Genera trend giornaliero basato sul periodo
  const generateDailyTrend = (period, date) => {
    const trends = [];
    const days = period === 'month' ? 30 : period === 'week' ? 7 : 1;
    
    for (let i = days - 1; i >= 0; i--) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - i);
      
      trends.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 600) + 200,
        orders: Math.floor(Math.random() * 25) + 5
      });
    }
    
    return trends;
  };

  // Genera prodotti top mock
  const generateTopProducts = () => {
    return [
      { name: 'Birra IPA', revenue: 2450.50, margin: 68.2 },
      { name: 'Pizza Margherita', revenue: 1890.25, margin: 45.8 },
      { name: 'Tagliere Misto', revenue: 1567.80, margin: 72.1 },
      { name: 'Hamburger Classic', revenue: 1234.60, margin: 55.3 },
      { name: 'Birra Lager', revenue: 987.45, margin: 65.9 }
    ];
  };

  // Dati di fallback in caso di errore
  const generateFallbackData = () => {
    return {
      revenue: { current: 15420, previous: 13240, change: 16.5 },
      costs: { current: 8230, previous: 7890, change: 4.3 },
      profit: { current: 7190, previous: 5350, change: 34.4 },
      margin: { current: 46.6, previous: 40.4, change: 15.3 },
      orders: { current: 485, previous: 412, change: 17.7 },
      avgOrder: { current: 31.80, previous: 32.52, change: -2.2 },
      expenses: {
        ingredients: 4526.50,
        labor: 2057.50,
        utilities: 823.00,
        rent: 1200.00,
        other: 623.00
      },
      dailyTrend: generateDailyTrend('month', selectedDate),
      topProducts: generateTopProducts()
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    if (isNaN(value)) return '0.0%';
    const formatted = Math.abs(value).toFixed(1);
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${formatted}%`;
  };

  const getChangeClass = (value) => {
    return value >= 0 ? 'positive' : 'negative';
  };

  const getKPIStatus = (current, target) => {
    const ratio = (current / target) * 100;
    if (ratio >= 100) return 'excellent';
    if (ratio >= 90) return 'good';
    if (ratio >= 80) return 'warning';
    return 'poor';
  };

  // Gestione cambio data in base al periodo
  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    
    const today = new Date();
    let newDate;
    
    if (newPeriod === 'day') {
      newDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (newPeriod === 'week') {
      const year = today.getFullYear();
      const week = getWeekNumber(today);
      newDate = `${year}-W${week.toString().padStart(2, '0')}`; // YYYY-WXX
    } else if (newPeriod === 'month') {
      newDate = today.toISOString().slice(0, 7); // YYYY-MM
    }
    
    setSelectedDate(newDate);
  };

  // Calcola il numero della settimana
  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  if (loading) {
    return (
      <div className="financial-section">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento dati finanziari...</p>
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="financial-section">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Dati non disponibili</h3>
          <p>Impossibile caricare i dati finanziari</p>
          <button className="btn primary" onClick={fetchFinancialData}>
            🔄 Riprova
          </button>
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
            Controllo economico e margini • Periodo: {
              selectedPeriod === 'month' ? 'Mensile' : 
              selectedPeriod === 'week' ? 'Settimanale' : 
              'Giornaliero'
            }
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
            type={selectedPeriod === 'day' ? 'date' : selectedPeriod === 'week' ? 'week' : 'month'}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
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
          📈 Tendenze
        </button>
        <button 
          className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
          onClick={() => setActiveTab('breakdown')}
        >
          📋 Dettaglio
        </button>
        <button 
          className={`tab-btn ${activeTab === 'kpi' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpi')}
        >
          🎯 KPI
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

      {/* Contenuto principale */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards principali */}
          <div className="financial-overview">
            <div className="financial-card revenue">
              <div className="card-header">
                <div className="card-icon">💵</div>
                <div className="card-title">
                  <h3>Ricavi</h3>
                  <span className="card-subtitle">Totale incassato</span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{formatCurrency(financialData.revenue.current)}</div>
                <div className={`change ${getChangeClass(financialData.revenue.change)}`}>
                  {formatPercentage(financialData.revenue.change)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {formatCurrency(financialData.revenue.previous)}
                </span>
              </div>
            </div>

            <div className="financial-card costs">
              <div className="card-header">
                <div className="card-icon">💸</div>
                <div className="card-title">
                  <h3>Costi</h3>
                  <span className="card-subtitle">Spese operative</span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{formatCurrency(financialData.costs.current)}</div>
                <div className={`change ${getChangeClass(-financialData.costs.change)}`}>
                  {formatPercentage(financialData.costs.change)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {formatCurrency(financialData.costs.previous)}
                </span>
              </div>
            </div>

            <div className="financial-card profit">
              <div className="card-header">
                <div className="card-icon">💰</div>
                <div className="card-title">
                  <h3>Profitto</h3>
                  <span className="card-subtitle">Utile netto</span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{formatCurrency(financialData.profit.current)}</div>
                <div className={`change ${getChangeClass(financialData.profit.change)}`}>
                  {formatPercentage(financialData.profit.change)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {formatCurrency(financialData.profit.previous)}
                </span>
              </div>
            </div>

            <div className="financial-card margin">
              <div className="card-header">
                <div className="card-icon">📊</div>
                <div className="card-title">
                  <h3>Margine</h3>
                  <span className="card-subtitle">% di profitto</span>
                </div>
              </div>
              <div className="card-content">
                <div className="amount">{financialData.margin.current.toFixed(1)}%</div>
                <div className={`change ${getChangeClass(financialData.margin.change)}`}>
                  {formatPercentage(financialData.margin.change)}
                  <span className="change-label">vs periodo precedente</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="previous-amount">
                  Precedente: {financialData.margin.previous.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Metriche secondarie */}
          <div className="secondary-metrics">
            <div className="metric-card">
              <div className="metric-icon">🛒</div>
              <div className="metric-content">
                <div className="metric-value">{financialData.orders.current}</div>
                <div className="metric-label">Ordini Totali</div>
                <div className={`metric-change ${getChangeClass(financialData.orders.change)}`}>
                  {formatPercentage(financialData.orders.change)}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🎯</div>
              <div className="metric-content">
                <div className="metric-value">{formatCurrency(financialData.avgOrder.current)}</div>
                <div className="metric-label">Ordine Medio</div>
                <div className={`metric-change ${getChangeClass(financialData.avgOrder.change)}`}>
                  {formatPercentage(financialData.avgOrder.change)}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⚡</div>
              <div className="metric-content">
                <div className="metric-value">
                  {formatCurrency(financialData.orders.current > 0 ? financialData.revenue.current / financialData.orders.current : 0)}
                </div>
                <div className="metric-label">Revenue per Order</div>
                <div className="metric-change positive">
                  {formatPercentage(financialData.avgOrder.change)}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📅</div>
              <div className="metric-content">
                <div className="metric-value">
                  {formatCurrency(selectedPeriod === 'month' ? financialData.revenue.current / 30 : 
                                  selectedPeriod === 'week' ? financialData.revenue.current / 7 :
                                  financialData.revenue.current)}
                </div>
                <div className="metric-label">Revenue Giornaliera</div>
                <div className="metric-change positive">
                  {formatPercentage(financialData.revenue.change / (selectedPeriod === 'month' ? 30 : selectedPeriod === 'week' ? 7 : 1))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'trends' && (
        <div className="trends-section">
          <div className="trend-chart">
            <h3>📈 Andamento Ricavi (Ultimi {financialData.dailyTrend.length} giorni)</h3>
            <div className="chart-container">
              <div className="chart-placeholder">
                <div className="chart-bars">
                  {financialData.dailyTrend.slice(-10).map((day, index) => {
                    const maxRevenue = Math.max(...financialData.dailyTrend.map(d => d.revenue));
                    return (
                      <div key={index} className="chart-bar">
                        <div 
                          className="bar" 
                          style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                          title={`${day.date}: ${formatCurrency(day.revenue)} - ${day.orders} ordini`}
                        ></div>
                        <div className="bar-label">{day.date.split('-')[2]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="trend-analysis">
            <h3>🔍 Analisi Tendenze</h3>
            <div className="trend-insights">
              <div className="insight-card">
                <span className="insight-icon">📈</span>
                <div>
                  <strong>Crescita Revenue</strong>
                  <p>Trend {financialData.revenue.change >= 0 ? 'positivo' : 'negativo'} del {formatPercentage(financialData.revenue.change)} rispetto al periodo precedente</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">⚠️</span>
                <div>
                  <strong>Controllo Costi</strong>
                  <p>I costi sono {financialData.costs.change >= 0 ? 'aumentati' : 'diminuiti'} del {formatPercentage(financialData.costs.change)}</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">✅</span>
                <div>
                  <strong>Margini {financialData.margin.current >= 40 ? 'Stabili' : 'Sotto Target'}</strong>
                  <p>Il margine di profitto è al {financialData.margin.current.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'breakdown' && (
        <div className="breakdown-section">
          <div className="expenses-breakdown">
            <h3>💸 Breakdown Costi</h3>
            <div className="expense-items">
              <div className="expense-item">
                <span className="expense-label">🥘 Ingredienti</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.ingredients)}</span>
                <span className="expense-percentage">
                  {((financialData.expenses.ingredients / financialData.costs.current) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="expense-item">
                <span className="expense-label">👥 Personale</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.labor)}</span>
                <span className="expense-percentage">
                  {((financialData.expenses.labor / financialData.costs.current) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="expense-item">
                <span className="expense-label">⚡ Utilities</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.utilities)}</span>
                <span className="expense-percentage">
                  {((financialData.expenses.utilities / financialData.costs.current) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="expense-item">
                <span className="expense-label">🏠 Affitto</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.rent)}</span>
                <span className="expense-percentage">
                  {((financialData.expenses.rent / financialData.costs.current) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="expense-item">
                <span className="expense-label">📦 Altri</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.other)}</span>
                <span className="expense-percentage">
                  {((financialData.expenses.other / financialData.costs.current) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="top-products">
            <h3>🏆 Top Prodotti per Revenue</h3>
            <div className="product-list">
              {financialData.topProducts.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-rank">#{index + 1}</div>
                  <div className="product-info">
                    <span className="product-name">{product.name}</span>
                    <span className="product-revenue">{formatCurrency(product.revenue)}</span>
                  </div>
                  <div className="product-margin">
                    <span className="margin-value">{product.margin.toFixed(1)}%</span>
                    <span className="margin-label">margine</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kpi' && (
        <div className="kpi-section">
          <h3>🎯 Key Performance Indicators</h3>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Revenue Target</span>
                <span className={`kpi-status ${getKPIStatus(financialData.revenue.current, 16000)}`}>
                  {((financialData.revenue.current / 16000) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="kpi-progress">
                <div 
                  className="kpi-bar" 
                  style={{ width: `${Math.min((financialData.revenue.current / 16000) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="kpi-details">
                <span>Target: {formatCurrency(16000)}</span>
                <span>Attuale: {formatCurrency(financialData.revenue.current)}</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Costi Target</span>
                <span className={`kpi-status ${getKPIStatus(8000, financialData.costs.current)}`}>
                  {((8000 / financialData.costs.current) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="kpi-progress">
                <div 
                  className="kpi-bar" 
                  style={{ width: `${Math.min((financialData.costs.current / 8000) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="kpi-details">
                <span>Target: {formatCurrency(8000)}</span>
                <span>Attuale: {formatCurrency(financialData.costs.current)}</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Margine Target</span>
                <span className={`kpi-status ${getKPIStatus(financialData.margin.current, 50)}`}>
                  {((financialData.margin.current / 50) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="kpi-progress">
                <div 
                  className="kpi-bar" 
                  style={{ width: `${Math.min((financialData.margin.current / 50) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="kpi-details">
                <span>Target: 50.0%</span>
                <span>Attuale: {financialData.margin.current.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Azioni rapide */}
      <div className="financial-actions">
        <button 
          className="btn primary"
          onClick={fetchDetailedReport}
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
          onClick={() => exportFinancialData('excel')}
        >
          📁 Esporta Excel
        </button>
        <button 
          className="btn secondary"
          onClick={() => exportFinancialData('pdf')}
        >
          📄 Esporta PDF
        </button>
        <button 
          className="btn secondary"
          onClick={() => setShowBudgetModal(true)}
        >
          ⚙️ Budget Settings
        </button>
      </div>

      {/* Modal Report Dettagliato */}
      {showDetailsModal && detailsData && (
        <DetailedReportModal 
          data={detailsData}
          onClose={() => setShowDetailsModal(false)}
          period={selectedPeriod}
          date={selectedDate}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Modal Budget Settings */}
      {showBudgetModal && (
        <BudgetSettingsModal 
          onClose={() => setShowBudgetModal(false)}
          onSave={(budgetData) => {
            console.log('Budget salvato:', budgetData);
            setShowBudgetModal(false);
            // TODO: Implementare salvataggio budget
          }}
        />
      )}
    </div>
  );
}

// Modal Report Dettagliato
function DetailedReportModal({ data, onClose, period, date, formatCurrency }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">📊 Report Dettagliato - {date}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="report-section">
            <h4>💰 Riepilogo Finanziario</h4>
            <div className="report-grid">
              <div className="report-item">
                <span className="report-label">Ricavi Lordi:</span>
                <span className="report-value">{formatCurrency(data.summary?.totalRevenue || 0)}</span>
              </div>
              <div className="report-item">
                <span className="report-label">Ordini Totali:</span>
                <span className="report-value">{data.summary?.totalOrders || 0}</span>
              </div>
              <div className="report-item">
                <span className="report-label">Ordine Medio:</span>
                <span className="report-value">{formatCurrency(data.summary?.avgOrder || 0)}</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h4>📋 Dettaglio Ordini</h4>
            <div className="orders-table">
              {data.orders && data.orders.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Data</th>
                      <th>Totale</th>
                      <th>Stato</th>
                      <th>Pagamento</th>
                      <th>Articoli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.slice(0, 10).map(order => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{new Date(order.created_at).toLocaleString('it-IT')}</td>
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
              ) : (
                <p className="no-data">Nessun ordine trovato per il periodo selezionato</p>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Chiudi
          </button>
          <button className="btn primary">
            📄 Esporta Report
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Budget Settings (rimane uguale)
function BudgetSettingsModal({ onClose, onSave }) {
  const [budgetData, setBudgetData] = useState({
    monthlyRevenue: 16000,
    monthlyCosts: 8000,
    targetMargin: 50,
    ingredientsBudget: 4000,
    laborBudget: 2000,
    utilitiesBudget: 900,
    rentBudget: 1200,
    otherBudget: 900
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
          <h3 className="modal-title">⚙️ Impostazioni Budget</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-section">
              <h4>🎯 Target Principali</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Revenue Mensile Target</label>
                  <input
                    type="number"
                    name="monthlyRevenue"
                    className="form-input"
                    value={budgetData.monthlyRevenue}
                    onChange={handleChange}
                    min="0"
                    step="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Costi Mensili Target</label>
                  <input
                    type="number"
                    name="monthlyCosts"
                    className="form-input"
                    value={budgetData.monthlyCosts}
                    onChange={handleChange}
                    min="0"
                    step="100"
                  />
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
              <h4>💸 Budget per Categoria</h4>
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