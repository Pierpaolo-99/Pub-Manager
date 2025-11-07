const connection = require('../database/db');

// GET tutti i movimenti stock
function getAllStockMovements(req, res) {
    const { 
        product_id, 
        type, 
        reference_type, 
        user_id, 
        date_from, 
        date_to,
        limit = 100,
        offset = 0 
    } = req.query;
    
    let sql = `
        SELECT 
            sm.*,
            pv.name as variant_name,
            p.name as product_name,
            p.id as product_id,
            c.name as category_name,
            u.username as user_name,
            CASE 
                WHEN sm.type = 'in' THEN '📥 Entrata'
                WHEN sm.type = 'out' THEN '📤 Uscita'
                WHEN sm.type = 'adjustment' THEN '⚖️ Rettifica'
                ELSE sm.type
            END as type_display
        FROM stock_movements sm
        INNER JOIN product_variants pv ON sm.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (product_id) {
        sql += ` AND p.id = ?`;
        params.push(product_id);
    }
    
    if (type && type !== 'all') {
        sql += ` AND sm.type = ?`;
        params.push(type);
    }
    
    if (reference_type && reference_type !== 'all') {
        sql += ` AND sm.reference_type = ?`;
        params.push(reference_type);
    }
    
    if (user_id) {
        sql += ` AND sm.user_id = ?`;
        params.push(user_id);
    }
    
    if (date_from) {
        sql += ` AND sm.created_at >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND sm.created_at <= ?`;
        params.push(date_to + ' 23:59:59');
    }
    
    sql += ` ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching stock movements:', err);
            return res.status(500).json({ error: 'Errore nel caricamento movimenti' });
        }
        
        // Calcola statistiche
        const stats = calculateMovementStats(results);
        
        res.json({
            movements: results,
            stats,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: results.length
            }
        });
    });
}

// GET statistiche movimenti
function getMovementStats(req, res) {
    const { date_from, date_to } = req.query;
    
    let sql = `
        SELECT 
            COUNT(*) as total_movements,
            COUNT(CASE WHEN type = 'in' THEN 1 END) as entries,
            COUNT(CASE WHEN type = 'out' THEN 1 END) as exits,
            COUNT(CASE WHEN type = 'adjustment' THEN 1 END) as adjustments,
            SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_in,
            SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_out,
            SUM(CASE WHEN type = 'in' THEN total_cost ELSE 0 END) as value_in,
            SUM(CASE WHEN type = 'out' THEN total_cost ELSE 0 END) as value_out,
            COUNT(DISTINCT product_variant_id) as affected_products,
            COUNT(DISTINCT user_id) as active_users
        FROM stock_movements
        WHERE 1=1
    `;
    
    const params = [];
    
    if (date_from) {
        sql += ` AND created_at >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND created_at <= ?`;
        params.push(date_to + ' 23:59:59');
    }
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching movement stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        res.json(results[0]);
    });
}

// POST nuovo movimento
function createStockMovement(req, res) {
    const {
        product_variant_id,
        type, // 'in', 'out', 'adjustment'
        quantity,
        reason,
        reference_id,
        reference_type,
        cost_per_unit,
        notes,
        auto_update_stock = true
    } = req.body;
    
    const user_id = req.user?.id; // Dall'autenticazione
    
    // Validazione
    if (!product_variant_id || !type || !quantity) {
        return res.status(400).json({ 
            error: 'Variante prodotto, tipo e quantità sono obbligatori' 
        });
    }
    
    if (!['in', 'out', 'adjustment'].includes(type)) {
        return res.status(400).json({ 
            error: 'Tipo movimento non valido' 
        });
    }
    
    // Calcola costo totale
    const total_cost = cost_per_unit ? (parseFloat(cost_per_unit) * Math.abs(parseFloat(quantity))) : null;
    
    // Inizia transazione
    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Errore nell\'elaborazione' });
        }
        
        // 1. Inserisci movimento
        const insertMovementSql = `
            INSERT INTO stock_movements (
                product_variant_id, type, quantity, reason, reference_id, 
                reference_type, cost_per_unit, total_cost, notes, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const movementParams = [
            product_variant_id,
            type,
            quantity,
            reason || null,
            reference_id || null,
            reference_type || 'manual',
            cost_per_unit || null,
            total_cost || null,
            notes || null,
            user_id || null
        ];
        
        connection.query(insertMovementSql, movementParams, (err, movementResult) => {
            if (err) {
                console.error('Error inserting movement:', err);
                return connection.rollback(() => {
                    res.status(500).json({ error: 'Errore nella creazione movimento' });
                });
            }
            
            const movementId = movementResult.insertId;
            
            // 2. Aggiorna stock se richiesto
            if (auto_update_stock) {
                updateStockFromMovement(product_variant_id, type, quantity, (stockErr) => {
                    if (stockErr) {
                        console.error('Error updating stock:', stockErr);
                        return connection.rollback(() => {
                            res.status(500).json({ error: 'Errore nell\'aggiornamento stock' });
                        });
                    }
                    
                    // Commit transazione
                    connection.commit((commitErr) => {
                        if (commitErr) {
                            console.error('Error committing transaction:', commitErr);
                            return connection.rollback(() => {
                                res.status(500).json({ error: 'Errore nel salvataggio' });
                            });
                        }
                        
                        res.status(201).json({
                            id: movementId,
                            message: 'Movimento creato con successo',
                            stock_updated: true
                        });
                    });
                });
            } else {
                // Commit senza aggiornare stock
                connection.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Error committing transaction:', commitErr);
                        return connection.rollback(() => {
                            res.status(500).json({ error: 'Errore nel salvataggio' });
                        });
                    }
                    
                    res.status(201).json({
                        id: movementId,
                        message: 'Movimento creato con successo',
                        stock_updated: false
                    });
                });
            }
        });
    });
}

// PUT aggiornamento movimento
function updateStockMovement(req, res) {
    const { id } = req.params;
    const { reason, notes } = req.body;
    
    // Solo alcuni campi sono modificabili dopo la creazione
    const sql = `
        UPDATE stock_movements 
        SET reason = ?, notes = ?
        WHERE id = ?
    `;
    
    connection.query(sql, [reason, notes, id], (err, result) => {
        if (err) {
            console.error('Error updating movement:', err);
            return res.status(500).json({ error: 'Errore nell\'aggiornamento movimento' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Movimento non trovato' });
        }
        
        res.json({ message: 'Movimento aggiornato con successo' });
    });
}

// DELETE movimento (solo admin)
function deleteStockMovement(req, res) {
    const { id } = req.params;
    const { revert_stock = false } = req.body;
    
    if (revert_stock) {
        // Implementa logica per revertire il movimento sullo stock
        // Questo è complesso e richiede attenzione per evitare inconsistenze
        return res.status(501).json({ 
            error: 'Funzionalità di revert non implementata per sicurezza' 
        });
    }
    
    const sql = 'DELETE FROM stock_movements WHERE id = ?';
    
    connection.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting movement:', err);
            return res.status(500).json({ error: 'Errore nella cancellazione movimento' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Movimento non trovato' });
        }
        
        res.json({ message: 'Movimento cancellato con successo' });
    });
}

// GET movimenti per prodotto specifico
function getProductMovements(req, res) {
    const { productId } = req.params;
    const { limit = 50 } = req.query;
    
    const sql = `
        SELECT 
            sm.*,
            pv.name as variant_name,
            u.username as user_name,
            CASE 
                WHEN sm.type = 'in' THEN '📥 Entrata'
                WHEN sm.type = 'out' THEN '📤 Uscita'
                WHEN sm.type = 'adjustment' THEN '⚖️ Rettifica'
                ELSE sm.type
            END as type_display
        FROM stock_movements sm
        INNER JOIN product_variants pv ON sm.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE p.id = ?
        ORDER BY sm.created_at DESC
        LIMIT ?
    `;
    
    connection.query(sql, [productId, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Error fetching product movements:', err);
            return res.status(500).json({ error: 'Errore nel caricamento movimenti prodotto' });
        }
        
        res.json({ movements: results });
    });
}

// GET prodotti per dropdown
function getProductsForMovements(req, res) {
    const sql = `
        SELECT 
            p.id as product_id,
            p.name as product_name,
            pv.id as variant_id,
            pv.name as variant_name,
            c.name as category_name,
            COALESCE(s.quantity, 0) as current_stock,
            s.unit
        FROM products p
        INNER JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE p.is_available = 1 AND pv.is_active = 1
        ORDER BY p.name, pv.name
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ error: 'Errore nel caricamento prodotti' });
        }
        
        res.json({ products: results });
    });
}

// Funzione helper per aggiornare stock da movimento
function updateStockFromMovement(product_variant_id, type, quantity, callback) {
    // Determina il cambio di quantità
    let quantityChange = parseFloat(quantity);
    if (type === 'out') {
        quantityChange = -Math.abs(quantityChange);
    } else if (type === 'in') {
        quantityChange = Math.abs(quantityChange);
    }
    // Per 'adjustment' usiamo la quantità così com'è (può essere positiva o negativa)
    
    // Aggiorna o inserisci record stock
    const upsertStockSql = `
        INSERT INTO stock (product_variant_id, quantity, updated_at) 
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
        quantity = GREATEST(0, quantity + ?),
        updated_at = NOW()
    `;
    
    connection.query(upsertStockSql, [product_variant_id, Math.max(0, quantityChange), quantityChange], callback);
}

// Funzione helper per statistiche
function calculateMovementStats(movements) {
    const today = new Date().toISOString().slice(0, 10);
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    const todayMovements = movements.filter(m => m.created_at.toISOString().slice(0, 10) === today);
    const weekMovements = movements.filter(m => m.created_at.toISOString().slice(0, 10) >= thisWeek);
    
    return {
        total: movements.length,
        today: todayMovements.length,
        this_week: weekMovements.length,
        entries: movements.filter(m => m.type === 'in').length,
        exits: movements.filter(m => m.type === 'out').length,
        adjustments: movements.filter(m => m.type === 'adjustment').length,
        total_value_in: movements
            .filter(m => m.type === 'in')
            .reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0),
        total_value_out: movements
            .filter(m => m.type === 'out')
            .reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0),
        unique_products: new Set(movements.map(m => m.product_variant_id)).size
    };
}

module.exports = {
    getAllStockMovements,
    getMovementStats,
    createStockMovement,
    updateStockMovement,
    deleteStockMovement,
    getProductMovements,
    getProductsForMovements
};