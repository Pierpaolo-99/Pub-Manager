import { useState, useEffect } from "react";
import "./FinancialSection.css";

export default function FinancialSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState('2024-11');
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
      const response = await fetch(`/api/financial/summary?period=${selectedPeriod}&date=${selectedDate}&comparison=${comparisonPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati finanziari');
      }

      const data = await response.json();
      setFinancialData(data);
      setError(null);
    } catch (err) {
      console.error('Errore:', err);
      setError(err.message);
      // Dati di fallback per sviluppo
      setFinancialData({
        revenue: { current: 15420.00, previous: 13410.00, change: 15.0 },
        costs: { current: 8230.50, previous: 7560.20, change: 8.9 },
        profit: { current: 7189.50, previous: 5849.80, change: 22.9 },
        margin: { current: 46.6, previous: 43.6, change: 6.9 },
        orders: { current: 485, previous: 412, change: 17.7 },
        avgOrder: { current: 31.80, previous: 32.55, change: -2.3 },
        expenses: {
          ingredients: 4230.50,
          labor: 2100.00,
          utilities: 890.00,
          rent: 1200.00,
          other: 810.00
        },
        dailyTrend: generateDailyTrend(),
        topProducts: [
          { name: "Birra IPA", revenue: 2340.50, margin: 65.2 },
          { name: "Hamburger Deluxe", revenue: 1890.30, margin: 58.1 },
          { name: "Fish & Chips", revenue: 1456.20, margin: 62.8 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async () => {
    try {
      const response = await fetch(`/api/financial/detailed?period=${selectedPeriod}&date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento del report dettagliato');
      }

      const data = await response.json();
      setDetailsData(data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Errore:', err);
      setError(err.message);
    }
  };

  const exportFinancialData = async (format = 'excel') => {
    try {
      const response = await fetch(`/api/financial/export?period=${selectedPeriod}&date=${selectedDate}&format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore nell\'esportazione dei dati');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${selectedDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Errore:', err);
      setError(err.message);
    }
  };

  const generateDailyTrend = () => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 800) + 300,
        orders: Math.floor(Math.random() * 30) + 10
      });
    }
    return days;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value) => {
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

  return (
    <div className="financial-section">
      {/* Header con controlli */}
      <div className="section-header">
        <div className="header-left">
          <h2>💰 Gestione Finanziaria</h2>
          <p className="section-subtitle">
            Controllo economico e margini • Periodo: {selectedPeriod === 'month' ? 'Mensile' : selectedPeriod === 'week' ? 'Settimanale' : 'Giornaliero'}
          </p>
        </div>
        <div className="header-controls">
          <div className="period-selector">
            <button 
              className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('day')}
            >
              Giorno
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('week')}
            >
              Settimana
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('month')}
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
          <span className="error-icon">❌</span>
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
                <div className="metric-value">{(financialData.revenue.current / financialData.orders.current).toFixed(2)}</div>
                <div className="metric-label">Revenue per Order</div>
                <div className="metric-change positive">+5.2%</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📅</div>
              <div className="metric-content">
                <div className="metric-value">{(financialData.revenue.current / 30).toFixed(0)}</div>
                <div className="metric-label">Revenue Giornaliera</div>
                <div className="metric-change positive">+12.8%</div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'trends' && (
        <div className="trends-section">
          <div className="trend-chart">
            <h3>📈 Andamento Ricavi (Ultimi 30 giorni)</h3>
            <div className="chart-container">
              <div className="chart-placeholder">
                <div className="chart-bars">
                  {financialData.dailyTrend.slice(-10).map((day, index) => (
                    <div key={index} className="chart-bar">
                      <div 
                        className="bar" 
                        style={{ height: `${(day.revenue / 800) * 100}%` }}
                        title={`${day.date}: ${formatCurrency(day.revenue)}`}
                      ></div>
                      <div className="bar-label">{day.date.split('-')[2]}</div>
                    </div>
                  ))}
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
                  <p>Trend positivo del +15.2% rispetto al mese precedente</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">⚠️</span>
                <div>
                  <strong>Costi in Aumento</strong>
                  <p>I costi sono aumentati dell'8.9%, monitorare gli sprechi</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">✅</span>
                <div>
                  <strong>Margini Stabili</strong>
                  <p>Il margine di profitto si mantiene sopra il 45%</p>
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
                <span className="expense-percentage">51.4%</span>
              </div>
              <div className="expense-item">
                <span className="expense-label">👥 Personale</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.labor)}</span>
                <span className="expense-percentage">25.5%</span>
              </div>
              <div className="expense-item">
                <span className="expense-label">⚡ Utilities</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.utilities)}</span>
                <span className="expense-percentage">10.8%</span>
              </div>
              <div className="expense-item">
                <span className="expense-label">🏠 Affitto</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.rent)}</span>
                <span className="expense-percentage">14.6%</span>
              </div>
              <div className="expense-item">
                <span className="expense-label">📦 Altri</span>
                <span className="expense-amount">{formatCurrency(financialData.expenses.other)}</span>
                <span className="expense-percentage">9.8%</span>
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
      {showDetailsModal && (
        <DetailedReportModal 
          data={detailsData}
          onClose={() => setShowDetailsModal(false)}
          period={selectedPeriod}
          date={selectedDate}
        />
      )}

      {/* Modal Budget Settings */}
      {showBudgetModal && (
        <BudgetSettingsModal 
          onClose={() => setShowBudgetModal(false)}
          onSave={(budgetData) => {
            console.log('Budget salvato:', budgetData);
            setShowBudgetModal(false);
          }}
        />
      )}
    </div>
  );
}

// Modal Report Dettagliato
function DetailedReportModal({ data, onClose, period, date }) {
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
                <span className="report-value">€15,420.00</span>
              </div>
              <div className="report-item">
                <span className="report-label">Costi Totali:</span>
                <span className="report-value">€8,230.50</span>
              </div>
              <div className="report-item">
                <span className="report-label">Utile Netto:</span>
                <span className="report-value">€7,189.50</span>
              </div>
              <div className="report-item">
                <span className="report-label">Margine %:</span>
                <span className="report-value">46.6%</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h4>📈 Performance Metriche</h4>
            <div className="metrics-table">
              <div className="metric-row">
                <span>Ordini processati</span>
                <span>485</span>
                <span className="change positive">+17.7%</span>
              </div>
              <div className="metric-row">
                <span>Valore medio ordine</span>
                <span>€31.80</span>
                <span className="change negative">-2.3%</span>
              </div>
              <div className="metric-row">
                <span>Tasso di conversione</span>
                <span>12.4%</span>
                <span className="change positive">+3.1%</span>
              </div>
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

// Modal Budget Settings
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