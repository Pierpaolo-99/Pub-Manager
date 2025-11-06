import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

// Sezioni 
import OverviewSection from "./components/OverviewSection";
import UsersSection from "./components/UsersSection";
import ProductsSection from "./components/ProductsSection";
import CategoriesSection from "./components/CategorySection"; // Nota: hai sia CategoriesSection che CategorySection
import OrdersSection from "./components/OrdersSection";
import StockSection from "./components/StockSection";
import VariantsSection from "./components/VariantsSection";
import AllergensSection from "./components/AllergensSection";
import PromotionsSection from "./components/PromotionsSection";
import TablesSection from "./components/TablesSection";
import IngredientsSection from "./components/IngredientsSection";
import RecipesSection from "./components/RecipesSection";
import IngredientsStockSection from "./components/IngredientsStockSection"; // Nota: hai scritto "IngredietsStockSection" (con typo)
import StockMovementsSection from "./components/StockMovementsSection";
import SuppliersSection from "./components/SuppliersSection";
import PurchaseOrdersSection from "./components/PurchaseOrdersSection";
import ReportsSection from "./components/ReportsSection";
import FinancialSection from "./components/FinancialSection";
import SettingsSection from "./components/SettingsSection";

import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Raggruppa le sezioni per categoria
  const sectionGroups = [
    {
      name: "Dashboard",
      sections: [
        { id: 'overview', name: 'Panoramica', icon: '📊' }
      ]
    },
    {
      name: "Gestione Base",
      sections: [
        { id: 'users', name: 'Utenti', icon: '👥' },
        { id: 'tables', name: 'Tavoli', icon: '🪑' },
        { id: 'orders', name: 'Ordini', icon: '🛒' },
        { id: 'promotions', name: 'Promozioni', icon: '🏷️' }        
      ]
    },
    {
      name: "Prodotti & Menu",
      sections: [
        { id: 'categories', name: 'Categorie', icon: '📁' },
        { id: 'products', name: 'Prodotti', icon: '🍺' },
        { id: 'variants', name: 'Varianti', icon: '🔄' },
        { id: 'allergens', name: 'Allergeni', icon: '⚠️' }
      ]
    },
    {
      name: "Cucina & Ricette",
      sections: [
        { id: 'ingredients', name: 'Ingredienti', icon: '🥕' },
        { id: 'recipes', name: 'Ricette', icon: '📝' }
      ]
    },
    {
      name: "Inventario",
      sections: [
        { id: 'stock', name: 'Stock Prodotti', icon: '📦' },
        { id: 'ingredients-stock', name: 'Stock Ingredienti', icon: '🏪' },
        { id: 'stock-movements', name: 'Movimenti', icon: '📈' }
      ]
    },
    {
      name: "Acquisti",
      sections: [
        { id: 'purchase-orders', name: 'Ordini Acquisto', icon: '📋' },
        { id: 'suppliers', name: 'Fornitori', icon: '🚚' },
      ]
    },
    {
      name: "Analytics",
      sections: [
        { id: 'reports', name: 'Report', icon: '📈' },
        { id: 'financial', name: 'Finanziari', icon: '💰' }
      ]
    },
    {
      name: "Sistema",
      sections: [
        { id: 'settings', name: 'Impostazioni', icon: '⚙️' }
      ]
    }
  ];

  const renderContent = () => {
    switch(activeSection) {
      // Esistenti
      case 'overview': return <OverviewSection />;
      case 'users': return <UsersSection />;
      case 'products': return <ProductsSection />;
      case 'categories': return <CategoriesSection />;
      case 'orders': return <OrdersSection />;
      case 'stock': return <StockSection />;
      case 'variants': return <VariantsSection />;
      case 'allergens': return <AllergensSection />;
      case 'promotions': return <PromotionsSection />;
      
      // NUOVE SEZIONI
      case 'tables': return <TablesSection />;
      case 'ingredients': return <IngredientsSection />;
      case 'recipes': return <RecipesSection />;
      case 'ingredients-stock': return <IngredientsStockSection />;
      case 'stock-movements': return <StockMovementsSection />;
      case 'suppliers': return <SuppliersSection />;
      case 'purchase-orders': return <PurchaseOrdersSection />;
      case 'reports': return <ReportsSection />;
      case 'financial': return <FinancialSection />;
      case 'settings': return <SettingsSection />;
      
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header con info utente aggiornate */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🍺 Pub Manager Admin</h1>
          <span>
            Benvenuto, {user?.first_name || user?.name || user?.username} 
            {user?.role && <span className="user-role">({user.role})</span>}
          </span>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-role-badge">{user?.role}</span>
          </div>
          <button className="btn secondary" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Sidebar migliorata con gruppi */}
        <nav className="dashboard-sidebar">
          <div className="sidebar-content">
            {sectionGroups.map(group => (
              <div key={group.name} className="sidebar-group">
                <div className="sidebar-group-title">{group.name}</div>
                {group.sections.map(section => (
                  <button
                    key={section.id}
                    className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="icon">{section.icon}</span>
                    <span className="text">{section.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="content-body">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
