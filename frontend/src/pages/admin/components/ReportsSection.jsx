import { useState, useEffect } from "react";
import "./ReportsSection.css";

export default function ReportsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [quickStats, setQuickStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);

  const reportTypes = [
    { id: 'sales', name: 'Report Vendite', icon: '💰', description: 'Analisi vendite per periodo' },
    { id: 'products', name: 'Prodotti Top', icon: '🏆', description: 'Prodotti più venduti' },
    { id: 'inventory', name: 'Report Inventario', icon: '📦', description: 'Stato magazzino' },
    { id: 'costs', name: 'Analisi Costi', icon: '📊', description: 'Costi vs ricavi' },
  ];

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/reports/quick-stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuickStats(data);
      }
    } catch (err) {
      console.error('❌ Error fetching quick stats:', err);
    }
  };

  const fetchReport = async (reportType) => {
    setLoading(true);
    setActiveReport(reportType);
    
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
      }
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('❌ Error fetching report:', err);
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
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const exportReport = async (reportType) => {
    // TODO: Implementa esportazione CSV/PDF
    alert(`Esportazione ${reportType} non ancora implementata`);
  };

  return (
    <div className="reports-section">
      <div className="section-header">
        <div>
          <h2>📈 Report & Analytics</h2>
          <p className="section-subtitle">Dashboard di reporting e analisi</p>
        </div>
        <div className="period-selector">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="form-select"
          >
            <option value="day">Oggi</option>
            <option value="week">Questa settimana</option>
            <option value="month">Questo mese</option>
            <option value="year">Quest'anno</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <h4>💰 Vendite Oggi</h4>
          <div className="stat-value">{formatCurrency(quickStats.revenue_today)}</div>
          <div className={`stat-change ${quickStats.revenue_change >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(quickStats.revenue_change || 0)}
          </div>
        </div>
        <div className="stat-card">
          <h4>📋 Ordini Completati</h4>
          <div className="stat-value">{quickStats.orders_today || 0}</div>
          <div className={`stat-change ${quickStats.orders_change >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(quickStats.orders_change || 0)}
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
          <h4>📊 Margine Medio</h4>
          <div className="stat-value">{quickStats.margin_percentage || 0}%</div>
          <div className="stat-change">
            Valore medio ordine: {formatCurrency(quickStats.avg_order_value)}
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
                {loading && activeReport === report.id ? 'Caricando...' : 'Visualizza'}
              </button>
              <button 
                className="btn secondary"
                onClick={() => exportReport(report.id)}
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
            <h3>📊 {reportTypes.find(r => r.id === activeReport)?.name}</h3>
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

// Component per visualizzare report vendite
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
        <h4>📊 Andamento Vendite</h4>
        <div className="chart-placeholder">
          {/* TODO: Implementa grafico con Chart.js o Recharts */}
          <p>Grafico vendite nel tempo (da implementare)</p>
        </div>
      </div>

      <div className="sales-table">
        <table className="report-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Ordini</th>
              <th>Ricavi</th>
              <th>Valore Medio</th>
              <th>Contante</th>
              <th>Carta</th>
            </tr>
          </thead>
          <tbody>
            {data.data?.map((day, index) => (
              <tr key={index}>
                <td>{day.period}</td>
                <td>{day.orders_count}</td>
                <td>{formatCurrency(day.total_revenue)}</td>
                <td>{formatCurrency(day.avg_order_value)}</td>
                <td>{formatCurrency(day.cash_revenue)}</td>
                <td>{formatCurrency(day.card_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component per visualizzare prodotti top
function ProductsReportDisplay({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  return (
    <div className="products-report">
      <h4>🏆 Prodotti Più Venduti</h4>
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
            </tr>
          </thead>
          <tbody>
            {data.products?.map((product, index) => (
              <tr key={product.product_id}>
                <td>#{index + 1}</td>
                <td>{product.product_name}</td>
                <td>{product.category_name}</td>
                <td>{product.total_quantity_sold}</td>
                <td>{formatCurrency(product.total_revenue)}</td>
                <td>{product.revenue_percentage.toFixed(1)}%</td>
                <td>{product.orders_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component per visualizzare report inventario
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
      </div>

      <div className="inventory-table">
        <table className="report-table">
          <thead>
            <tr>
              <th>Stato</th>
              <th>Ingrediente</th>
              <th>Disponibile</th>
              <th>Minimo</th>
              <th>Scadenza</th>
              <th>Fornitore</th>
            </tr>
          </thead>
          <tbody>
            {data.inventory?.map((item, index) => (
              <tr key={index} className={item.stock_status}>
                <td>
                  <span className="status-indicator">
                    {getStatusIcon(item.stock_status)} {item.stock_status}
                  </span>
                </td>
                <td>{item.ingredient_name}</td>
                <td>{item.available_quantity} {item.ingredient_unit}</td>
                <td>{item.min_threshold} {item.ingredient_unit}</td>
                <td>
                  {item.expiry_date ? (
                    <span className={item.days_to_expiry <= 7 ? 'text-danger' : ''}>
                      {item.expiry_date} ({item.days_to_expiry}gg)
                    </span>
                  ) : 'N/A'}
                </td>
                <td>{item.supplier || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component per visualizzare analisi costi
function CostsReportDisplay({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  return (
    <div className="costs-report">
      <div className="costs-summary">
        <div className="summary-card success">
          <h4>💰 Ricavi</h4>
          <div className="value">{formatCurrency(data.revenue?.total)}</div>
          <div className="detail">{data.revenue?.transactions || 0} transazioni</div>
        </div>
        <div className="summary-card danger">
          <h4>💸 Costi</h4>
          <div className="value">{formatCurrency(data.costs?.total)}</div>
          <div className="detail">{data.costs?.transactions || 0} ordini</div>
        </div>
        <div className="summary-card info">
          <h4>📊 Profitto</h4>
          <div className="value">{formatCurrency(data.profit)}</div>
          <div className="detail">Margine: {data.margin_percentage?.toFixed(1)}%</div>
        </div>
      </div>

      <div className="costs-by-category">
        <h4>📋 Costi per Categoria</h4>
        <table className="report-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Costo Totale</th>
              <th>Quantità</th>
              <th>Fornitori</th>
            </tr>
          </thead>
          <tbody>
            {data.costs_by_category?.map((category, index) => (
              <tr key={index}>
                <td>{category.category || 'N/A'}</td>
                <td>{formatCurrency(category.total_cost)}</td>
                <td>{category.total_quantity}</td>
                <td>{category.suppliers_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}