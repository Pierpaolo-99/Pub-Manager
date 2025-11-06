import { useState } from "react";

export default function ReportsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const reportTypes = [
    { id: 'sales', name: 'Report Vendite', icon: '💰', description: 'Analisi vendite per periodo' },
    { id: 'products', name: 'Prodotti Top', icon: '🏆', description: 'Prodotti più venduti' },
    { id: 'inventory', name: 'Report Inventario', icon: '📦', description: 'Stato magazzino' },
    { id: 'costs', name: 'Analisi Costi', icon: '📊', description: 'Costi vs ricavi' },
  ];

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

      <div className="reports-grid">
        {reportTypes.map(report => (
          <div key={report.id} className="report-card">
            <div className="report-icon">{report.icon}</div>
            <div className="report-content">
              <h3>{report.name}</h3>
              <p>{report.description}</p>
            </div>
            <div className="report-actions">
              <button className="btn primary">Visualizza</button>
              <button className="btn secondary">Esporta</button>
            </div>
          </div>
        ))}
      </div>

      <div className="quick-stats">
        <div className="stat-card">
          <h4>Vendite Oggi</h4>
          <div className="stat-value">€1,245.50</div>
          <div className="stat-change positive">+12.5%</div>
        </div>
        <div className="stat-card">
          <h4>Ordini Completati</h4>
          <div className="stat-value">47</div>
          <div className="stat-change positive">+8.2%</div>
        </div>
        <div className="stat-card">
          <h4>Prodotto Top</h4>
          <div className="stat-value">Pizza Margherita</div>
          <div className="stat-change">15 vendite</div>
        </div>
        <div className="stat-card">
          <h4>Margine Medio</h4>
          <div className="stat-value">68%</div>
          <div className="stat-change negative">-2.1%</div>
        </div>
      </div>
    </div>
  );
}