import { useState, useEffect } from "react";
import StatCard from "./StatCard";

export default function OverviewSection() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    lowStock: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const responses = await Promise.all([
        fetch('http://localhost:3000/api/users', { credentials: 'include' }),
        fetch('http://localhost:3000/api/products', { credentials: 'include' }),
        fetch('http://localhost:3000/api/orders', { credentials: 'include' }),
        fetch('http://localhost:3000/api/stock', { credentials: 'include' })
      ]);

      const [users, products, orders, stock] = await Promise.all(
        responses.map(r => r.json())
      );

      setStats({
        totalUsers: users.length || 0,
        totalProducts: products.length || 0,
        totalOrders: orders.length || 0,
        lowStock: stock.filter(item => item.quantity < 10).length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Caricamento statistiche...</div>;
  }

  return (
    <div className="overview-section">
      <h2>📊 Panoramica</h2>
      
      <div className="stats-grid">
        <StatCard 
          title="Utenti Totali" 
          value={stats.totalUsers} 
          icon="👥" 
          color="blue"
        />
        <StatCard 
          title="Prodotti" 
          value={stats.totalProducts} 
          icon="🍺" 
          color="green"
        />
        <StatCard 
          title="Ordini" 
          value={stats.totalOrders} 
          icon="📋" 
          color="orange"
        />
        <StatCard 
          title="Stock Basso" 
          value={stats.lowStock} 
          icon="⚠️" 
          color="red"
        />
      </div>

      <div className="quick-actions">
        <h3>Azioni Rapide</h3>
        <div className="actions-grid">
          <button className="action-card">
            <span>👥</span>
            <span>Aggiungi Utente</span>
          </button>
          <button className="action-card">
            <span>🍺</span>
            <span>Nuovo Prodotto</span>
          </button>
          <button className="action-card">
            <span>📋</span>
            <span>Visualizza Ordini</span>
          </button>
          <button className="action-card">
            <span>📦</span>
            <span>Controlla Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
}