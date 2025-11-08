const connection = require('../database/db');

// GET tutti i movimenti con filtri
async function getAllMovements(req, res) {
    console.log('📈 getAllMovements chiamata');
    try {
        const {
            type,
            reference_type,
            search,
            date_from,
            date_to,
            product_id,
            limit = 100,
            offset = 0
        } = req.query;

        let sql = `
            SELECT 
                sm.id,
                sm.product_variant_id,
                sm.type,
                sm.quantity,
                sm.reason,
                sm.reference_id,
                sm.reference_type,
                sm.cost_per_unit,
                sm.total_cost,
                sm.notes,
                sm.user_id,
                sm.created_at,
                pv.name as variant_name,
                p.name as product_name,
                p.id as product_id,
                c.name as category_name,
                u.username as user_name
            FROM stock_movements sm
            INNER JOIN product_variants pv ON sm.product_variant_id = pv.id
            INNER JOIN products p ON pv.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON sm.user_id = u.id
            WHERE 1=1
        `;

        const params = [];

        // Filtri
        if (type && type !== 'all') {
            sql += ` AND sm.type = ?`;
            params.push(type);
        }

        if (reference_type && reference_type !== 'all') {
            sql += ` AND sm.reference_type = ?`;
            params.push(reference_type);
        }

        if (search) {
            sql += ` AND (p.name LIKE ? OR pv.name LIKE ? OR sm.reason LIKE ? OR sm.notes LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (product_id && product_id !== 'all') {
            sql += ` AND p.id = ?`;
            params.push(product_id);
        }

        if (date_from) {
            sql += ` AND DATE(sm.created_at) >= ?`;
            params.push(date_from);
        }

        if (date_to) {
            sql += ` AND DATE(sm.created_at) <= ?`;
            params.push(date_to);
        }

        sql += ` ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const movements = await new Promise((resolve, reject) => {
            connection.query(sql, params, (err, results) => {
                if (err) {
                    console.error('❌ Error in getAllMovements:', err);
                    reject(err);
                } else {
                    resolve(results || []);
                }
            });
        });

        console.log(`✅ Caricati ${movements.length} movimenti`);
        res.json({ movements });

    } catch (error) {
        console.error('❌ Error in getAllMovements:', error);
        res.status(500).json({ 
            error: 'Errore nel caricamento movimenti',
            message: error.message 
        });
    }
}

// GET prodotti per filtro dropdown
function getProductsForMovements(req, res) {
    const sql = `
        SELECT DISTINCT
            p.id,
            p.name as product_name,
            pv.id as variant_id,
            pv.name as variant_name,
            CONCAT(p.name, ' - ', pv.name) as display_name,
            s.quantity as current_stock,
            s.cost_per_unit
        FROM products p
        INNER JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE p.active = 1 AND pv.active = 1
        ORDER BY p.name, pv.name
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching products for movements:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento prodotti',
                details: err.message 
            });
        }

        console.log(`✅ Caricati ${results.length} prodotti per movimenti`);
        res.json({ products: results || [] });
    });
}

// GET statistiche movimenti
function getMovementsStats(req, res) {
    const { date_from, date_to, type, reference_type } = req.query;
    
    let sql = `
        SELECT 
            COUNT(*) as total_movements,
            COUNT(CASE WHEN type = 'in' THEN 1 END) as inbound_movements,
            COUNT(CASE WHEN type = 'out' THEN 1 END) as outbound_movements,
            COUNT(CASE WHEN type = 'adjustment' THEN 1 END) as adjustment_movements,
            COUNT(CASE WHEN reference_type = 'order' THEN 1 END) as order_movements,
            COUNT(CASE WHEN reference_type = 'manual' THEN 1 END) as manual_movements,
            COUNT(CASE WHEN reference_type = 'supplier' THEN 1 END) as supplier_movements,
            COALESCE(SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END), 0) as total_inbound,
            COALESCE(SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END), 0) as total_outbound,
            COALESCE(SUM(CASE WHEN type = 'in' THEN total_cost ELSE 0 END), 0) as total_inbound_value,
            COALESCE(SUM(CASE WHEN type = 'out' THEN total_cost ELSE 0 END), 0) as total_outbound_value
        FROM stock_movements sm
        WHERE 1=1
    `;

    const params = [];

    if (date_from) {
        sql += ` AND DATE(sm.created_at) >= ?`;
        params.push(date_from);
    }

    if (date_to) {
        sql += ` AND DATE(sm.created_at) <= ?`;
        params.push(date_to);
    }

    if (type && type !== 'all') {
        sql += ` AND sm.type = ?`;
        params.push(type);
    }

    if (reference_type && reference_type !== 'all') {
        sql += ` AND sm.reference_type = ?`;
        params.push(reference_type);
    }

    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching movements stats:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }

        const stats = results[0] || {};
        
        // Assicurati che tutti i valori siano numerici
        Object.keys(stats).forEach(key => {
            if (stats[key] === null || stats[key] === undefined) {
                stats[key] = 0;
            } else if (typeof stats[key] === 'string') {
                stats[key] = parseFloat(stats[key]) || 0;
            }
        });

        console.log('✅ Stats movimenti:', stats);
        res.json(stats);
    });
}

// POST nuovo movimento
function createMovement(req, res) {
    const {
        product_variant_id,
        type,
        quantity,
        reason,
        reference_id,
        reference_type = 'manual',
        cost_per_unit,
        notes
    } = req.body;

    // Validazione
    if (!product_variant_id || !type || !quantity) {
        return res.status(400).json({ 
            error: 'Prodotto, tipo e quantità sono obbligatori' 
        });
    }

    if (!['in', 'out', 'adjustment'].includes(type)) {
        return res.status(400).json({ error: 'Tipo movimento non valido' });
    }

    if (!['order', 'manual', 'supplier'].includes(reference_type)) {
        return res.status(400).json({ error: 'Tipo riferimento non valido' });
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
        return res.status(400).json({ error: 'Quantità deve essere positiva' });
    }

    const numCostPerUnit = cost_per_unit ? parseFloat(cost_per_unit) : 0;
    const totalCost = numQuantity * numCostPerUnit;

    // Inizia transazione
    connection.beginTransaction((err) => {
        if (err) {
            console.error('❌ Error starting transaction:', err);
            return res.status(500).json({ error: 'Errore database' });
        }

        // Inserisci movimento
        const insertSql = `
            INSERT INTO stock_movements (
                product_variant_id, type, quantity, reason, reference_id, 
                reference_type, cost_per_unit, total_cost, notes, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertParams = [
            product_variant_id,
            type,
            numQuantity,
            reason || null,
            reference_id || null,
            reference_type,
            numCostPerUnit || null,
            totalCost || null,
            notes || null,
            req.user?.id || 1 // Fallback al primo utente se sessione non funziona
        ];

        connection.query(insertSql, insertParams, (err, result) => {
            if (err) {
                console.error('❌ Error inserting movement:', err);
                return connection.rollback(() => {
                    res.status(500).json({ 
                        error: 'Errore nella creazione movimento',
                        details: err.message 
                    });
                });
            }

            const movementId = result.insertId;

            // Aggiorna stock se esiste
            const updateStockSql = `
                UPDATE stock 
                SET 
                    quantity = quantity + (CASE WHEN ? = 'in' THEN ? WHEN ? = 'out' THEN -? ELSE 0 END),
                    cost_per_unit = COALESCE(?, cost_per_unit),
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_variant_id = ?
            `;

            connection.query(updateStockSql, [
                type, numQuantity, type, numQuantity, 
                numCostPerUnit > 0 ? numCostPerUnit : null,
                product_variant_id
            ], (err2, updateResult) => {
                if (err2) {
                    console.error('❌ Error updating stock:', err2);
                    return connection.rollback(() => {
                        res.status(500).json({ 
                            error: 'Errore aggiornamento stock',
                            details: err2.message 
                        });
                    });
                }

                // Se non c'è stock record esistente e il movimento è 'in', crealo
                if (updateResult.affectedRows === 0 && type === 'in') {
                    const insertStockSql = `
                        INSERT INTO stock (
                            product_variant_id, quantity, cost_per_unit, unit, 
                            min_threshold, max_threshold, supplier_id
                        ) VALUES (?, ?, ?, 'pcs', 10, 100, NULL)
                    `;

                    connection.query(insertStockSql, [
                        product_variant_id, 
                        numQuantity, 
                        numCostPerUnit || 0
                    ], (err3) => {
                        if (err3) {
                            console.error('❌ Error creating stock record:', err3);
                            return connection.rollback(() => {
                                res.status(500).json({ 
                                    error: 'Errore creazione stock',
                                    details: err3.message 
                                });
                            });
                        }

                        // Commit transazione
                        connection.commit((err4) => {
                            if (err4) {
                                console.error('❌ Error committing transaction:', err4);
                                return connection.rollback(() => {
                                    res.status(500).json({ error: 'Errore commit' });
                                });
                            }

                            console.log(`✅ Created movement ${movementId} with new stock record`);
                            res.status(201).json({
                                id: movementId,
                                message: 'Movimento creato con successo'
                            });
                        });
                    });
                } else {
                    // Commit transazione
                    connection.commit((err4) => {
                        if (err4) {
                            console.error('❌ Error committing transaction:', err4);
                            return connection.rollback(() => {
                                res.status(500).json({ error: 'Errore commit' });
                            });
                        }

                        console.log(`✅ Created movement ${movementId}`);
                        res.status(201).json({
                            id: movementId,
                            message: 'Movimento creato con successo'
                        });
                    });
                }
            });
        });
    });
}

// PUT aggiornamento movimento (solo note e motivo)
function updateMovement(req, res) {
    const { id } = req.params;
    const { reason, notes } = req.body;

    const sql = `
        UPDATE stock_movements 
        SET reason = ?, notes = ? 
        WHERE id = ?
    `;

    connection.query(sql, [reason || null, notes || null, id], (err, result) => {
        if (err) {
            console.error('❌ Error updating movement:', err);
            return res.status(500).json({ 
                error: 'Errore aggiornamento movimento',
                details: err.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Movimento non trovato' });
        }

        console.log(`✅ Updated movement ${id}`);
        res.json({ message: 'Movimento aggiornato con successo' });
    });
}

// DELETE movimento
function deleteMovement(req, res) {
    const { id } = req.params;

    // Prima ottieni i dettagli del movimento
    const getMovementSql = `
        SELECT product_variant_id, type, quantity 
        FROM stock_movements 
        WHERE id = ?
    `;

    connection.query(getMovementSql, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching movement:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento movimento',
                details: err.message 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Movimento non trovato' });
        }

        const movement = results[0];

        // Inizia transazione per eliminare e aggiornare stock
        connection.beginTransaction((err) => {
            if (err) {
                console.error('❌ Error starting transaction:', err);
                return res.status(500).json({ error: 'Errore database' });
            }

            // Elimina movimento
            const deleteSql = 'DELETE FROM stock_movements WHERE id = ?';

            connection.query(deleteSql, [id], (err, result) => {
                if (err) {
                    console.error('❌ Error deleting movement:', err);
                    return connection.rollback(() => {
                        res.status(500).json({ 
                            error: 'Errore eliminazione movimento',
                            details: err.message 
                        });
                    });
                }

                // Inverti l'effetto sul stock
                const reverseStockSql = `
                    UPDATE stock 
                    SET quantity = quantity - (CASE 
                        WHEN ? = 'in' THEN ? 
                        WHEN ? = 'out' THEN -? 
                        ELSE 0 
                    END),
                    updated_at = CURRENT_TIMESTAMP
                    WHERE product_variant_id = ?
                `;

                connection.query(reverseStockSql, [
                    movement.type, movement.quantity,
                    movement.type, movement.quantity,
                    movement.product_variant_id
                ], (err2) => {
                    if (err2) {
                        console.error('❌ Error reversing stock:', err2);
                        return connection.rollback(() => {
                            res.status(500).json({ 
                                error: 'Errore aggiornamento stock',
                                details: err2.message 
                            });
                        });
                    }

                    // Commit transazione
                    connection.commit((err3) => {
                        if (err3) {
                            console.error('❌ Error committing transaction:', err3);
                            return connection.rollback(() => {
                                res.status(500).json({ error: 'Errore commit' });
                            });
                        }

                        console.log(`✅ Deleted movement ${id} and updated stock`);
                        res.json({ message: 'Movimento eliminato con successo' });
                    });
                });
            });
        });
    });
}

module.exports = {
    getAllMovements,
    getProductsForMovements,
    getMovementsStats,
    createMovement,
    updateMovement,
    deleteMovement
};