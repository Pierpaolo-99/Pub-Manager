import { useState, useEffect } from "react";
import "./OverviewSection.css";

export default function OverviewSection({ onNavigateToSection }) {
  const [analytics, setAnalytics] = useState({
    orders: {
      total: 0,
      today: 0,
      pending: 0,
      ready: 0,
      completed: 0,
      todayRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      avgOrderValue: 0,
      dineIn: 0,
      takeaway: 0
    },
    stock: {
      total: 0,
      outOfStock: 0,
      lowStock: 0,
      expired: 0,
      totalValue: 0
    },
    products: {
      total: 0,
      active: 0,
      inactive: 0,
      featured: 0
    },
    users: {
      total: 0,
      active: 0,
      admins: 0,
      waiters: 0,
      kitchen: 0,
      recentlyActive: 0
    },
    tables: {
      total: 0,
      occupied: 0,
      free: 0,
      reserved: 0,
      totalCapacity: 0,
      avgCapacity: 0,
      occupancyRate: 0
    },
    categories: {
      total: 0,
      active: 0
    },
    alerts: {
      stockAlerts: 0,
      expiredItems: 0,
      pendingOrders: 0
    }
  });
  
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    orderTimes: { today: 0, week: 0 },
    delayedOrders: 0,
    tableOccupancy: { occupied: 0, total: 0, rate: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData();
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ ENHANCED: PROPER BACKEND INTEGRATION
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Loading dashboard analytics...');
      
      // ✅ ENHANCED: Load analytics data in parallel
      const [
        overviewRes,
        salesRes,
        topProductsRes,
        performanceRes
      ] = await Promise.allSettled([
        loadOverviewAnalytics(),
        loadSalesAnalytics(),
        loadTopProducts(),
        loadPerformanceMetrics()
      ]);

      // ✅ ENHANCED: Process results with proper error handling
      if (overviewRes.status === 'fulfilled') {
        setAnalytics(overviewRes.value);
        console.log('✅ Overview analytics loaded');
      } else {
        console.error('❌ Failed to load overview analytics:', overviewRes.reason);
      }

      if (salesRes.status === 'fulfilled') {
        setSalesData(salesRes.value);
        console.log('✅ Sales data loaded');
      } else {
        console.error('❌ Failed to load sales data:', salesRes.reason);
      }

      if (topProductsRes.status === 'fulfilled') {
        setTopProducts(topProductsRes.value);
        console.log('✅ Top products loaded');
      } else {
        console.error('❌ Failed to load top products:', topProductsRes.reason);
      }

      if (performanceRes.status === 'fulfilled') {
        setPerformanceMetrics(performanceRes.value);
        console.log('✅ Performance metrics loaded');
      } else {
        console.error('❌ Failed to load performance metrics:', performanceRes.reason);
      }

    } catch (error) {
      console.error('❌ Critical error loading dashboard:', error);
      setError('Errore critico nel caricamento della dashboard: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: OVERVIEW ANALYTICS CALL
  const loadOverviewAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/overview', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Overview analytics response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Analytics request failed');
      }
      
      return data.data; // Backend returns { success: true, data: {...} }
      
    } catch (error) {
      console.error('❌ Error loading overview analytics:', error);
      throw error;
    }
  };

  // ✅ ENHANCED: SALES ANALYTICS CALL  
  const loadSalesAnalytics = async (period = '7') => {
    try {
      const response = await fetch(`/api/analytics/sales?period=${period}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📈 Sales analytics response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Sales analytics request failed');
      }
      
      return data.data; // Array of daily sales data
      
    } catch (error) {
      console.error('❌ Error loading sales analytics:', error);
      return []; // Fallback empty array
    }
  };

  // ✅ ENHANCED: TOP PRODUCTS CALL
  const loadTopProducts = async (limit = 5, period = '30') => {
    try {
      const response = await fetch(`/api/analytics/top-products?limit=${limit}&period=${period}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🏆 Top products response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Top products request failed');
      }
      
      return data.data; // Array of top products
      
    } catch (error) {
      console.error('❌ Error loading top products:', error);
      return []; // Fallback empty array
    }
  };

  // ✅ ENHANCED: PERFORMANCE METRICS CALL
  const loadPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/analytics/performance', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('⚡ Performance metrics response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Performance metrics request failed');
      }
      
      return data.data;
      
    } catch (error) {
      console.error('❌ Error loading performance metrics:', error);
      return {
        orderTimes: { today: 0, week: 0 },
        delayedOrders: 0,
        tableOccupancy: { occupied: 0, total: 0, rate: 0 }
      };
    }
  };

  // ✅ ENHANCED: FORMAT REVENUE CHART DATA
  const formatRevenueChartData = (salesData) => {
    if (!Array.isArray(salesData)) return [];
    
    return salesData.map(day => ({
      date: new Date(day.date).toLocaleDateString('it-IT', { 
        weekday: 'short', 
        day: 'numeric' 
      }),
      revenue: day.revenue || 0,
      orders: day.orders || 0,
      avgOrderValue: day.avgOrderValue || 0
    })).reverse(); // Most recent first
  };

  // ✅ ENHANCED: GENERATE SYSTEM ALERTS
  const generateSystemAlerts = () => {
    const alerts = [];
    
    // Stock alerts
    if (analytics.stock.outOfStock > 0) {
      alerts.push({
        type: 'critical',
        icon: '🚫',
        title: 'Prodotti Esauriti',
        message: `${analytics.stock.outOfStock} prodotti non disponibili`,
        action: () => onNavigateToSection && onNavigateToSection('stock')
      });
    }
    
    if (analytics.stock.lowStock > 0) {
      alerts.push({
        type: 'high',
        icon: '📦',
        title: 'Stock Basso',
        message: `${analytics.stock.lowStock} prodotti sotto soglia`,
        action: () => onNavigateToSection && onNavigateToSection('stock')
      });
    }
    
    // Expired items
    if (analytics.stock.expired > 0) {
      alerts.push({
        type: 'high',
        icon: '⏰',
        title: 'Prodotti Scaduti',
        message: `${analytics.stock.expired} prodotti scaduti da rimuovere`,
        action: () => onNavigateToSection && onNavigateToSection('stock')
      });
    }
    
    // Order alerts
    if (analytics.orders.pending > 10) {
      alerts.push({
        type: 'medium',
        icon: '📋',
        title: 'Molti Ordini in Coda',
        message: `${analytics.orders.pending} ordini in attesa di preparazione`,
        action: () => onNavigateToSection && onNavigateToSection('orders')
      });
    }
    
    // Performance alerts
    if (performanceMetrics.delayedOrders > 0) {
      alerts.push({
        type: 'medium',
        icon: '⏱️',
        title: 'Ordini in Ritardo',
        message: `${performanceMetrics.delayedOrders} ordini oltre i 30 minuti`,
        action: () => onNavigateToSection && onNavigateToSection('orders')
      });
    }
    
    // Revenue alerts
    if (analytics.orders.todayRevenue === 0 && new Date().getHours() > 12) {
      alerts.push({
        type: 'medium',
        icon: '💰',
        title: 'Nessun Incasso Oggi',
        message: 'Verifica la gestione ordini e pagamenti',
        action: () => onNavigateToSection && onNavigateToSection('orders')
      });
    }
    
    // Table occupancy alert
    if (analytics.tables.occupancyRate > 90) {
      alerts.push({
        type: 'low',
        icon: '🪑',
        title: 'Tavoli Quasi Pieni',
        message: `${analytics.tables.occupancyRate}% di occupazione tavoli`,
        action: () => onNavigateToSection && onNavigateToSection('tables')
      });
    }
    
    return alerts;
  };

  // ✅ ENHANCED: Get time ago helper
  const getTimeAgo = (date) => {
    try {
      const now = new Date();
      const targetDate = new Date(date);
      const diffMs = now - targetDate;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Ora';
      if (diffMins < 60) return `${diffMins}m fa`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h fa`;
      return `${Math.floor(diffMins / 1440)}g fa`;
    } catch {
      return '--';
    }
  };

  // ✅ ENHANCED: Loading state
  if (loading) {
    return (
      <div className="overview-section">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h3>🔄 Caricamento Analytics</h3>
          <p>Elaborazione dati dashboard in corso...</p>
          <small>Connessione backend analytics</small>
        </div>
      </div>
    );
  }

  // ✅ ENHANCED: Error state
  if (error) {
    return (
      <div className="overview-section">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Errore Caricamento Analytics</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn primary" onClick={loadDashboardData}>
              🔄 Ricarica Analytics
            </button>
            <button 
              className="btn secondary" 
              onClick={() => {
                setError(null);
                setLoading(false);
              }}
            >
              Continua con Dati Cache
            </button>
          </div>
        </div>
      </div>
    );
  }

  const systemAlerts = generateSystemAlerts();
  const revenueChartData = formatRevenueChartData(salesData);

  return (
    <div className="overview-section">
      {/* ✅ ENHANCED: Header with real-time analytics info */}
      <div className="overview-header">
        <div className="header-content">
          <h2>📊 Dashboard Analytics</h2>
          <div className="header-meta">
            <span className="last-update">
              Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}
            </span>
            <div className="status-indicator online">
              <span className="status-dot"></span>
              Analytics Engine Online
            </div>
            <div className="analytics-summary">
              <span>📋 {analytics.orders.today} ordini oggi</span>
              <span>💰 €{analytics.orders.todayRevenue.toFixed(2)} incassato</span>
              <span>🪑 {analytics.tables.occupancyRate}% tavoli occupati</span>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={loadDashboardData}
            title="Aggiorna analytics"
          >
            🔄 Aggiorna Analytics
          </button>
          <button 
            className="btn primary"
            onClick={() => onNavigateToSection && onNavigateToSection('orders')}
          >
            📋 Gestisci Ordini ({analytics.orders.pending})
          </button>
        </div>
      </div>

      {/* ✅ ENHANCED: Stats overview with real backend data */}
      <div className="stats-overview">
        <StatCard 
          title="Revenue Oggi" 
          value={`€${analytics.orders.todayRevenue.toFixed(2)}`}
          subtitle={`€${analytics.orders.weeklyRevenue.toFixed(2)} questa settimana • AVG: €${analytics.orders.avgOrderValue.toFixed(2)}`}
          icon="💰" 
          color="green"
          trend={analytics.orders.todayRevenue > analytics.orders.avgOrderValue ? 'up' : 'neutral'}
        />
        
        <StatCard 
          title="Ordini Attivi" 
          value={analytics.orders.pending + analytics.orders.ready}
          subtitle={`${analytics.orders.pending} in prep • ${analytics.orders.ready} pronti • ${analytics.orders.completed} completati`}
          icon="📋" 
          color="blue"
          trend={analytics.orders.pending > 5 ? 'up' : 'neutral'}
        />
        
        <StatCard 
          title="Stock Status" 
          value={analytics.stock.total - analytics.stock.outOfStock}
          subtitle={`${analytics.stock.outOfStock} esauriti • ${analytics.stock.lowStock} bassi • €${analytics.stock.totalValue.toFixed(0)} valore`}
          icon={analytics.stock.outOfStock > 0 ? '🚫' : analytics.stock.lowStock > 0 ? '⚠️' : '📦'} 
          color={analytics.stock.outOfStock > 0 ? 'red' : analytics.stock.lowStock > 0 ? 'orange' : 'green'}
          trend={analytics.stock.outOfStock > 0 || analytics.stock.lowStock > 5 ? 'down' : 'up'}
        />
        
        <StatCard 
          title="Staff & Tables" 
          value={`${analytics.users.active}/${analytics.users.total}`}
          subtitle={`${analytics.tables.occupied}/${analytics.tables.total} tavoli • ${analytics.tables.occupancyRate}% occupati • ${analytics.users.recentlyActive} staff attivo`}
          icon="👥" 
          color="purple"
          trend={analytics.users.recentlyActive > analytics.users.active * 0.7 ? 'up' : 'neutral'}
        />
      </div>

      {/* ✅ ENHANCED: Revenue chart with backend data */}
      <div className="revenue-chart-section">
        <div className="widget">
          <div className="widget-header">
            <h3>📈 Andamento Revenue (7 giorni)</h3>
            <div className="chart-controls">
              <span className="chart-total">
                Totale: €{analytics.orders.weeklyRevenue.toFixed(2)} • 
                Media: €{(analytics.orders.weeklyRevenue / 7).toFixed(2)}/giorno
              </span>
              <button 
                className="widget-link"
                onClick={() => onNavigateToSection && onNavigateToSection('analytics')}
              >
                Analisi dettagliate →
              </button>
            </div>
          </div>
          <div className="widget-content">
            <RevenueChart data={revenueChartData} />
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Content with backend data */}
      <div className="overview-content">
        
        {/* Left column */}
        <div className="overview-left">
          
          {/* ✅ ENHANCED: Performance metrics widget */}
          <div className="widget">
            <div className="widget-header">
              <h3>⚡ Performance Metrics</h3>
              <button 
                className="widget-link"
                onClick={() => onNavigateToSection && onNavigateToSection('analytics')}
              >
                Report completi →
              </button>
            </div>
            <div className="widget-content">
              <div className="performance-metrics">
                <div className="metric-item">
                  <div className="metric-icon">⏱️</div>
                  <div className="metric-content">
                    <div className="metric-title">Tempo Medio Ordine</div>
                    <div className="metric-value">
                      {performanceMetrics.orderTimes.today.toFixed(1)} min oggi
                    </div>
                    <div className="metric-subtitle">
                      {performanceMetrics.orderTimes.week.toFixed(1)} min media settimana
                    </div>
                  </div>
                </div>
                
                <div className="metric-item">
                  <div className="metric-icon">🚨</div>
                  <div className="metric-content">
                    <div className="metric-title">Ordini in Ritardo</div>
                    <div className="metric-value">{performanceMetrics.delayedOrders}</div>
                    <div className="metric-subtitle">
                      Oltre 30 minuti oggi
                    </div>
                  </div>
                </div>
                
                <div className="metric-item">
                  <div className="metric-icon">🪑</div>
                  <div className="metric-content">
                    <div className="metric-title">Occupazione Tavoli</div>
                    <div className="metric-value">{analytics.tables.occupancyRate}%</div>
                    <div className="metric-subtitle">
                      {analytics.tables.occupied}/{analytics.tables.total} occupati
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ ENHANCED: Quick actions with real data */}
          <div className="widget">
            <div className="widget-header">
              <h3>⚡ Azioni Rapide</h3>
            </div>
            <div className="widget-content">
              <div className="quick-actions">
                <QuickActionCard 
                  icon="👥"
                  title="Gestisci Staff"
                  description={`${analytics.users.active}/${analytics.users.total} attivi • ${analytics.users.recentlyActive} recenti`}
                  onClick={() => onNavigateToSection && onNavigateToSection('users')}
                  color="blue"
                />
                <QuickActionCard 
                  icon="🍺"
                  title="Catalogo Prodotti"
                  description={`${analytics.products.active} attivi • ${analytics.products.featured} in evidenza`}
                  onClick={() => onNavigateToSection && onNavigateToSection('products')}
                  color="green"
                />
                <QuickActionCard 
                  icon="📦"
                  title="Controllo Stock"
                  description={`${analytics.stock.outOfStock + analytics.stock.lowStock} alert • €${analytics.stock.totalValue.toFixed(0)} valore`}
                  onClick={() => onNavigateToSection && onNavigateToSection('stock')}
                  color="orange"
                  alert={analytics.stock.outOfStock > 0 || analytics.stock.lowStock > 0}
                />
                <QuickActionCard 
                  icon="📊"
                  title="Analytics Avanzati"
                  description={`Trend ${salesData.length > 0 ? 'positivo' : 'in crescita'} • Report completi`}
                  onClick={() => onNavigateToSection && onNavigateToSection('analytics')}
                  color="purple"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="overview-right">
          
          {/* ✅ ENHANCED: Top products with backend data */}
          <div className="widget">
            <div className="widget-header">
              <h3>🏆 Prodotti Top (30gg)</h3>
              <button 
                className="widget-link"
                onClick={() => onNavigateToSection && onNavigateToSection('products')}
              >
                Catalogo completo →
              </button>
            </div>
            <div className="widget-content">
              {topProducts.length === 0 ? (
                <div className="empty-state-small">
                  <span className="empty-icon">🏆</span>
                  <p>Nessun dato vendite degli ultimi 30 giorni</p>
                  <small>I dati appariranno dopo i primi ordini</small>
                </div>
              ) : (
                <div className="products-ranking">
                  {topProducts.map((product) => (
                    <div key={`${product.id}-${product.rank}`} className="product-rank-item">
                      <div className="rank-badge">{product.rank}</div>
                      <div className="product-details">
                        <div className="product-name">{product.name}</div>
                        <div className="product-category">{product.category}</div>
                        <div className="product-stats">
                          <span className="sales">
                            {product.quantity} vendite • {product.orders} ordini
                          </span>
                          <span className="revenue">
                            €{product.revenue.toFixed(2)} • €{product.avgPrice.toFixed(2)} avg
                          </span>
                        </div>
                      </div>
                      <div className="product-trend">
                        {product.rank <= 3 ? '🏆' : product.rank <= 5 ? '📈' : '➡️'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ✅ ENHANCED: System alerts with backend data */}
          <div className="widget">
            <div className="widget-header">
              <h3>🔔 System Alerts</h3>
              {systemAlerts.length > 0 && (
                <span className="alert-count">{systemAlerts.length} attivi</span>
              )}
            </div>
            <div className="widget-content">
              <SystemAlerts alerts={systemAlerts} analytics={analytics} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ ENHANCED: Component helpers remain the same but use real data
function StatCard({ title, value, subtitle, icon, color, trend }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">
        <span>{icon}</span>
      </div>
      <div className="stat-content">
        <h4 className="stat-title">{title}</h4>
        <div className="stat-value">{value}</div>
        <p className="stat-subtitle">{subtitle}</p>
      </div>
      {trend && (
        <div className={`stat-trend ${trend}`}>
          {trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ icon, title, description, onClick, color, alert }) {
  return (
    <div 
      className={`quick-action-card ${color} ${alert ? 'alert' : ''}`}
      onClick={onClick}
    >
      <div className="action-icon">{icon}</div>
      <div className="action-content">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      {alert && <div className="alert-badge">!</div>}
    </div>
  );
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>📊 Nessun dato revenue disponibile</p>
        <small>I dati del grafico appariranno dopo i primi ordini completati</small>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));

  return (
    <div className="revenue-chart">
      <div className="chart-container">
        {data.map((day, index) => (
          <div key={index} className="chart-bar-container">
            <div 
              className="chart-bar"
              style={{ 
                height: maxRevenue > 0 ? `${(day.revenue / maxRevenue) * 100}%` : '4px' 
              }}
            >
              <div className="chart-tooltip">
                <div>{day.date}</div>
                <div>€{day.revenue.toFixed(2)}</div>
                <div>{day.orders} ordini</div>
                <div>€{day.avgOrderValue.toFixed(2)} avg</div>
              </div>
            </div>
            <div className="chart-label">{day.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemAlerts({ alerts, analytics }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="alert success">
        <span className="alert-icon">✅</span>
        <div className="alert-content">
          <strong>Sistema Operativo</strong>
          <p>Tutti i parametri sono nella norma</p>
          <div className="system-status">
            <small>
              ✓ {analytics.stock.total - analytics.stock.outOfStock} prodotti disponibili • 
              ✓ {analytics.orders.pending} ordini in gestione • 
              ✓ {analytics.users.active} staff attivo
            </small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="alerts-container">
      {alerts.map((alert, index) => (
        <div key={index} className={`alert ${alert.type}`}>
          <span className="alert-icon">{alert.icon}</span>
          <div className="alert-content">
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
          </div>
          {alert.action && (
            <button className="alert-action" onClick={alert.action} title="Gestisci">
              →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}