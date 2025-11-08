const connection = require('../database/db');

// GET tutti i tavoli
function getAllTables(req, res) {
    const { location, status, capacity, active } = req.query;
    
    let sql = `
        SELECT 
            id, number, capacity, location, status, qr_code, notes, active,
            created_at, updated_at,
            CASE 
                WHEN status = 'free' THEN 'libero'
                WHEN status = 'occupied' THEN 'occupato'
                WHEN status = 'reserved' THEN 'riservato'
                WHEN status = 'cleaning' THEN 'pulizia'
                ELSE status
            END as status_label
        FROM tables
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (location) {
        sql += ` AND location = ?`;
        params.push(location);
    }
    
    if (status) {
        sql += ` AND status = ?`;
        params.push(status);
    }
    
    if (capacity) {
        if (capacity === '1-2') {
            sql += ` AND capacity <= 2`;
        } else if (capacity === '3-4') {
            sql += ` AND capacity BETWEEN 3 AND 4`;
        } else if (capacity === '5-6') {
            sql += ` AND capacity BETWEEN 5 AND 6`;
        } else if (capacity === '7+') {
            sql += ` AND capacity >= 7`;
        }
    }
    
    if (active !== undefined) {
        sql += ` AND active = ?`;
        params.push(active === 'true' ? 1 : 0);
    }
    
    sql += ` ORDER BY number ASC`;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching tables:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento tavoli',
                details: err.message 
            });
        }
        
        // Converti i dati per il frontend
        const tables = results.map(table => ({
            ...table,
            active: Boolean(table.active),
            // Converti enum DB in formato frontend
            area: table.location || 'interno',
            // Aggiungi campi aggiuntivi per il frontend
            lastOccupied: table.status === 'occupied' ? table.updated_at : null,
            currentOrder: null // Da implementare con join agli ordini
        }));
        
        console.log(`✅ Found ${tables.length} tables`);
        res.json({
            success: true,  // ← AGGIUNGI QUESTO
            tables,
            summary: calculateTablesSummary(tables),
            filters: {
                location: location || null,
                status: status || null,
                capacity: capacity || null,
                active: active !== undefined ? active : null
            }
        });
    });
}

// GET singolo tavolo
function getTableById(req, res) {
    const { id } = req.params;
    
    const sql = `
        SELECT 
            t.*,
            o.id as order_id,
            o.total as order_total,
            o.status as order_status,
            o.created_at as order_created,
            COUNT(oi.id) as order_items
        FROM tables t
        LEFT JOIN orders o ON t.id = o.table_id 
            AND o.status IN ('pending', 'in_preparazione', 'pronto', 'servito')
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE t.id = ?
        GROUP BY t.id, t.number, t.location, t.capacity, t.status, t.active, t.notes, t.created_at, t.updated_at,
                 o.id, o.total, o.status, o.created_at
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching table:', err);
            return res.status(500).json({ error: 'Errore nel caricamento tavolo' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Tavolo non trovato' 
            });
        }
        
        const table = {
            ...results[0],
            active: Boolean(results[0].active),
            currentOrder: results[0].order_id ? {
                id: results[0].order_id,
                items: results[0].order_items || 0,
                total: results[0].order_total || 0
            } : null
        };
        
        console.log(`✅ Table ${id} found`);
        res.json({
            success: true,  // ← AGGIUNGI QUESTO
            table: table
        });
    });
}

// POST nuovo tavolo
function createTable(req, res) {
    const {
        number,
        capacity,
        location,
        status,
        qr_code,
        notes,
        active
    } = req.body;
    
    // Validazione
    if (!number || !capacity) {
        return res.status(400).json({ 
            error: 'Numero tavolo e capacità sono obbligatori' 
        });
    }
    
    // Controlla numero tavolo univoco
    const checkSql = 'SELECT id FROM tables WHERE number = ?';
    connection.query(checkSql, [number], (err, existing) => {
        if (err) {
            console.error('Error checking table number:', err);
            return res.status(500).json({ error: 'Errore nella verifica numero tavolo' });
        }
        
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Numero tavolo già esistente' });
        }
        
        // Genera QR code se non fornito
        const finalQrCode = qr_code || `QR${String(number).padStart(3, '0')}`;
        
        const sql = `
            INSERT INTO tables (
                number, capacity, location, status, qr_code, notes, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            parseInt(number),
            parseInt(capacity),
            location || 'interno',
            mapFrontendStatusToDb(status) || 'free',
            finalQrCode,
            notes || null,
            active !== undefined ? (active ? 1 : 0) : 1
        ];
        
        connection.query(sql, params, (err, result) => {
            if (err) {
                console.error('Error creating table:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Numero tavolo o QR code già esistente' });
                }
                return res.status(500).json({ error: 'Errore nella creazione tavolo' });
            }
            
            res.status(201).json({
                id: result.insertId,
                message: 'Tavolo creato con successo',
                table: { 
                    id: result.insertId, 
                    number: parseInt(number),
                    capacity: parseInt(capacity),
                    qr_code: finalQrCode
                }
            });
        });
    });
}

// PUT aggiornamento tavolo
function updateTable(req, res) {
    const { id } = req.params;
    const {
        number,
        capacity,
        location,
        status,
        qr_code,
        notes,
        active
    } = req.body;
    
    // Controlla se il numero tavolo è già usato da altri
    const checkSql = 'SELECT id FROM tables WHERE number = ? AND id != ?';
    connection.query(checkSql, [number, id], (err, existing) => {
        if (err) {
            console.error('Error checking table number:', err);
            return res.status(500).json({ error: 'Errore nella verifica numero tavolo' });
        }
        
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Numero tavolo già esistente' });
        }
        
        const sql = `
            UPDATE tables 
            SET 
                number = ?,
                capacity = ?,
                location = ?,
                status = ?,
                qr_code = ?,
                notes = ?,
                active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            parseInt(number),
            parseInt(capacity),
            location || 'interno',
            mapFrontendStatusToDb(status) || 'free',
            qr_code,
            notes || null,
            active !== undefined ? (active ? 1 : 0) : 1,
            id
        ];
        
        connection.query(sql, params, (err, result) => {
            if (err) {
                console.error('Error updating table:', err);
                return res.status(500).json({ error: 'Errore nell\'aggiornamento tavolo' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Tavolo non trovato' });
            }
            
            res.json({ message: 'Tavolo aggiornato con successo' });
        });
    });
}

// PATCH aggiornamento stato tavolo
function updateTableStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({ error: 'Stato è obbligatorio' });
    }
    
    const dbStatus = mapFrontendStatusToDb(status);
    if (!dbStatus) {
        return res.status(400).json({ error: 'Stato non valido' });
    }
    
    const sql = 'UPDATE tables SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    connection.query(sql, [dbStatus, id], (err, result) => {
        if (err) {
            console.error('Error updating table status:', err);
            return res.status(500).json({ error: 'Errore nell\'aggiornamento stato' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tavolo non trovato' });
        }
        
        res.json({ 
            message: 'Stato tavolo aggiornato con successo',
            id: parseInt(id),
            status: status
        });
    });
}

// DELETE tavolo
function deleteTable(req, res) {
    const { id } = req.params;
    
    // Prima controlla se il tavolo ha ordini attivi
    const checkOrdersSql = `
        SELECT COUNT(*) as active_orders 
        FROM orders 
        WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')
    `;
    
    connection.query(checkOrdersSql, [id], (err, results) => {
        if (err) {
            console.error('Error checking orders:', err);
            return res.status(500).json({ error: 'Errore nella verifica ordini' });
        }
        
        const activeOrders = results[0].active_orders;
        
        if (activeOrders > 0) {
            return res.status(400).json({ 
                error: 'Non puoi eliminare un tavolo con ordini attivi',
                activeOrders: activeOrders
            });
        }
        
        const sql = 'DELETE FROM tables WHERE id = ?';
        
        connection.query(sql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting table:', err);
                return res.status(500).json({ error: 'Errore nell\'eliminazione tavolo' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Tavolo non trovato' });
            }
            
            res.json({ 
                message: 'Tavolo eliminato con successo',
                deleted: true 
            });
        });
    });
}

// GET statistiche tavoli
function getTablesStats(req, res) {
    const sql = `
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'free' THEN 1 END) as free,
            COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
            COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved,
            COUNT(CASE WHEN status = 'cleaning' THEN 1 END) as cleaning,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active,
            COUNT(CASE WHEN active = 0 THEN 1 END) as inactive,
            SUM(capacity) as total_capacity,
            SUM(CASE WHEN status = 'free' THEN capacity ELSE 0 END) as available_capacity,
            COUNT(DISTINCT location) as locations_count,
            AVG(capacity) as avg_capacity
        FROM tables
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching tables stats:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }
        
        const stats = {
            ...results[0],
            avg_capacity: parseFloat(results[0].avg_capacity) || 0
        };
        
        console.log('✅ Tables stats calculated:', stats);
        res.json({
            success: true,  // ← AGGIUNGI QUESTO
            stats: stats
        });
    });
}

// GET locazioni disponibili
function getLocations(req, res) {
    const sql = `
        SELECT DISTINCT location 
        FROM tables 
        WHERE location IS NOT NULL AND location != ''
        ORDER BY location
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching locations:', err);
            return res.status(500).json({ error: 'Errore nel caricamento locazioni' });
        }
        
        const locations = results.map(row => row.location);
        res.json({ locations });
    });
}

// Funzioni helper
function mapFrontendStatusToDb(frontendStatus) {
    const mapping = {
        'libero': 'free',
        'occupato': 'occupied',
        'riservato': 'reserved',
        'pulizia': 'cleaning',
        'fuori_servizio': 'cleaning' // Mappiamo a cleaning per ora
    };
    return mapping[frontendStatus] || frontendStatus;
}

function mapDbStatusToFrontend(dbStatus) {
    const mapping = {
        'free': 'libero',
        'occupied': 'occupato',
        'reserved': 'riservato',
        'cleaning': 'pulizia'
    };
    return mapping[dbStatus] || dbStatus;
}

function calculateTablesSummary(tables) {
    const total = tables.length;
    const free = tables.filter(t => t.status === 'free').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const reserved = tables.filter(t => t.status === 'reserved').length;
    const cleaning = tables.filter(t => t.status === 'cleaning').length;
    const active = tables.filter(t => t.active).length;
    
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const availableCapacity = tables
        .filter(t => t.status === 'free')
        .reduce((sum, t) => sum + t.capacity, 0);
    
    return {
        total,
        free,
        occupied,
        reserved,
        cleaning,
        active,
        inactive: total - active,
        totalCapacity,
        availableCapacity,
        avgCapacity: total > 0 ? Math.round((totalCapacity / total) * 10) / 10 : 0
    };
}

module.exports = {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    updateTableStatus,
    deleteTable,
    getTablesStats,
    getLocations
};