import { useState, useEffect } from "react";
import "./OverviewSection.css";

export default function OverviewSection({ onNavigateToSection }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    lowStock: 0,
    todayRevenue: 0,
    activeUsers: 0,
    weeklyRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
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

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Carica dati in parallelo con gestione errori migliorata
      const [
        usersRes,
        productsRes, 
        ordersRes,
        stockRes,
        analyticsRes
      ] = await Promise.allSettled([
        fetch('http://localhost:3000/api/users', { credentials: 'include' }),
        fetch('http://localhost:3000/api/products', { credentials: 'include' }),
        fetch('http://localhost:3000/api/orders', { credentials: 'include' }),
        fetch('http://localhost:3000/api/stock', { credentials: 'include' }),
        fetch('http://localhost:3000/api/analytics/overview', { credentials: 'include' })
      ]);

      // Processa dati con fallback
      const users = await processResponse(usersRes, []);
      const products = await processResponse(productsRes, []);
      const orders = await processResponse(ordersRes, []);
      const stock = await processResponse(stockRes, []);
      const analytics = await processResponse(analyticsRes, {});

      // Calcola statistiche avanzate
      const calculatedStats = calculateStats(users, products, orders, stock, analytics);
      setStats(calculatedStats);

      // Processa ordini recenti con più dettagli
      const processedOrders = processRecentOrders(orders);
      setRecentOrders(processedOrders);

      // Top prodotti con dati reali
      const topProductsData = await calculateTopProducts(products, orders);
      setTopProducts(topProductsData);

      // Dati per grafico revenue
      const chartData = generateRevenueChart(orders);
      setRevenueChart(chartData);

      // Alert stock con dettagli
      const alerts = generateStockAlerts(stock, products);
      setStockAlerts(alerts);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Errore nel caricamento dei dati della dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Funzioni helper migliorate
  const processResponse = async (response, fallback) => {
    if (response.status === 'fulfilled' && response.value.ok) {
      try {
        return await response.value.json();
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  const calculateStats = (users, products, orders, stock, analytics) => {
    const today = new Date();
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayOrders = orders.filter(order => 
      new Date(order.created_at).toDateString() === today.toDateString()
    );
    
    const weeklyOrders = orders.filter(order => 
      new Date(order.created_at) >= weekStart
    );

    const pendingOrders = orders.filter(order => 
      ['pending', 'preparing'].includes(order.status)
    ).length;

    const completedOrders = orders.filter(order => 
      order.status === 'completed'
    ).length;

    return {
      totalUsers: users.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      lowStock: stock.filter(item => item.quantity < item.min_quantity || item.quantity < 10).length,
      todayRevenue: todayOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
      weeklyRevenue: weeklyOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
      activeUsers: users.filter(user => user.active && isRecentlyActive(user.last_login)).length,
      pendingOrders,
      completedOrders
    };
  };

  const isRecentlyActive = (lastLogin) => {
    if (!lastLogin) return false;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(lastLogin) > sevenDaysAgo;
  };

  const processRecentOrders = (orders) => {
    return orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(order => ({
        ...order,
        timeAgo: getTimeAgo(order.created_at),
        statusColor: getStatusColor(order.status)
      }));
  };

  const calculateTopProducts = async (products, orders) => {
    // Raggruppa ordini per prodotto
    const productSales = {};
    
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = {
              quantity: 0,
              revenue: 0
            };
          }
          productSales[item.product_id].quantity += item.quantity;
          productSales[item.product_id].revenue += item.quantity * item.price;
        });
      }
    });

    return products
      .map(product => ({
        ...product,
        sold: productSales[product.id]?.quantity || 0,
        revenue: productSales[product.id]?.revenue || 0
      }))
      .filter(product => product.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  };

  const generateRevenueChart = (orders) => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayOrders = orders.filter(order => 
        new Date(order.created_at).toDateString() === date.toDateString()
      );
      
      const revenue = dayOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      
      last7Days.push({
        date: date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
        revenue: revenue,
        orders: dayOrders.length
      });
    }
    return last7Days;
  };

  const generateStockAlerts = (stock, products) => {
    return stock
      .filter(item => item.quantity < (item.min_quantity || 10))
      .map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          ...item,
          productName: product?.name || 'Prodotto sconosciuto',
          severity: item.quantity === 0 ? 'critical' : item.quantity < 5 ? 'high' : 'medium'
        };
      })
      .sort((a, b) => a.quantity - b.quantity);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffMs = now - orderDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h fa`;
    return `${Math.floor(diffMins / 1440)}g fa`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'orange',
      'preparing': 'blue', 
      'ready': 'green',
      'served': 'purple',
      'completed': 'green',
      'cancelled': 'red'
    };
    return colors[status] || 'gray';
  };

  const getOrderStatusLabel = (status) => {
    const labels = {
      'pending': 'In Attesa',
      'preparing': 'In Preparazione',
      'ready': 'Pronto',
      'served': 'Servito',
      'completed': 'Completato',
      'cancelled': 'Annullato'
    };
    return labels[status] || status;
  };

  // Loading state migliorato
  if (loading) {
    return (
      <div className="overview-section">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h3>Caricamento Dashboard</h3>
          <p>Raccolta dati in corso...</p>
        </div>
      </div>
    );
  }

  // Error state migliorato
  if (error) {
    return (
      <div className="overview-section">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Errore nel caricamento</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn primary" onClick={loadDashboardData}>
              🔄 Riprova
            </button>
            <button className="btn secondary" onClick={() => setError(null)}>
              Continua offline
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overview-section">
      {/* Header migliorato */}
      <div className="overview-header">
        <div className="header-content">
          <h2>📊 Dashboard Overview</h2>
          <div className="header-meta">
            <span className="last-update">
              Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}
            </span>
            <div className="status-indicator online">
              <span className="status-dot"></span>
              Sistema Online
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn secondary refresh-btn"
            onClick={loadDashboardData}
            title="Aggiorna dati"
          >
            🔄 Aggiorna
          </button>
          <button 
            className="btn primary"
            onClick={() => onNavigateToSection && onNavigateToSection('orders')}
          >
            📋 Nuovi Ordini
          </button>
        </div>
      </div>

      {/* Statistiche principali con trend */}
      <div className="stats-overview">
        <StatCard 
          title="Revenue Oggi" 
          value={`€${stats.todayRevenue.toFixed(2)}`}
          subtitle={`€${stats.weeklyRevenue.toFixed(2)} questa settimana`}
          icon="💰" 
          color="green"
          trend={stats.todayRevenue > 0 ? 'up' : 'neutral'}
        />
        <StatCard 
          title="Ordini Attivi" 
          value={stats.pendingOrders}
          subtitle={`${stats.completedOrders} completati oggi`}
          icon="📋" 
          color="blue"
          trend={stats.pendingOrders > 5 ? 'up' : 'neutral'}
        />
        <StatCard 
          title="Stock Critico" 
          value={stats.lowStock}
          subtitle={`${stats.totalProducts} prodotti totali`}
          icon="⚠️" 
          color="red"
          trend={stats.lowStock > 0 ? 'down' : 'up'}
        />
        <StatCard 
          title="Utenti Attivi" 
          value={stats.activeUsers}
          subtitle={`${stats.totalUsers} utenti totali`}
          icon="👥" 
          color="purple"
          trend="neutral"
        />
      </div>

      {/* Revenue Chart */}
      <div className="revenue-chart-section">
        <div className="widget">
          <div className="widget-header">
            <h3>📈 Andamento Revenue (7 giorni)</h3>
            <div className="chart-controls">
              <span className="chart-total">
                Totale: €{stats.weeklyRevenue.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="widget-content">
            <RevenueChart data={revenueChart} />
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="overview-content">
        
        {/* Colonna sinistra */}
        <div className="overview-left">
          
          {/* Ordini recenti migliorati */}
          <div className="widget">
            <div className="widget-header">
              <h3>📋 Ordini Recenti</h3>
              <button 
                className="widget-link"
                onClick={() => onNavigateToSection && onNavigateToSection('orders')}
              >
                Vedi tutti →
              </button>
            </div>
            <div className="widget-content">
              {recentOrders.length === 0 ? (
                <div className="empty-state-small">
                  <span className="empty-icon">📋</span>
                  <p>Nessun ordine recente</p>
                </div>
              ) : (
                <div className="orders-list">
                  {recentOrders.map(order => (
                    <div key={order.id} className="order-item">
                      <div className="order-main">
                        <div className="order-info">
                          <span className="order-id">#{order.id}</span>
                          <span className="order-table">
                            {order.table_number ? `Tavolo ${order.table_number}` : 'Asporto'}
                          </span>
                        </div>
                        <span className="order-time">{order.timeAgo}</span>
                      </div>
                      <div className="order-footer">
                        <span className="order-total">€{parseFloat(order.total || 0).toFixed(2)}</span>
                        <span className={`order-status ${order.statusColor}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Azioni rapide migliorate */}
          <div className="widget">
            <div className="widget-header">
              <h3>⚡ Azioni Rapide</h3>
            </div>
            <div className="widget-content">
              <div className="quick-actions">
                <QuickActionCard 
                  icon="👥"
                  title="Gestisci Utenti"
                  description={`${stats.totalUsers} utenti registrati`}
                  onClick={() => onNavigateToSection && onNavigateToSection('users')}
                  color="blue"
                />
                <QuickActionCard 
                  icon="🍺"
                  title="Catalogo Prodotti"
                  description={`${stats.totalProducts} prodotti`}
                  onClick={() => onNavigateToSection && onNavigateToSection('products')}
                  color="green"
                />
                <QuickActionCard 
                  icon="📦"
                  title="Controllo Stock"
                  description={`${stats.lowStock} alert attivi`}
                  onClick={() => onNavigateToSection && onNavigateToSection('stock')}
                  color="orange"
                  alert={stats.lowStock > 0}
                />
                <QuickActionCard 
                  icon="💰"
                  title="Report Finanziari"
                  description="Analisi e trend"
                  onClick={() => onNavigateToSection && onNavigateToSection('financial')}
                  color="purple"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Colonna destra */}
        <div className="overview-right">
          
          {/* Top prodotti migliorato */}
          <div className="widget">
            <div className="widget-header">
              <h3>🏆 Prodotti Più Venduti</h3>
              <button 
                className="widget-link"
                onClick={() => onNavigateToSection && onNavigateToSection('products')}
              >
                Vedi tutti →
              </button>
            </div>
            <div className="widget-content">
              {topProducts.length === 0 ? (
                <div className="empty-state-small">
                  <span className="empty-icon">🏆</span>
                  <p>Nessun dato vendite</p>
                </div>
              ) : (
                <div className="products-ranking">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="product-rank-item">
                      <div className="rank-badge">{index + 1}</div>
                      <div className="product-details">
                        <div className="product-name">{product.name}</div>
                        <div className="product-stats">
                          <span className="sales">{product.sold} vendite</span>
                          <span className="revenue">€{product.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="product-trend">
                        {index < 2 ? '📈' : index < 4 ? '➡️' : '📉'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alert sistema avanzati */}
          <div className="widget">
            <div className="widget-header">
              <h3>🔔 System Alerts</h3>
            </div>
            <div className="widget-content">
              <SystemAlerts 
                stockAlerts={stockAlerts}
                stats={stats}
                onNavigateToSection={onNavigateToSection}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componenti helper migliorati
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
    <button 
      className={`quick-action-card ${color} ${alert ? 'alert' : ''}`}
      onClick={onClick}
    >
      <div className="action-icon">{icon}</div>
      <div className="action-content">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      {alert && <div className="alert-badge">!</div>}
    </button>
  );
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>Nessun dato disponibile</p>
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
                height: maxRevenue > 0 ? `${(day.revenue / maxRevenue) * 100}%` : '0%' 
              }}
              title={`${day.date}: €${day.revenue.toFixed(2)} (${day.orders} ordini)`}
            ></div>
            <div className="chart-label">{day.date}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span>Revenue giornaliero ultimi 7 giorni</span>
      </div>
    </div>
  );
}

function SystemAlerts({ stockAlerts, stats, onNavigateToSection }) {
  const alerts = [];

  // Stock alerts
  if (stockAlerts.length > 0) {
    alerts.push({
      type: 'stock',
      severity: 'high',
      icon: '📦',
      title: 'Stock Critico',
      message: `${stockAlerts.length} prodotti sotto soglia`,
      action: () => onNavigateToSection && onNavigateToSection('stock')
    });
  }

  // Orders alerts
  if (stats.pendingOrders > 10) {
    alerts.push({
      type: 'orders',
      severity: 'medium',
      icon: '📋',
      title: 'Molti Ordini in Coda',
      message: `${stats.pendingOrders} ordini in attesa`,
      action: () => onNavigateToSection && onNavigateToSection('orders')
    });
  }

  // Revenue alerts
  if (stats.todayRevenue === 0 && new Date().getHours() > 12) {
    alerts.push({
      type: 'revenue',
      severity: 'medium',
      icon: '💰',
      title: 'Nessun Incasso Oggi',
      message: 'Controlla gli ordini in corso',
      action: () => onNavigateToSection && onNavigateToSection('financial')
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="alert success">
        <span className="alert-icon">✅</span>
        <div className="alert-content">
          <strong>Sistema OK</strong>
          <p>Tutti i parametri sono nella norma</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alerts-container">
      {alerts.map((alert, index) => (
        <div key={index} className={`alert ${alert.severity}`}>
          <span className="alert-icon">{alert.icon}</span>
          <div className="alert-content">
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
          </div>
          {alert.action && (
            <button className="alert-action" onClick={alert.action}>
              →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}