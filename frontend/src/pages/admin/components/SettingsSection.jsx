import { useState, useEffect } from "react";
import "./SettingsSection.css";

export default function SettingsSection() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  
  // Stati per le diverse sezioni
  const [generalSettings, setGeneralSettings] = useState({});
  const [pubProfile, setPubProfile] = useState({});
  const [notificationSettings, setNotificationSettings] = useState({});
  const [backupLogs, setBackupLogs] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);

  const tabs = [
    { id: 'general', name: 'Generali', icon: '⚙️' },
    { id: 'pub', name: 'Pub', icon: '🏪' },
    { id: 'notifications', name: 'Notifiche', icon: '🔔' },
    { id: 'security', name: 'Sicurezza', icon: '🔒' },
    { id: 'backup', name: 'Backup', icon: '💾' },
  ];

  useEffect(() => {
    loadSettings();
    loadPubProfile();
    loadNotificationSettings();
    if (activeTab === 'backup') {
      loadBackupLogs();
    }
  }, [activeTab]);

  // Carica impostazioni generali
  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneralSettings(data.settings || {});
      }
    } catch (err) {
      console.error('❌ Error loading settings:', err);
    }
  };

  // Carica profilo pub
  const loadPubProfile = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings/pub-profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPubProfile(data.profile || {});
      }
    } catch (err) {
      console.error('❌ Error loading pub profile:', err);
    }
  };

  // Carica impostazioni notifiche
  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings/notifications', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings(data.notification_settings || {});
      }
    } catch (err) {
      console.error('❌ Error loading notification settings:', err);
    }
  };

  // Carica log backup
  const loadBackupLogs = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings/backup-logs', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackupLogs(data.logs || []);
      }
    } catch (err) {
      console.error('❌ Error loading backup logs:', err);
    }
  };

  // Salva impostazioni generali
  const saveGeneralSettings = async (settingsToSave) => {
    setLoading(true);
    setSaveStatus(null);
    
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ settings: settingsToSave })
      });
      
      if (response.ok) {
        setSaveStatus({ type: 'success', message: 'Impostazioni salvate con successo!' });
        loadSettings(); // Ricarica per sincronizzare
      } else {
        setSaveStatus({ type: 'error', message: 'Errore nel salvataggio delle impostazioni' });
      }
    } catch (err) {
      console.error('❌ Error saving settings:', err);
      setSaveStatus({ type: 'error', message: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  // Salva profilo pub
  const savePubProfile = async (profileToSave) => {
    setLoading(true);
    setSaveStatus(null);
    
    try {
      const response = await fetch('http://localhost:3000/api/settings/pub-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ profile: profileToSave })
      });
      
      if (response.ok) {
        setSaveStatus({ type: 'success', message: 'Profilo pub salvato con successo!' });
        loadPubProfile(); // Ricarica per sincronizzare
      } else {
        setSaveStatus({ type: 'error', message: 'Errore nel salvataggio del profilo' });
      }
    } catch (err) {
      console.error('❌ Error saving pub profile:', err);
      setSaveStatus({ type: 'error', message: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  // Crea backup
  const createBackup = async () => {
    setBackupLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/settings/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ backup_type: 'manual' })
      });
      
      if (response.ok) {
        setSaveStatus({ type: 'success', message: 'Backup avviato con successo!' });
        setTimeout(() => {
          loadBackupLogs(); // Ricarica log dopo un po'
        }, 3000);
      } else {
        setSaveStatus({ type: 'error', message: 'Errore nella creazione del backup' });
      }
    } catch (err) {
      console.error('❌ Error creating backup:', err);
      setSaveStatus({ type: 'error', message: 'Errore di connessione' });
    } finally {
      setBackupLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <div>
          <h2>⚙️ Impostazioni</h2>
          <p className="section-subtitle">Configurazione sistema e preferenze</p>
        </div>
        
        {saveStatus && (
          <div className={`save-status ${saveStatus.type}`}>
            {saveStatus.type === 'success' ? '✅' : '❌'} {saveStatus.message}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="settings-content">
        {activeTab === 'general' && (
          <GeneralSettingsTab 
            settings={generalSettings}
            onSave={saveGeneralSettings}
            loading={loading}
          />
        )}
        
        {activeTab === 'pub' && (
          <PubProfileTab 
            profile={pubProfile}
            onSave={savePubProfile}
            loading={loading}
          />
        )}
        
        {activeTab === 'notifications' && (
          <NotificationsTab 
            settings={notificationSettings}
            loading={loading}
          />
        )}
        
        {activeTab === 'security' && (
          <SecurityTab 
            settings={generalSettings}
            onSave={saveGeneralSettings}
            loading={loading}
          />
        )}
        
        {activeTab === 'backup' && (
          <BackupTab 
            logs={backupLogs}
            onCreateBackup={createBackup}
            backupLoading={backupLoading}
            formatFileSize={formatFileSize}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
}

// Component Impostazioni Generali
function GeneralSettingsTab({ settings, onSave, loading }) {
  const [formData, setFormData] = useState({
    pub_name: '',
    pub_currency: 'EUR',
    system_language: 'it',
    system_timezone: 'Europe/Rome',
    system_date_format: 'DD/MM/YYYY',
    system_theme: 'light',
    pub_tax_rate: 22
  });

  useEffect(() => {
    // Popola il form con i dati delle impostazioni
    const newFormData = { ...formData };
    Object.keys(settings).forEach(key => {
      if (settings[key] && typeof settings[key].value !== 'undefined') {
        newFormData[key] = settings[key].value;
      }
    });
    setFormData(newFormData);
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings-tab">
      <h3>🏪 Impostazioni Generali</h3>
      
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-section">
          <h4>📋 Informazioni Base</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome Pub</label>
              <input
                type="text"
                className="form-input"
                value={formData.pub_name}
                onChange={(e) => handleChange('pub_name', e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Valuta</label>
              <select
                className="form-select"
                value={formData.pub_currency}
                onChange={(e) => handleChange('pub_currency', e.target.value)}
              >
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollaro ($)</option>
                <option value="GBP">Sterlina (£)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Aliquota IVA (%)</label>
              <input
                type="number"
                className="form-input"
                value={formData.pub_tax_rate}
                onChange={(e) => handleChange('pub_tax_rate', parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>🌍 Localizzazione</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Lingua</label>
              <select
                className="form-select"
                value={formData.system_language}
                onChange={(e) => handleChange('system_language', e.target.value)}
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Fuso Orario</label>
              <select
                className="form-select"
                value={formData.system_timezone}
                onChange={(e) => handleChange('system_timezone', e.target.value)}
              >
                <option value="Europe/Rome">Europa/Roma</option>
                <option value="Europe/London">Europa/Londra</option>
                <option value="Europe/Paris">Europa/Parigi</option>
                <option value="America/New_York">America/New York</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Formato Data</label>
              <select
                className="form-select"
                value={formData.system_date_format}
                onChange={(e) => handleChange('system_date_format', e.target.value)}
              >
                <option value="DD/MM/YYYY">GG/MM/AAAA</option>
                <option value="MM/DD/YYYY">MM/GG/AAAA</option>
                <option value="YYYY-MM-DD">AAAA-MM-GG</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>🎨 Interfaccia</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tema</label>
              <div className="theme-selector">
                <label className="radio-option">
                  <input
                    type="radio"
                    value="light"
                    checked={formData.system_theme === 'light'}
                    onChange={(e) => handleChange('system_theme', e.target.value)}
                  />
                  <span className="radio-label">☀️ Chiaro</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="dark"
                    checked={formData.system_theme === 'dark'}
                    onChange={(e) => handleChange('system_theme', e.target.value)}
                  />
                  <span className="radio-label">🌙 Scuro</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="auto"
                    checked={formData.system_theme === 'auto'}
                    onChange={(e) => handleChange('system_theme', e.target.value)}
                  />
                  <span className="radio-label">🔄 Auto</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn primary"
            disabled={loading}
          >
            {loading ? '💾 Salvando...' : '💾 Salva Impostazioni'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Component Profilo Pub
function PubProfileTab({ profile, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    opening_hours: {},
    social_media: {},
    tax_info: {}
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        ...profile,
        opening_hours: profile.opening_hours || {},
        social_media: profile.social_media || {},
        tax_info: profile.tax_info || {}
      }));
    }
  }, [profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNestedChange = (section, key, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <div className="settings-tab">
      <h3>🏪 Profilo Pub</h3>
      
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-section">
          <h4>📝 Informazioni Principali</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome Pub *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Telefono</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+39 123 456 7890"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@miopub.it"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group full-width">
              <label className="form-label">Indirizzo</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Via Roma 123, 00100 Roma RM"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sito Web</label>
              <input
                type="url"
                className="form-input"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.miopub.it"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group full-width">
              <label className="form-label">Descrizione</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Descrizione del pub, atmosfera, specialità..."
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>📱 Social Media</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Facebook</label>
              <input
                type="url"
                className="form-input"
                value={formData.social_media.facebook || ''}
                onChange={(e) => handleNestedChange('social_media', 'facebook', e.target.value)}
                placeholder="https://facebook.com/miopub"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input
                type="url"
                className="form-input"
                value={formData.social_media.instagram || ''}
                onChange={(e) => handleNestedChange('social_media', 'instagram', e.target.value)}
                placeholder="https://instagram.com/miopub"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">TikTok</label>
              <input
                type="url"
                className="form-input"
                value={formData.social_media.tiktok || ''}
                onChange={(e) => handleNestedChange('social_media', 'tiktok', e.target.value)}
                placeholder="https://tiktok.com/@miopub"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>🏛️ Informazioni Fiscali</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Partita IVA</label>
              <input
                type="text"
                className="form-input"
                value={formData.tax_info.vat_number || ''}
                onChange={(e) => handleNestedChange('tax_info', 'vat_number', e.target.value)}
                placeholder="IT12345678901"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Codice Fiscale</label>
              <input
                type="text"
                className="form-input"
                value={formData.tax_info.tax_code || ''}
                onChange={(e) => handleNestedChange('tax_info', 'tax_code', e.target.value)}
                placeholder="RSSMRA80A01H501T"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">REA</label>
              <input
                type="text"
                className="form-input"
                value={formData.tax_info.rea || ''}
                onChange={(e) => handleNestedChange('tax_info', 'rea', e.target.value)}
                placeholder="RM-1234567"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn primary"
            disabled={loading}
          >
            {loading ? '💾 Salvando...' : '💾 Salva Profilo'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Component Notifiche
function NotificationsTab({ settings, loading }) {
  const [notifications, setNotifications] = useState({
    low_stock: { enabled: true, email: true, push: true },
    new_orders: { enabled: true, email: false, push: true },
    backup_completed: { enabled: true, email: true, push: false },
    daily_reports: { enabled: false, email: true, push: false }
  });

  return (
    <div className="settings-tab">
      <h3>🔔 Impostazioni Notifiche</h3>
      
      <div className="notifications-list">
        {Object.entries(notifications).map(([key, setting]) => (
          <div key={key} className="notification-item">
            <div className="notification-info">
              <h4>{getNotificationName(key)}</h4>
              <p>{getNotificationDescription(key)}</p>
            </div>
            
            <div className="notification-controls">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={setting.enabled}
                  onChange={(e) => {
                    setNotifications(prev => ({
                      ...prev,
                      [key]: { ...prev[key], enabled: e.target.checked }
                    }));
                  }}
                />
                <span>Abilitato</span>
              </label>
              
              {setting.enabled && (
                <div className="delivery-methods">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={setting.email}
                      onChange={(e) => {
                        setNotifications(prev => ({
                          ...prev,
                          [key]: { ...prev[key], email: e.target.checked }
                        }));
                      }}
                    />
                    <span>📧 Email</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={setting.push}
                      onChange={(e) => {
                        setNotifications(prev => ({
                          ...prev,
                          [key]: { ...prev[key], push: e.target.checked }
                        }));
                      }}
                    />
                    <span>📱 Push</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="form-actions">
        <button className="btn primary" disabled={loading}>
          {loading ? '💾 Salvando...' : '💾 Salva Notifiche'}
        </button>
      </div>
    </div>
  );
}

// Component Sicurezza
function SecurityTab({ settings, onSave, loading }) {
  const [formData, setFormData] = useState({
    session_timeout: 3600,
    max_login_attempts: 5,
    password_min_length: 8,
    two_factor_enabled: false
  });

  useEffect(() => {
    // Popola con i dati delle impostazioni di sicurezza
    const newFormData = { ...formData };
    Object.keys(settings).forEach(key => {
      if (settings[key] && typeof settings[key].value !== 'undefined') {
        newFormData[key] = settings[key].value;
      }
    });
    setFormData(newFormData);
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings-tab">
      <h3>🔒 Impostazioni Sicurezza</h3>
      
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-section">
          <h4>🔐 Autenticazione</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Timeout Sessione (secondi)</label>
              <input
                type="number"
                className="form-input"
                value={formData.session_timeout}
                onChange={(e) => handleChange('session_timeout', parseInt(e.target.value))}
                min="300"
                max="86400"
                step="300"
              />
              <small className="form-help">Durata massima delle sessioni utente</small>
            </div>
            
            <div className="form-group">
              <label className="form-label">Tentativi Login Max</label>
              <input
                type="number"
                className="form-input"
                value={formData.max_login_attempts}
                onChange={(e) => handleChange('max_login_attempts', parseInt(e.target.value))}
                min="3"
                max="20"
              />
              <small className="form-help">Tentativi prima del blocco temporaneo</small>
            </div>
            
            <div className="form-group">
              <label className="form-label">Lunghezza Min Password</label>
              <input
                type="number"
                className="form-input"
                value={formData.password_min_length}
                onChange={(e) => handleChange('password_min_length', parseInt(e.target.value))}
                min="6"
                max="50"
              />
              <small className="form-help">Caratteri minimi per le password</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>🛡️ Sicurezza Avanzata</h4>
          <div className="security-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.two_factor_enabled}
                onChange={(e) => handleChange('two_factor_enabled', e.target.checked)}
              />
              <span>Abilita Autenticazione a Due Fattori (2FA)</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn primary"
            disabled={loading}
          >
            {loading ? '🔒 Salvando...' : '🔒 Salva Sicurezza'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Component Backup
function BackupTab({ logs, onCreateBackup, backupLoading, formatFileSize, formatDate }) {
  return (
    <div className="settings-tab">
      <h3>💾 Gestione Backup</h3>
      
      <div className="backup-controls">
        <div className="backup-info">
          <h4>📋 Backup Manuale</h4>
          <p>Crea un backup completo del database e delle impostazioni</p>
        </div>
        
        <button
          className="btn primary"
          onClick={onCreateBackup}
          disabled={backupLoading}
        >
          {backupLoading ? '⏳ Creando backup...' : '💾 Crea Backup'}
        </button>
      </div>

      <div className="backup-logs">
        <h4>📜 Cronologia Backup</h4>
        
        {logs.length === 0 ? (
          <div className="empty-state">
            <p>Nessun backup trovato</p>
          </div>
        ) : (
          <div className="backup-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Stato</th>
                  <th>Dimensione</th>
                  <th>Utente</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{formatDate(log.created_at)}</td>
                    <td>
                      <span className={`backup-type ${log.backup_type}`}>
                        {log.backup_type === 'auto' ? '🔄 Auto' : '👤 Manuale'}
                      </span>
                    </td>
                    <td>
                      <span className={`backup-status ${log.status}`}>
                        {getStatusIcon(log.status)} {getStatusText(log.status)}
                      </span>
                    </td>
                    <td>{formatFileSize(log.file_size)}</td>
                    <td>{log.created_by_username || 'Sistema'}</td>
                    <td>
                      {log.status === 'completed' && (
                        <button className="btn-small secondary">
                          📥 Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getNotificationName(key) {
  const names = {
    low_stock: 'Stock Basso',
    new_orders: 'Nuovi Ordini',
    backup_completed: 'Backup Completato',
    daily_reports: 'Report Giornalieri'
  };
  return names[key] || key;
}

function getNotificationDescription(key) {
  const descriptions = {
    low_stock: 'Avviso quando gli ingredienti scendono sotto la soglia minima',
    new_orders: 'Notifica per ogni nuovo ordine ricevuto',
    backup_completed: 'Conferma quando un backup viene completato con successo',
    daily_reports: 'Report automatico delle vendite giornaliere'
  };
  return descriptions[key] || '';
}

function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    completed: '✅',
    failed: '❌'
  };
  return icons[status] || '❓';
}

function getStatusText(status) {
  const texts = {
    pending: 'In corso',
    completed: 'Completato',
    failed: 'Fallito'
  };
  return texts[status] || status;
}