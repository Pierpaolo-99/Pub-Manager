import { useState } from "react";

export default function SettingsSection() {
  const [settings, setSettings] = useState({
    pubName: 'Il Mio Pub',
    currency: 'EUR',
    language: 'it',
    timezone: 'Europe/Rome',
    notifications: true,
    backupAuto: true
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <div>
          <h2>⚙️ Impostazioni Sistema</h2>
          <p className="section-subtitle">Configurazione generale dell'applicazione</p>
        </div>
        <button className="btn primary">💾 Salva Impostazioni</button>
      </div>

      <div className="settings-groups">
        {/* Impostazioni Generali */}
        <div className="settings-group">
          <h3>🏪 Impostazioni Pub</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label className="setting-label">Nome Pub</label>
              <input 
                type="text"
                className="form-input"
                value={settings.pubName}
                onChange={(e) => handleSettingChange('pubName', e.target.value)}
              />
            </div>
            <div className="setting-item">
              <label className="setting-label">Valuta</label>
              <select 
                className="form-select"
                value={settings.currency}
                onChange={(e) => handleSettingChange('currency', e.target.value)}
              >
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollaro ($)</option>
                <option value="GBP">Sterlina (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Impostazioni Sistema */}
        <div className="settings-group">
          <h3>🖥️ Sistema</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label className="setting-label">Lingua</label>
              <select 
                className="form-select"
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div className="setting-item">
              <label className="setting-label">Fuso Orario</label>
              <select 
                className="form-select"
                value={settings.timezone}
                onChange={(e) => handleSettingChange('timezone', e.target.value)}
              >
                <option value="Europe/Rome">Europa/Roma</option>
                <option value="Europe/London">Europa/Londra</option>
                <option value="America/New_York">America/New York</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifiche */}
        <div className="settings-group">
          <h3>🔔 Notifiche</h3>
          <div className="setting-toggle">
            <label className="toggle-label">
              <input 
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              />
              <span>Abilita notifiche sistema</span>
            </label>
          </div>
        </div>

        {/* Backup */}
        <div className="settings-group">
          <h3>💾 Backup</h3>
          <div className="setting-toggle">
            <label className="toggle-label">
              <input 
                type="checkbox"
                checked={settings.backupAuto}
                onChange={(e) => handleSettingChange('backupAuto', e.target.checked)}
              />
              <span>Backup automatico giornaliero</span>
            </label>
          </div>
          <div className="backup-actions">
            <button className="btn secondary">📥 Crea Backup</button>
            <button className="btn secondary">📤 Ripristina Backup</button>
          </div>
        </div>
      </div>
    </div>
  );
}