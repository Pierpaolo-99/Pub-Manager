import { useState } from "react";

export default function FinancialSection() {
  const [selectedMonth, setSelectedMonth] = useState('2024-11');

  const financialData = {
    revenue: 15420.00,
    costs: 8230.50,
    profit: 7189.50,
    margin: 46.6
  };

  return (
    <div className="financial-section">
      <div className="section-header">
        <div>
          <h2>💰 Gestione Finanziaria</h2>
          <p className="section-subtitle">Controllo economico e margini</p>
        </div>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="financial-overview">
        <div className="financial-card revenue">
          <div className="card-icon">💵</div>
          <div className="card-content">
            <h3>Ricavi</h3>
            <div className="amount">€{financialData.revenue.toLocaleString()}</div>
            <div className="change positive">+15.2%</div>
          </div>
        </div>

        <div className="financial-card costs">
          <div className="card-icon">💸</div>
          <div className="card-content">
            <h3>Costi</h3>
            <div className="amount">€{financialData.costs.toLocaleString()}</div>
            <div className="change negative">+8.7%</div>
          </div>
        </div>

        <div className="financial-card profit">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Profitto</h3>
            <div className="amount">€{financialData.profit.toLocaleString()}</div>
            <div className="change positive">+22.1%</div>
          </div>
        </div>

        <div className="financial-card margin">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Margine</h3>
            <div className="amount">{financialData.margin}%</div>
            <div className="change positive">+3.2%</div>
          </div>
        </div>
      </div>

      <div className="financial-actions">
        <button className="btn primary">📊 Report Dettagliato</button>
        <button className="btn secondary">📈 Analisi Trend</button>
        <button className="btn secondary">💾 Esporta Dati</button>
        <button className="btn secondary">⚙️ Impostazioni Budget</button>
      </div>
    </div>
  );
}