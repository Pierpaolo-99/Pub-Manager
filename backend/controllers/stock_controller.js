const connection = require('../database/db');

// GET tutto lo stock prodotti
function getAllStock(req, res) {
    const { search, status, supplier, low_stock = false } = req.query;
    
    console.log('📦 Fetching stock with filters:', { search, status, supplier, low_stock });
    
    let sql = `
        SELECT 
            s.*,
            pv.name as variant_name,
            pv.price as variant_price,
            pv.sku as variant_sku,
            p.name as product_name,
            p.id as product_id,
            COALESCE(c.name, 'Nessuna categoria') as category_name,
            c.color as category_color,
            CASE 
                WHEN s.quantity <= 0 THEN 'out_of_stock'
                WHEN s.quantity <= s.min_threshold THEN 'critical'
                WHEN s.quantity <= (s.min_threshold * 1.5) THEN 'low'
                WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= CURDATE() THEN 'expired'
                WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'expiring'
                WHEN s.max_threshold IS NOT NULL AND s.quantity >= s.max_threshold THEN 'overstocked'
                ELSE 'ok'
            END as stock_status,
            CASE 
                WHEN s.expiry_date IS NOT NULL 
                THEN DATEDIFF(s.expiry_date, CURDATE()) 
                ELSE NULL 
            END as days_to_expiry,
            (s.quantity * s.cost_per_unit) as total_value
        FROM stock s
        INNER JOIN product_variants pv ON s.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (search) {
        sql += ` AND (p.name LIKE ? OR pv.name LIKE ? OR pv.sku LIKE ? OR s.supplier LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (supplier) {
        sql += ` AND s.supplier = ?`;
        params.push(supplier);
    }
    
    if (low_stock === 'true') {
        sql += ` AND s.quantity <= s.min_threshold`;
    }
    
    // Filtro per status
    if (status && status !== 'all') {
        const statusConditions = {
            'critical': 's.quantity <= s.min_threshold AND s.quantity > 0',
            'out_of_stock': 's.quantity <= 0',
            'expiring': 's.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)',
            'expired': 's.expiry_date IS NOT NULL AND s.expiry_date <= CURDATE()',
            'overstocked': 's.max_threshold IS NOT NULL AND s.quantity >= s.max_threshold',
            'ok': 's.quantity > s.min_threshold AND (s.expiry_date IS NULL OR s.expiry_date > DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AND (s.max_threshold IS NULL OR s.quantity < s.max_threshold)'
        };
        
        if (statusConditions[status]) {
            sql += ` AND (${statusConditions[status]})`;
        }
    }
    
    // Ordinamento per priorità
    sql += ` ORDER BY 
        CASE 
            WHEN s.quantity <= 0 THEN 1
            WHEN s.quantity <= s.min_threshold THEN 2
            WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= CURDATE() THEN 3
            WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 4
            ELSE 5
        END,
        s.expiry_date ASC,
        p.name ASC,
        pv.name ASC
    `;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching stock:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento stock',
                details: err.message 
            });
        }
        
        // Converti valori numerici
        const stockData = results.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            min_threshold: parseFloat(item.min_threshold) || 0,
            max_threshold: item.max_threshold ? parseFloat(item.max_threshold) : null,
            cost_per_unit: parseFloat(item.cost_per_unit) || 0,
            total_value: parseFloat(item.total_value) || 0,
            variant_price: parseFloat(item.variant_price) || 0
        }));
        
        console.log(`✅ Found ${stockData.length} stock items`);
        
        res.json({
            success: true,
            stock: stockData,
            summary: calculateStockSummary(stockData),
            filters: {
                search: search || null,
                status: status || 'all',
                supplier: supplier || null,
                low_stock: low_stock === 'true'
            }
        });
    });
}

// GET statistiche stock
function getStockStats(req, res) {
    console.log('📊 Getting stock statistics');
    
    const sql = `
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN s.quantity <= 0 THEN 1 END) as out_of_stock,
            COUNT(CASE WHEN s.quantity <= s.min_threshold AND s.quantity > 0 THEN 1 END) as critical,
            COUNT(CASE WHEN s.quantity > s.min_threshold THEN 1 END) as ok,
            COUNT(CASE WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= CURDATE() THEN 1 END) as expired,
            COUNT(CASE WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND s.expiry_date > CURDATE() THEN 1 END) as expiring_soon,
            COUNT(CASE WHEN s.max_threshold IS NOT NULL AND s.quantity >= s.max_threshold THEN 1 END) as overstocked,
            COALESCE(SUM(s.quantity * s.cost_per_unit), 0) as total_value,
            COUNT(DISTINCT s.supplier) as suppliers_count,
            COALESCE(AVG(s.quantity), 0) as avg_quantity,
            COALESCE(AVG(s.cost_per_unit), 0) as avg_cost_per_unit
        FROM stock s
        INNER JOIN product_variants pv ON s.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        WHERE p.active = 1
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching stock stats:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }
        
        const stats = results[0];
        
        // Converti valori numerici
        Object.keys(stats).forEach(key => {
            if (stats[key] !== null && !isNaN(stats[key])) {
                stats[key] = parseFloat(stats[key]);
            }
        });
        
        console.log('✅ Stock stats calculated:', stats);
        res.json({
            success: true,
            stats: stats
        });
    });
}

// POST nuovo stock entry
function createStockEntry(req, res) {
    const {
        product_variant_id,
        quantity,
        unit = 'pcs',
        min_threshold = 0,
        max_threshold = null,
        cost_per_unit = 0,
        supplier = null,
        expiry_date = null,
        notes = null
    } = req.body;
    
    console.log('➕ Creating new stock entry:', {
        product_variant_id, quantity, unit, supplier
    });
    
    // Validazione
    if (!product_variant_id || quantity === undefined || quantity === null) {
        return res.status(400).json({ 
            success: false,
            error: 'Variante prodotto e quantità sono obbligatori' 
        });
    }
    
    if (quantity < 0) {
        return res.status(400).json({ 
            success: false,
            error: 'La quantità non può essere negativa' 
        });
    }
    
    // Verifica se la variante esiste
    const checkVariantSql = `
        SELECT pv.id, pv.name, p.name as product_name 
        FROM product_variants pv 
        INNER JOIN products p ON pv.product_id = p.id 
        WHERE pv.id = ?
    `;
    
    connection.query(checkVariantSql, [product_variant_id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking variant:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica variante',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Variante prodotto non trovata' 
            });
        }
        
        // Verifica se esiste già stock per questa variante
        const checkStockSql = 'SELECT id FROM stock WHERE product_variant_id = ?';
        connection.query(checkStockSql, [product_variant_id], (stockCheckErr, stockCheckResults) => {
            if (stockCheckErr) {
                console.error('❌ Error checking existing stock:', stockCheckErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nella verifica stock esistente',
                    details: stockCheckErr.message 
                });
            }
            
            if (stockCheckResults.length > 0) {
                return res.status(409).json({ 
                    success: false,
                    error: 'Stock già esistente per questa variante. Usa l\'aggiornamento invece.'
                });
            }
            
            // Inserisci nuovo stock
            const insertSql = `
                INSERT INTO stock (
                    product_variant_id, quantity, unit, min_threshold, max_threshold,
                    cost_per_unit, supplier, last_restock_date, expiry_date, notes, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, NOW())
            `;
            
            const insertParams = [
                product_variant_id,
                parseFloat(quantity),
                unit,
                parseFloat(min_threshold),
                max_threshold ? parseFloat(max_threshold) : null,
                parseFloat(cost_per_unit),
                supplier,
                expiry_date,
                notes
            ];
            
            connection.query(insertSql, insertParams, (insertErr, result) => {
                if (insertErr) {
                    console.error('❌ Error creating stock entry:', insertErr);
                    return res.status(500).json({ 
                        success: false,
                        error: 'Errore nella creazione stock',
                        details: insertErr.message 
                    });
                }
                
                console.log('✅ Stock entry created successfully with ID:', result.insertId);
                res.status(201).json({
                    success: true,
                    message: 'Stock creato con successo',
                    stock: {
                        id: result.insertId,
                        product_variant_id,
                        quantity: parseFloat(quantity),
                        unit,
                        min_threshold: parseFloat(min_threshold),
                        max_threshold: max_threshold ? parseFloat(max_threshold) : null,
                        cost_per_unit: parseFloat(cost_per_unit),
                        supplier,
                        expiry_date,
                        notes
                    }
                });
            });
        });
    });
}

// PUT aggiornamento stock completo
function updateStockEntry(req, res) {
    const { id } = req.params;
    const {
        quantity,
        unit,
        min_threshold,
        max_threshold,
        cost_per_unit,
        supplier,
        expiry_date,
        notes
    } = req.body;
    
    console.log('✏️ Updating stock entry:', id, req.body);
    
    // Verifica stock esistente
    const checkSql = 'SELECT * FROM stock WHERE id = ?';
    connection.query(checkSql, [id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking stock:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica stock',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Stock non trovato' 
            });
        }
        
        // Costruisci query di aggiornamento dinamica
        const updates = [];
        const values = [];
        
        if (quantity !== undefined) {
            if (quantity < 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'La quantità non può essere negativa' 
                });
            }
            updates.push('quantity = ?');
            values.push(parseFloat(quantity));
        }
        
        if (unit !== undefined) {
            updates.push('unit = ?');
            values.push(unit);
        }
        
        if (min_threshold !== undefined) {
            updates.push('min_threshold = ?');
            values.push(parseFloat(min_threshold) || 0);
        }
        
        if (max_threshold !== undefined) {
            updates.push('max_threshold = ?');
            values.push(max_threshold ? parseFloat(max_threshold) : null);
        }
        
        if (cost_per_unit !== undefined) {
            updates.push('cost_per_unit = ?');
            values.push(parseFloat(cost_per_unit) || 0);
        }
        
        if (supplier !== undefined) {
            updates.push('supplier = ?');
            values.push(supplier);
        }
        
        if (expiry_date !== undefined) {
            updates.push('expiry_date = ?');
            values.push(expiry_date);
        }
        
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Nessun campo da aggiornare' 
            });
        }
        
        updates.push('updated_at = NOW()');
        values.push(id);
        
        const updateSql = `UPDATE stock SET ${updates.join(', ')} WHERE id = ?`;
        
        connection.query(updateSql, values, (updateErr, result) => {
            if (updateErr) {
                console.error('❌ Error updating stock:', updateErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nell\'aggiornamento stock',
                    details: updateErr.message 
                });
            }
            
            console.log('✅ Stock updated successfully');
            res.json({ 
                success: true,
                message: 'Stock aggiornato con successo',
                affectedRows: result.affectedRows
            });
        });
    });
}

// PATCH aggiornamento rapido quantità
function updateStockQuantity(req, res) {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body; // 'set', 'add', 'subtract'
    
    console.log('🔄 Updating stock quantity:', { id, quantity, operation });
    
    if (quantity === undefined || quantity === null) {
        return res.status(400).json({ 
            success: false,
            error: 'Quantità obbligatoria' 
        });
    }
    
    let sql;
    let params;
    
    if (operation === 'add') {
        sql = 'UPDATE stock SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?';
        params = [parseFloat(quantity), id];
    } else if (operation === 'subtract') {
        sql = 'UPDATE stock SET quantity = GREATEST(0, quantity - ?), updated_at = NOW() WHERE id = ?';
        params = [parseFloat(quantity), id];
    } else {
        sql = 'UPDATE stock SET quantity = ?, updated_at = NOW() WHERE id = ?';
        params = [parseFloat(quantity), id];
    }
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('❌ Error updating stock quantity:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nell\'aggiornamento quantità',
                details: err.message 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Stock non trovato' 
            });
        }
        
        console.log('✅ Stock quantity updated successfully');
        res.json({ 
            success: true,
            message: 'Quantità aggiornata con successo' 
        });
    });
}

// DELETE rimozione stock
function deleteStockEntry(req, res) {
    const { id } = req.params;
    
    console.log('🗑️ Deleting stock entry:', id);
    
    // Verifica stock esistente
    const checkSql = 'SELECT * FROM stock WHERE id = ?';
    connection.query(checkSql, [id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking stock:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica stock',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Stock non trovato' 
            });
        }
        
        const deleteSql = 'DELETE FROM stock WHERE id = ?';
        connection.query(deleteSql, [id], (deleteErr, result) => {
            if (deleteErr) {
                console.error('❌ Error deleting stock:', deleteErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nella rimozione stock',
                    details: deleteErr.message 
                });
            }
            
            console.log('✅ Stock deleted successfully');
            res.json({ 
                success: true,
                message: 'Stock rimosso con successo' 
            });
        });
    });
}

// GET fornitori disponibili
function getStockSuppliers(req, res) {
    console.log('🚚 Getting stock suppliers');
    
    const sql = `
        SELECT 
            supplier,
            COUNT(*) as products_count,
            SUM(quantity) as total_quantity,
            SUM(quantity * cost_per_unit) as total_value
        FROM stock 
        WHERE supplier IS NOT NULL AND supplier != ''
        GROUP BY supplier
        ORDER BY supplier
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching suppliers:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento fornitori',
                details: err.message 
            });
        }
        
        console.log(`✅ Found ${results.length} suppliers`);
        res.json({
            success: true,
            suppliers: results
        });
    });
}

// GET prodotti/varianti disponibili per stock
function getAvailableVariants(req, res) {
    console.log('🏷️ Getting available variants for stock');
    
    const sql = `
        SELECT 
            pv.id,
            pv.name as variant_name,
            pv.price,
            pv.sku,
            p.id as product_id,
            p.name as product_name,
            COALESCE(c.name, 'Nessuna categoria') as category_name,
            CASE 
                WHEN s.id IS NOT NULL THEN true 
                ELSE false 
            END as has_stock
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE p.active = 1 AND pv.active = 1
        ORDER BY p.name, pv.name
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching available variants:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento varianti',
                details: err.message 
            });
        }
        
        console.log(`✅ Found ${results.length} available variants`);
        res.json({
            success: true,
            variants: results
        });
    });
}

// Funzione helper per calcolare summary
function calculateStockSummary(stock) {
    const total = stock.length;
    const critical = stock.filter(s => s.stock_status === 'critical').length;
    const outOfStock = stock.filter(s => s.stock_status === 'out_of_stock').length;
    const expired = stock.filter(s => s.stock_status === 'expired').length;
    const expiring = stock.filter(s => s.stock_status === 'expiring').length;
    const overstocked = stock.filter(s => s.stock_status === 'overstocked').length;
    const low = stock.filter(s => s.stock_status === 'low').length;
    
    const totalValue = stock.reduce((sum, item) => {
        return sum + (parseFloat(item.total_value) || 0);
    }, 0);
    
    return {
        total,
        critical,
        outOfStock,
        expired,
        expiring,
        overstocked,
        low,
        ok: total - critical - outOfStock - expired - expiring - overstocked - low,
        totalValue: parseFloat(totalValue.toFixed(2))
    };
}

module.exports = {
    getAllStock,
    getStockStats,
    createStockEntry,
    updateStockEntry,
    updateStockQuantity,
    deleteStockEntry,
    getStockSuppliers,
    getAvailableVariants
};
