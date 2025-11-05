import { useState, useEffect } from "react";
import StatCard from "./StatCard";

export default function OverviewSection() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    lowStock: 0,
    todayRevenue: 0,
    activeUsers: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
    // Aggiorna ogni 30 secondi
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Carica tutte le statistiche in parallelo
      const responses = await Promise.allSettled([
        fetch('http://localhost:3000/api/users', { credentials: 'include' }),
        fetch('http://localhost:3000/api/products', { credentials: 'include' }),
        fetch('http://localhost:3000/api/orders', { credentials: 'include' }),
        fetch('http://localhost:3000/api/stock', { credentials: 'include' })
      ]);

      // Gestisci le risposte
      const [usersRes, productsRes, ordersRes, stockRes] = responses;

      let users = [], products = [], orders = [], stock = [];

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        users = await usersRes.value.json();
      }
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        products = await productsRes.value.json();
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        orders = await ordersRes.value.json();
      }
      if (stockRes.status === 'fulfilled' && stockRes.value.ok) {
        stock = await stockRes.value.json();
      }

      // Calcola statistiche avanzate
      const today = new Date().toDateString();
      const todayOrders = orders.filter(order => 
        new Date(order.created_at).toDateString() === today
      );
      
      const todayRevenue = todayOrders.reduce((sum, order) => 
        sum + (parseFloat(order.total) || 0), 0
      );

      const activeUsers = users.filter(user => 
        user.active && user.last_login && 
        new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      // Aggiorna statistiche
      setStats({
        totalUsers: users.length || 0,
        totalProducts: products.length || 0,
        totalOrders: orders.length || 0,
        lowStock: stock.filter(item => item.quantity < 10).length || 0,
        todayRevenue: todayRevenue,
        activeUsers: activeUsers
      });

      // Ordini recenti (ultimi 5)
      const sortedOrders = orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setRecentOrders(sortedOrders);

      // Prodotti più venduti (simulazione - dovrai implementare nel backend)
      const productSales = products.map(product => ({
        ...product,
        sold: Math.floor(Math.random() * 50) // Temporaneo - sostituisci con dati reali
      })).sort((a, b) => b.sold - a.sold).slice(0, 5);
      
      setTopProducts(productSales);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Caricamento dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <h3>Errore nel caricamento</h3>
        <p>{error}</p>
        <button className="btn primary" onClick={loadDashboardData}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="overview-section">
      {/* Header con data/ora */}
      <div className="overview-header">
        <div>
          <h2>📊 Panoramica Dashboard</h2>
          <p className="dashboard-subtitle">
            Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT')}
          </p>
        </div>
        <button 
          className="btn secondary refresh-btn"
          onClick={loadDashboardData}
          title="Aggiorna dati"
        >
          🔄 Aggiorna
        </button>
      </div>
      
      {/* Statistiche principali */}
      <div className="stats-grid">
        <StatCard 
          title="Utenti Totali" 
          value={stats.totalUsers} 
          icon="👥" 
          color="blue"
          subtitle={`${stats.activeUsers} attivi questa settimana`}
        />
        <StatCard 
          title="Prodotti" 
          value={stats.totalProducts} 
          icon="🍺" 
          color="green"
          subtitle="Nel catalogo"
        />
        <StatCard 
          title="Ordini Totali" 
          value={stats.totalOrders} 
          icon="📋" 
          color="orange"
          subtitle="Dall'apertura"
        />
        <StatCard 
          title="Incasso Oggi" 
          value={`€${stats.todayRevenue.toFixed(2)}`} 
          icon="💰" 
          color="purple"
          subtitle="Revenue giornaliero"
        />
        <StatCard 
          title="Stock Basso" 
          value={stats.lowStock} 
          icon="⚠️" 
          color="red"
          subtitle="Prodotti sotto soglia"
        />
        <StatCard 
          title="Utenti Attivi" 
          value={stats.activeUsers} 
          icon="🟢" 
          color="teal"
          subtitle="Ultimi 7 giorni"
        />
      </div>

      {/* Contenuto principale diviso in colonne */}
      <div className="overview-content">
        
        {/* Colonna sinistra */}
        <div className="overview-left">
          
          {/* Ordini recenti */}
          <div className="widget">
            <div className="widget-header">
              <h3>📋 Ordini Recenti</h3>
              <a href="#orders" className="widget-link">Vedi tutti</a>
            </div>
            <div className="widget-content">
              {recentOrders.length === 0 ? (
                <p className="empty-message">Nessun ordine recente</p>
              ) : (
                <div className="orders-list">
                  {recentOrders.map(order => (
                    <div key={order.id} className="order-item">
                      <div className="order-info">
                        <span className="order-id">#{order.id}</span>
                        <span className="order-table">Tavolo {order.table_number || 'N/A'}</span>
                      </div>
                      <div className="order-details">
                        <span className="order-total">€{parseFloat(order.total || 0).toFixed(2)}</span>
                        <span className={`order-status ${order.status}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Azioni rapide */}
          <div className="widget">
            <div className="widget-header">
              <h3>⚡ Azioni Rapide</h3>
            </div>
            <div className="widget-content">
              <div className="actions-grid">
                <button className="action-card" onClick={() => navigateToSection('users')}>
                  <span className="action-icon">👥</span>
                  <span className="action-text">Aggiungi Utente</span>
                </button>
                <button className="action-card" onClick={() => navigateToSection('products')}>
                  <span className="action-icon">🍺</span>
                  <span className="action-text">Nuovo Prodotto</span>
                </button>
                <button className="action-card" onClick={() => navigateToSection('orders')}>
                  <span className="action-icon">📋</span>
                  <span className="action-text">Visualizza Ordini</span>
                </button>
                <button className="action-card" onClick={() => navigateToSection('stock')}>
                  <span className="action-icon">📦</span>
                  <span className="action-text">Controlla Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Colonna destra */}
        <div className="overview-right">
          
          {/* Prodotti più venduti */}
          <div className="widget">
            <div className="widget-header">
              <h3>🏆 Top Prodotti</h3>
              <a href="#products" className="widget-link">Vedi tutti</a>
            </div>
            <div className="widget-content">
              {topProducts.length === 0 ? (
                <p className="empty-message">Nessun dato disponibile</p>
              ) : (
                <div className="products-list">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="product-item">
                      <div className="product-rank">#{index + 1}</div>
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <span className="product-sales">{product.sold} vendite</span>
                      </div>
                      <div className="product-price">€{parseFloat(product.price || 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alert e notifiche */}
          <div className="widget">
            <div className="widget-header">
              <h3>🔔 Alert Sistema</h3>
            </div>
            <div className="widget-content">
              <div className="alerts-list">
                {stats.lowStock > 0 && (
                  <div className="alert warning">
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-content">
                      <strong>Stock Basso</strong>
                      <p>{stats.lowStock} prodotti sotto la soglia minima</p>
                    </div>
                  </div>
                )}
                
                {stats.activeUsers < 3 && (
                  <div className="alert info">
                    <span className="alert-icon">👥</span>
                    <div className="alert-content">
                      <strong>Pochi Utenti Attivi</strong>
                      <p>Solo {stats.activeUsers} utenti attivi questa settimana</p>
                    </div>
                  </div>
                )}

                {stats.todayRevenue === 0 && (
                  <div className="alert info">
                    <span className="alert-icon">💰</span>
                    <div className="alert-content">
                      <strong>Nessun Incasso Oggi</strong>
                      <p>Non ci sono stati ordini oggi</p>
                    </div>
                  </div>
                )}

                {/* Se non ci sono alert */}
                {stats.lowStock === 0 && stats.activeUsers >= 3 && stats.todayRevenue > 0 && (
                  <div className="alert success">
                    <span className="alert-icon">✅</span>
                    <div className="alert-content">
                      <strong>Tutto OK</strong>
                      <p>Sistema funzionante senza problemi</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Funzioni helper
function getOrderStatusLabel(status) {
  const statusLabels = {
    'pending': 'In Attesa',
    'preparing': 'In Preparazione', 
    'ready': 'Pronto',
    'served': 'Servito',
    'cancelled': 'Annullato'
  };
  return statusLabels[status] || status;
}

function navigateToSection(section) {
  // Questa funzione dovrebbe comunicare con il componente padre
  // per cambiare la sezione attiva
  console.log(`Navigate to ${section}`);
  // Per ora lasciamo solo il log, implementeremo la navigazione dopo
}