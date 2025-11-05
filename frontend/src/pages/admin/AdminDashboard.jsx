import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import OverviewSection from "./components/OverviewSection";
import UsersSection from "./components/UsersSection";
import ProductsSection from "./components/ProductsSection";
import CategoriesSection from "./components/CategoriesSection";
import OrdersSection from "./components/OrdersSection";
import StockSection from "./components/StockSection";
import VariantsSection from "./components/VariantsSection";
import AllergensSection from "./components/AllergensSection";
import PromotionsSection from "./components/PromotionsSection";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', name: 'Panoramica', icon: '📊' },
    { id: 'users', name: 'Gestione Utenti', icon: '👥' },
    { id: 'products', name: 'Prodotti', icon: '🍺' },
    { id: 'categories', name: 'Categorie', icon: '📁' },
    { id: 'orders', name: 'Ordini', icon: '📋' },
    { id: 'stock', name: 'Magazzino', icon: '📦' },
    { id: 'variants', name: 'Varianti Prodotti', icon: '🔄' },
    { id: 'allergens', name: 'Allergeni', icon: '⚠️' },
    { id: 'promotions', name: 'Promozioni', icon: '🏷️' }
  ];

  const renderContent = () => {
    switch(activeSection) {
      case 'overview': return <OverviewSection />;
      case 'users': return <UsersSection />;
      case 'products': return <ProductsSection />;
      case 'categories': return <CategoriesSection />;
      case 'orders': return <OrdersSection />;
      case 'stock': return <StockSection />;
      case 'variants': return <VariantsSection />;
      case 'allergens': return <AllergensSection />;
      case 'promotions': return <PromotionsSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🍺 Pub Manager Admin</h1>
          <span>Benvenuto, {user?.name}</span>
        </div>
        <div className="header-right">
          <button className="btn secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Sidebar */}
        <nav className="dashboard-sidebar">
          {sections.map(section => (
            <button
              key={section.id}
              className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="icon">{section.icon}</span>
              <span className="text">{section.name}</span>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className="dashboard-main">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
