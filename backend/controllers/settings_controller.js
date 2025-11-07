const connection = require('../database/db');

// GET tutte le impostazioni per categoria
function getSettings(req, res) {
    const { category, public_only = false } = req.query;
    
    let sql = `
        SELECT 
            setting_key,
            setting_value,
            data_type,
            category,
            description,
            is_public
        FROM app_settings
        WHERE 1=1
    `;
    
    const params = [];
    
    if (category) {
        sql += ` AND category = ?`;
        params.push(category);
    }
    
    if (public_only === 'true') {
        sql += ` AND is_public = TRUE`;
    }
    
    sql += ` ORDER BY category, setting_key`;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching settings:', err);
            return res.status(500).json({ error: 'Errore nel caricamento impostazioni' });
        }
        
        // Converti i dati nel tipo giusto
        const settings = results.reduce((acc, setting) => {
            let value = setting.setting_value;
            
            // Converti in base al data_type
            switch(setting.data_type) {
                case 'boolean':
                    value = value === 'true';
                    break;
                case 'number':
                    value = parseFloat(value) || 0;
                    break;
                case 'json':
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = {};
                    }
                    break;
                default:
                    // string - nessuna conversione
                    break;
            }
            
            acc[setting.setting_key] = {
                value,
                data_type: setting.data_type,
                category: setting.category,
                description: setting.description,
                is_public: setting.is_public
            };
            
            return acc;
        }, {});
        
        res.json({ settings });
    });
}

// PUT aggiorna impostazioni
function updateSettings(req, res) {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Dati impostazioni non validi' });
    }
    
    // Prepara le query di update
    const updates = Object.entries(settings).map(([key, value]) => {
        // Converti il valore in stringa per il database
        let stringValue = value;
        if (typeof value === 'boolean') {
            stringValue = value.toString();
        } else if (typeof value === 'object') {
            stringValue = JSON.stringify(value);
        } else {
            stringValue = String(value);
        }
        
        return [key, stringValue];
    });
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'Nessuna impostazione da aggiornare' });
    }
    
    // Esegui updates in transazione
    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Errore nell\'aggiornamento' });
        }
        
        let completed = 0;
        let hasError = false;
        
        updates.forEach(([key, value]) => {
            const sql = `
                INSERT INTO app_settings (setting_key, setting_value, updated_at) 
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                setting_value = VALUES(setting_value),
                updated_at = NOW()
            `;
            
            connection.query(sql, [key, value], (err) => {
                if (err && !hasError) {
                    hasError = true;
                    console.error('Error updating setting:', err);
                    return connection.rollback(() => {
                        res.status(500).json({ error: 'Errore nell\'aggiornamento impostazioni' });
                    });
                }
                
                completed++;
                
                if (completed === updates.length && !hasError) {
                    connection.commit((err) => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return connection.rollback(() => {
                                res.status(500).json({ error: 'Errore nel salvataggio' });
                            });
                        }
                        
                        res.json({ 
                            message: 'Impostazioni aggiornate con successo',
                            updated_count: updates.length
                        });
                    });
                }
            });
        });
    });
}

// GET profilo pub
function getPubProfile(req, res) {
    const sql = `SELECT * FROM pub_profile ORDER BY id DESC LIMIT 1`;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching pub profile:', err);
            return res.status(500).json({ error: 'Errore nel caricamento profilo pub' });
        }
        
        const profile = results[0] || {};
        
        // Parsa i campi JSON
        if (profile.opening_hours) {
            try {
                profile.opening_hours = JSON.parse(profile.opening_hours);
            } catch (e) {
                profile.opening_hours = {};
            }
        }
        
        if (profile.social_media) {
            try {
                profile.social_media = JSON.parse(profile.social_media);
            } catch (e) {
                profile.social_media = {};
            }
        }
        
        if (profile.tax_info) {
            try {
                profile.tax_info = JSON.parse(profile.tax_info);
            } catch (e) {
                profile.tax_info = {};
            }
        }
        
        res.json({ profile });
    });
}

// PUT aggiorna profilo pub
function updatePubProfile(req, res) {
    const { profile } = req.body;
    
    if (!profile) {
        return res.status(400).json({ error: 'Dati profilo non validi' });
    }
    
    // Prepara i dati per l'insert/update
    const {
        name,
        address,
        phone,
        email,
        website,
        logo_url,
        description,
        opening_hours,
        social_media,
        tax_info
    } = profile;
    
    const sql = `
        INSERT INTO pub_profile (
            name, address, phone, email, website, logo_url, description,
            opening_hours, social_media, tax_info, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        address = VALUES(address),
        phone = VALUES(phone),
        email = VALUES(email),
        website = VALUES(website),
        logo_url = VALUES(logo_url),
        description = VALUES(description),
        opening_hours = VALUES(opening_hours),
        social_media = VALUES(social_media),
        tax_info = VALUES(tax_info),
        updated_at = NOW()
    `;
    
    const params = [
        name || '',
        address || null,
        phone || null,
        email || null,
        website || null,
        logo_url || null,
        description || null,
        opening_hours ? JSON.stringify(opening_hours) : null,
        social_media ? JSON.stringify(social_media) : null,
        tax_info ? JSON.stringify(tax_info) : null
    ];
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating pub profile:', err);
            return res.status(500).json({ error: 'Errore nell\'aggiornamento profilo' });
        }
        
        res.json({ 
            message: 'Profilo pub aggiornato con successo',
            profile_id: result.insertId || result.affectedRows
        });
    });
}

// GET log backup
function getBackupLogs(req, res) {
    const { limit = 50 } = req.query;
    
    const sql = `
        SELECT 
            bl.*,
            u.username as created_by_username
        FROM backup_logs bl
        LEFT JOIN users u ON bl.created_by = u.id
        ORDER BY bl.created_at DESC
        LIMIT ?
    `;
    
    connection.query(sql, [parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Error fetching backup logs:', err);
            return res.status(500).json({ error: 'Errore nel caricamento log backup' });
        }
        
        const logs = results.map(log => ({
            ...log,
            file_size: log.file_size ? parseInt(log.file_size) : null
        }));
        
        res.json({ logs });
    });
}

// POST crea backup
function createBackup(req, res) {
    const userId = req.user?.id; // Dall'autenticazione
    const { backup_type = 'manual' } = req.body;
    
    // Log dell'inizio backup
    const logSql = `
        INSERT INTO backup_logs (backup_type, status, created_by, created_at)
        VALUES (?, 'pending', ?, NOW())
    `;
    
    connection.query(logSql, [backup_type, userId], (err, result) => {
        if (err) {
            console.error('Error logging backup start:', err);
            return res.status(500).json({ error: 'Errore nella creazione backup' });
        }
        
        const backupId = result.insertId;
        
        // TODO: Implementa la logica di backup reale
        // Per ora simuliamo un backup
        setTimeout(() => {
            const updateSql = `
                UPDATE backup_logs 
                SET status = 'completed', 
                    file_path = ?,
                    file_size = ?
                WHERE id = ?
            `;
            
            const fileName = `backup_${new Date().toISOString().slice(0, 10)}_${backupId}.sql`;
            const filePath = `./backups/${fileName}`;
            const fileSize = Math.floor(Math.random() * 1000000) + 500000; // Simula dimensione file
            
            connection.query(updateSql, [filePath, fileSize, backupId], (err) => {
                if (err) {
                    console.error('Error updating backup log:', err);
                }
            });
        }, 2000);
        
        res.json({ 
            message: 'Backup avviato con successo',
            backup_id: backupId,
            status: 'pending'
        });
    });
}

// GET impostazioni notifiche per utente
function getNotificationSettings(req, res) {
    const userId = req.user?.id;
    
    if (!userId) {
        return res.status(401).json({ error: 'Utente non autenticato' });
    }
    
    const sql = `
        SELECT * FROM notification_settings 
        WHERE user_id = ? 
        ORDER BY notification_type
    `;
    
    connection.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching notification settings:', err);
            return res.status(500).json({ error: 'Errore nel caricamento impostazioni notifiche' });
        }
        
        const settings = results.reduce((acc, setting) => {
            acc[setting.notification_type] = {
                is_enabled: setting.is_enabled,
                delivery_method: setting.delivery_method,
                settings: setting.settings ? JSON.parse(setting.settings) : {}
            };
            return acc;
        }, {});
        
        res.json({ notification_settings: settings });
    });
}

module.exports = {
    getSettings,
    updateSettings,
    getPubProfile,
    updatePubProfile,
    getBackupLogs,
    createBackup,
    getNotificationSettings
};