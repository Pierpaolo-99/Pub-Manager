import { useState, useEffect } from "react";
import "./ReportsSection.css";

export default function ReportsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [quickStats, setQuickStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const reportTypes = [
    { id: 'sales', name: 'Report Vendite', icon: '💰', description: 'Analisi vendite per periodo' },
    { id: 'products', name: 'Prodotti Top', icon: '🏆', description: 'Prodotti più venduti' },
    { id: 'inventory', name: 'Report Inventario', icon: '📦', description: 'Stato magazzino' },
    { id: 'costs', name: 'Analisi Costi', icon: '📊', description: 'Costi vs ricavi' },
  ];

  useEffect(() => {
    fetchQuickStats();
  }, []);

  // ✅ FIXED: Gestione response corretta
  const fetchQuickStats = async () => {
    try {
      console.log('📊 Fetching quick stats...');
      const response = await fetch('http://localhost:3000/api/reports/quick-stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('✅ Quick stats response:', responseData);
      
      // ✅ FIXED: Accesso corretto alla struttura backend
      if (responseData.success && responseData.data) {
        setQuickStats(responseData.data);
      } else {
        throw new Error(responseData.error || 'Dati non disponibili');
      }
    } catch (err) {
      console.error('❌ Error fetching quick stats:', err);
      setError(`Errore statistiche: ${err.message}`);
      // Fallback data
      setQuickStats({
        revenue_today: 0,
        revenue_change: 0,
        orders_today: 0,
        orders_change: 0,
        avg_order_value: 0,
        top_product: { name: 'N/A', quantity: 0 }
      });
    }
  };

  // ✅ FIXED: Gestione response reports corretta
  const fetchReport = async (reportType) => {
    setLoading(true);
    setActiveReport(reportType);
    setError(null);
    
    try {
      let endpoint = '';
      const params = new URLSearchParams({ period: selectedPeriod });
      
      switch(reportType) {
        case 'sales':
          endpoint = `http://localhost:3000/api/reports/sales?${params}`;
          break;
        case 'products':
          endpoint = `http://localhost:3000/api/reports/products/top?${params}&limit=20`;
          break;
        case 'inventory':
          endpoint = `http://localhost:3000/api/reports/inventory`;
          break;
        case 'costs':
          endpoint = `http://localhost:3000/api/reports/costs?${params}`;
          break;
        default:
          throw new Error('Tipo report non valido');
      }
      
      console.log(`📊 Fetching ${reportType} report:`, endpoint);
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`✅ ${reportType} report response:`, responseData);
      
      // ✅ FIXED: Verifica struttura response
      if (responseData.success) {
        setReportData(responseData);
      } else {
        throw new Error(responseData.error || 'Dati report non disponibili');
      }
      
    } catch (err) {
      console.error(`❌ Error fetching ${reportType} report:`, err);
      setError(`Errore caricamento ${reportType}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    const numValue = parseFloat(value) || 0;
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(1)}%`;
  };

  const exportReport = async (reportType) => {
    // TODO: Implementa esportazione CSV/PDF
    alert(`Esportazione ${reportType} non ancora implementata`);
  };

  return (
    <div className="reports-section">
      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Header */}
      <div className="section-header">
        <div>
          <h2>📈 Report & Analytics</h2>
          <p className="section-subtitle">
            Dashboard di reporting e analisi • Database reale
          </p>
        </div>
        <div className="period-selector">
          <select 
            value={selectedPeriod} 
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              // Auto-refresh quick stats on period change
              fetchQuickStats();
            }}
            className="form-select"
          >
            <option value="day">Oggi</option>
            <option value="week">Questa settimana</option>
            <option value="month">Questo mese</option>
            <option value="year">Quest'anno</option>
          </select>
        </div>
      </div>

      {/* ✅ FIXED: Quick Stats con accesso corretto */}
      <div className="quick-stats">
        <div className="stat-card">
          <h4>💰 Vendite Oggi</h4>
          <div className="stat-value">{formatCurrency(quickStats.revenue_today)}</div>
          <div className={`stat-change ${(quickStats.revenue_change || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(quickStats.revenue_change)}
          </div>
        </div>
        <div className="stat-card">
          <h4>📋 Ordini Completati</h4>
          <div className="stat-value">{quickStats.orders_today || 0}</div>
          <div className={`stat-change ${(quickStats.orders_change || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(quickStats.orders_change)}
          </div>
        </div>
        <div className="stat-card">
          <h4>🏆 Prodotto Top</h4>
          <div className="stat-value">{quickStats.top_product?.name || 'N/A'}</div>
          <div className="stat-change">
            {quickStats.top_product?.quantity || 0} vendite
          </div>
        </div>
        <div className="stat-card">
          <h4>💰 Ordine Medio</h4>
          <div className="stat-value">{formatCurrency(quickStats.avg_order_value)}</div>
          <div className="stat-change">
            Database reale
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="reports-grid">
        {reportTypes.map(report => (
          <div key={report.id} className="report-card">
            <div className="report-icon">{report.icon}</div>
            <div className="report-content">
              <h3>{report.name}</h3>
              <p>{report.description}</p>
            </div>
            <div className="report-actions">
              <button 
                className="btn primary"
                onClick={() => fetchReport(report.id)}
                disabled={loading && activeReport === report.id}
              >
                {loading && activeReport === report.id ? (
                  <>
                    <span className="loading-spinner"></span>
                    Caricando...
                  </>
                ) : (
                  'Visualizza'
                )}
              </button>
              <button 
                className="btn secondary"
                onClick={() => exportReport(report.id)}
                disabled={!reportData || activeReport !== report.id}
              >
                📥 Esporta
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Display */}
      {reportData && (
        <div className="report-display">
          <div className="report-header">
            <h3>
              📊 {reportTypes.find(r => r.id === activeReport)?.name}
              {reportData.period && (
                <small> • {reportData.period}</small>
              )}
              {reportData.date_range && (
                <small> • {reportData.date_range.start} → {reportData.date_range.end}</small>
              )}
            </h3>
            <div className="report-header-actions">
              <button 
                className="btn secondary"
                onClick={() => fetchReport(activeReport)}
                title="Aggiorna report"
              >
                🔄
              </button>
              <button 
                className="btn secondary"
                onClick={() => {
                  setActiveReport(null);
                  setReportData(null);
                }}
              >
                ✕ Chiudi
              </button>
            </div>
          </div>
          
          <div className="report-content">
            {activeReport === 'sales' && <SalesReportDisplay data={reportData} />}
            {activeReport === 'products' && <ProductsReportDisplay data={reportData} />}
            {activeReport === 'inventory' && <InventoryReportDisplay data={reportData} />}
            {activeReport === 'costs' && <CostsReportDisplay data={reportData} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ FIXED: SalesReportDisplay - struttura allineata
function SalesReportDisplay({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  return (
    <div className="sales-report">
      <div className="report-summary">
        <div className="summary-card">
          <h4>📈 Ricavi Totali</h4>
          <div className="value">{formatCurrency(data.summary?.total_revenue)}</div>
        </div>
        <div className="summary-card">
          <h4>📋 Ordini Totali</h4>
          <div className="value">{data.summary?.total_orders || 0}</div>
        </div>
        <div className="summary-card">
          <h4>💰 Valore Medio Ordine</h4>
          <div className="value">{formatCurrency(data.summary?.avg_order_value)}</div>
        </div>
        <div className="summary-card">
          <h4>📅 Ricavi Medi Giornalieri</h4>
          <div className="value">{formatCurrency(data.summary?.avg_daily_revenue)}</div>
        </div>
      </div>

      <div className="sales-chart">
        <h4>📊 Andamento Vendite ({data.group_by || 'giornaliero'})</h4>
        <div className="chart-placeholder">
          <p>Grafico vendite nel tempo (da implementare con Chart.js)</p>
          <small>Dati disponibili per {data.data?.length || 0} periodi</small>
        </div>
      </div>

      <div className="sales-table">
        <table className="report-table">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Ordini</th>
              <th>Ricavi</th>
              <th>Valore Medio</th>
              <th>💰 Contante</th>
              <th>💳 Carta</th>
              <th>🏧 Bancomat</th>
            </tr>
          </thead>
          <tbody>
            {data.data?.map((period, index) => (
              <tr key={index}>
                <td>{period.period}</td>
                <td>{period.orders_count}</td>
                <td>{formatCurrency(period.total_revenue)}</td>
                <td>{formatCurrency(period.avg_order_value)}</td>
                <td>{formatCurrency(period.payment_breakdown?.cash)}</td>
                <td>{formatCurrency(period.payment_breakdown?.card)}</td>
                <td>{formatCurrency(period.payment_breakdown?.debit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ✅ FIXED: ProductsReportDisplay - struttura allineata
function ProductsReportDisplay({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  return (
    <div className="products-report">
      <h4>
        🏆 Prodotti Più Venduti 
        {data.summary && (
          <small> • {data.summary.total_products} prodotti • {formatCurrency(data.summary.total_revenue)} totali</small>
        )}
      </h4>
      
      <div className="products-table">
        <table className="report-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Prodotto</th>
              <th>Categoria</th>
              <th>Quantità</th>
              <th>Ricavi</th>
              <th>% Ricavi</th>
              <th>Ordini</th>
              <th>Prezzo Medio</th>
            </tr>
          </thead>
          <tbody>
            {data.products?.map((product, index) => (
              <tr key={product.product_id}>
                <td>
                  <span className="rank">#{product.rank || index + 1}</span>
                </td>
                <td>
                  <div className="product-info">
                    <div className="product-name">{product.full_name}</div>
                    {product.sku && (
                      <div className="product-sku">SKU: {product.sku}</div>
                    )}
                  </div>
                </td>
                <td>
                  <span 
                    className="category-tag" 
                    style={{ 
                      backgroundColor: product.category_color || '#6B7280',
                      color: 'white'
                    }}
                  >
                    {product.category}
                  </span>
                </td>
                <td>
                  <span className="quantity-sold">{product.total_quantity_sold}</span>
                </td>
                <td>
                  <span className="revenue">{formatCurrency(product.total_revenue)}</span>
                </td>
                <td>
                  <span className="percentage">{product.revenue_percentage.toFixed(1)}%</span>
                </td>
                <td>{product.orders_count}</td>
                <td>{formatCurrency(product.avg_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ✅ FIXED: InventoryReportDisplay - campi corretti
function InventoryReportDisplay({ data }) {
  const getStatusIcon = (status) => {
    const icons = {
      'esaurito': '🔴',
      'critico': '🟡', 
      'scadenza_vicina': '🟠',
      'eccesso': '🔵',
      'ok': '🟢'
    };
    return icons[status] || '⚫';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'esaurito': 'Esaurito',
      'critico': 'Stock Critico',
      'scadenza_vicina': 'Scadenza Vicina',
      'eccesso': 'Eccesso Stock',
      'ok': 'Normale'
    };
    return labels[status] || status;
  };

  return (
    <div className="inventory-report">
      <div className="inventory-stats">
        <div className="stat-item">
          <span>📦 Totale Articoli:</span>
          <strong>{data.stats?.total_items || 0}</strong>
        </div>
        <div className="stat-item">
          <span>🔴 Esauriti:</span>
          <strong>{data.stats?.status_breakdown?.esaurito || 0}</strong>
        </div>
        <div className="stat-item">
          <span>🟡 Critici:</span>
          <strong>{data.stats?.status_breakdown?.critico || 0}</strong>
        </div>
        <div className="stat-item">
          <span>⚠️ Alert Totali:</span>
          <strong>{data.stats?.alerts || 0}</strong>
        </div>
        <div className="stat-item">
          <span>💰 Valore Totale:</span>
          <strong>{formatCurrency(data.stats?.total_inventory_value)}</strong>
        </div>
      </div>

      <div className="inventory-table">
        <table className="report-table">
          <thead>
            <tr>
              <th>Stato</th>
              <th>Prodotto</th>
              <th>Categoria</th>
              <th>Quantità</th>
              <th>Min/Max</th>
              <th>Valore</th>
              <th>Fornitore</th>
              <th>Scadenza</th>
            </tr>
          </thead>
          <tbody>
            {data.inventory?.map((item, index) => (
              <tr key={index} className={item.stock_status}>
                <td>
                  <span className="status-indicator">
                    {getStatusIcon(item.stock_status)} {getStatusLabel(item.stock_status)}
                  </span>
                </td>
                <td>
                  <div className="product-info">
                    <div className="product-name">{item.full_name}</div>
                    {item.sku && (
                      <div className="product-sku">SKU: {item.sku}</div>
                    )}
                  </div>
                </td>
                <td>
                  <span 
                    className="category-tag" 
                    style={{ 
                      backgroundColor: item.category_color || '#6B7280',
                      color: 'white'
                    }}
                  >
                    {item.category}
                  </span>
                </td>
                <td>
                  <span className="quantity">
                    {item.quantity} {item.unit}
                  </span>
                </td>
                <td>
                  <div className="thresholds">
                    <div>Min: {item.min_threshold} {item.unit}</div>
                    {item.max_threshold && (
                      <div>Max: {item.max_threshold} {item.unit}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="value-info">
                    <div className="total-value">{formatCurrency(item.total_value)}</div>
                    <div className="unit-cost">{formatCurrency(item.cost_per_unit)}/{item.unit}</div>
                  </div>
                </td>
                <td>{item.supplier}</td>
                <td>
                  {item.expiry_date ? (
                    <div className="expiry-info">
                      <div className={item.days_to_expiry <= 7 ? 'text-danger' : ''}>
                        {new Date(item.expiry_date).toLocaleDateString('it-IT')}
                      </div>
                      <small>
                        {item.days_to_expiry !== null && (
                          `${item.days_to_expiry} giorni`
                        )}
                      </small>
                    </div>
                  ) : (
                    <span className="no-expiry">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ✅ FIXED: CostsReportDisplay - rimozione funzione duplicata
function CostsReportDisplay({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // ✅ FIXED: Accesso corretto alla struttura backend
  const analysisData = data.data || data;

  return (
    <div className="costs-report">
      <div className="costs-summary">
        <div className="summary-card success">
          <h4>💰 Ricavi</h4>
          <div className="value">{formatCurrency(analysisData.revenue?.total)}</div>
          <div className="detail">{analysisData.revenue?.orders || 0} ordini</div>
        </div>
        <div className="summary-card danger">
          <h4>💸 Costi</h4>
          <div className="value">{formatCurrency(analysisData.costs?.actual)}</div>
          <div className="detail">
            Fonte: {analysisData.costs?.source === 'purchase_orders' ? 'Ordini Acquisto' : 'Stime'}
          </div>
        </div>
        <div className="summary-card info">
          <h4>📊 Profitto</h4>
          <div className="value">{formatCurrency(analysisData.profit?.amount)}</div>
          <div className="detail">
            Margine: {analysisData.profit?.margin_percentage?.toFixed(1) || 0}%
          </div>
        </div>
        <div className="summary-card secondary">
          <h4>📦 Stock</h4>
          <div className="value">{formatCurrency(analysisData.costs?.stock_value)}</div>
          <div className="detail">
            {analysisData.stock_info?.total_items || 0} articoli
          </div>
        </div>
      </div>

      {analysisData.costs?.purchase_orders_count > 0 ? (
        <div className="costs-details">
          <h4>📋 Dettagli Analisi Costi</h4>
          <div className="cost-breakdown">
            <div className="cost-item">
              <span className="cost-label">💰 Ordini di Acquisto:</span>
              <span className="cost-value">
                {analysisData.costs.purchase_orders_count} ordini • {formatCurrency(analysisData.costs.purchase_orders)}
              </span>
            </div>
            <div className="cost-item">
              <span className="cost-label">📈 Movimenti Stock:</span>
              <span className="cost-value">
                {analysisData.costs.movements?.in || 0} entrate • {analysisData.costs.movements?.out || 0} uscite
              </span>
            </div>
            <div className="cost-item">
              <span className="cost-label">💰 Ordine Medio:</span>
              <span className="cost-value">{formatCurrency(analysisData.revenue?.avg_order)}</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">📦 Costo Medio/Unità:</span>
              <span className="cost-value">{formatCurrency(analysisData.stock_info?.avg_cost)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-purchase-data">
          <h4>ℹ️ Informazioni Analisi</h4>
          <p>I costi sono calcolati sui movimenti di stock disponibili.</p>
          <small>Per analisi più accurate, registra ordini di acquisto nel sistema.</small>
        </div>
      )}
    </div>
  );
}