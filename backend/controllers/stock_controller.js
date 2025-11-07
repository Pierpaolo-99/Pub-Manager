const connection = require('../database/db');

/////////////////////////
// STOCK PRODOTTI (NUOVA SEZIONE)
/////////////////////////

// GET tutto lo stock prodotti
function getAllStock(req, res) {
    const { search, status, supplier, low_stock = false } = req.query;
    
    let sql = `
        SELECT 
            s.*,
            pv.name as variant_name,
            pv.price as variant_price,
            p.name as product_name,
            p.id as product_id,
            c.name as category_name,
            CASE 
                WHEN s.quantity <= 0 THEN 'out_of_stock'
                WHEN s.quantity <= s.min_threshold THEN 'critical'
                WHEN s.quantity <= (s.min_threshold * 1.5) THEN 'low'
                WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= CURDATE() THEN 'expired'
                WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'expiring'
                WHEN s.max_threshold IS NOT NULL AND s.quantity >= s.max_threshold THEN 'overstocked'
                ELSE 'ok'
            END as stock_status,
            DATEDIFF(s.expiry_date, CURDATE()) as days_to_expiry,
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
        sql += ` AND (p.name LIKE ? OR pv.name LIKE ? OR s.supplier LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
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
            'ok': 's.quantity > s.min_threshold AND (s.expiry_date IS NULL OR s.expiry_date > DATE_ADD(CURDATE(), INTERVAL 7 DAY))'
        };
        
        if (statusConditions[status]) {
            sql += ` AND (${statusConditions[status]})`;
        }
    }
    
    sql += ` ORDER BY 
        CASE 
            WHEN s.quantity <= 0 THEN 1
            WHEN s.quantity <= s.min_threshold THEN 2
            WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= CURDATE() THEN 3
            WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 4
            ELSE 5
        END,
        s.expiry_date ASC,
        p.name ASC
    `;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching stock:', err);
            return res.status(500).json({ error: 'Errore nel caricamento stock' });
        }
        
        res.json({
            stock: results,
            summary: calculateStockSummary(results)
        });
    });
}

// GET statistiche stock
function getStockStats(req, res) {
    const sql = `
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN s.quantity <= 0 THEN 1 END) as out_of_stock,
            COUNT(CASE WHEN s.quantity <= s.min_threshold AND s.quantity > 0 THEN 1 END) as critical,
            COUNT(CASE WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= CURDATE() THEN 1 END) as expired,
            COUNT(CASE WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND s.expiry_date > CURDATE() THEN 1 END) as expiring_soon,
            SUM(s.quantity * s.cost_per_unit) as total_value,
            COUNT(DISTINCT s.supplier) as suppliers_count,
            AVG(s.quantity) as avg_quantity
        FROM stock s
        INNER JOIN product_variants pv ON s.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        WHERE p.is_available = 1
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching stock stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        res.json(results[0]);
    });
}

// POST nuovo stock entry
function createStockEntry(req, res) {
    const {
        product_variant_id,
        quantity,
        unit,
        min_threshold,
        max_threshold,
        cost_per_unit,
        supplier,
        expiry_date,
        notes
    } = req.body;
    
    // Validazione
    if (!product_variant_id || !quantity) {
        return res.status(400).json({ 
            error: 'Variante prodotto e quantità sono obbligatori' 
        });
    }
    
    const sql = `
        INSERT INTO stock (
            product_variant_id, quantity, unit, min_threshold, max_threshold,
            cost_per_unit, supplier, last_restock_date, expiry_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `;
    
    const params = [
        product_variant_id,
        quantity,
        unit || 'pcs',
        min_threshold || 0,
        max_threshold || null,
        cost_per_unit || 0,
        supplier || null,
        expiry_date || null,
        notes || null
    ];
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error creating stock entry:', err);
            return res.status(500).json({ error: 'Errore nella creazione stock' });
        }
        
        res.status(201).json({
            id: result.insertId,
            message: 'Stock creato con successo'
        });
    });
}

// PUT aggiornamento stock
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
    
    const sql = `
        UPDATE stock 
        SET 
            quantity = ?,
            unit = ?,
            min_threshold = ?,
            max_threshold = ?,
            cost_per_unit = ?,
            supplier = ?,
            expiry_date = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        quantity,
        unit || 'pcs',
        min_threshold || 0,
        max_threshold || null,
        cost_per_unit || 0,
        supplier || null,
        expiry_date || null,
        notes || null,
        id
    ];
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating stock:', err);
            return res.status(500).json({ error: 'Errore nell\'aggiornamento stock' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Stock non trovato' });
        }
        
        res.json({ message: 'Stock aggiornato con successo' });
    });
}

// PATCH aggiornamento rapido quantità
function updateStockQuantity(req, res) {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body; // 'set', 'add', 'subtract'
    
    let sql;
    let params;
    
    if (operation === 'add') {
        sql = 'UPDATE stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params = [quantity, id];
    } else if (operation === 'subtract') {
        sql = 'UPDATE stock SET quantity = GREATEST(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params = [quantity, id];
    } else {
        sql = 'UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params = [quantity, id];
    }
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating stock quantity:', err);
            return res.status(500).json({ error: 'Errore nell\'aggiornamento quantità' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Stock non trovato' });
        }
        
        res.json({ message: 'Quantità aggiornata con successo' });
    });
}

// DELETE rimozione stock
function deleteStockEntry(req, res) {
    const { id } = req.params;
    
    const sql = 'DELETE FROM stock WHERE id = ?';
    
    connection.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting stock:', err);
            return res.status(500).json({ error: 'Errore nella rimozione stock' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Stock non trovato' });
        }
        
        res.json({ message: 'Stock rimosso con successo' });
    });
}

// GET fornitori disponibili
function getStockSuppliers(req, res) {
    const sql = `
        SELECT DISTINCT supplier 
        FROM stock 
        WHERE supplier IS NOT NULL AND supplier != ''
        ORDER BY supplier
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching suppliers:', err);
            return res.status(500).json({ error: 'Errore nel caricamento fornitori' });
        }
        
        const suppliers = results.map(row => row.supplier);
        res.json({ suppliers });
    });
}

// GET prodotti/varianti disponibili per stock
function getAvailableVariants(req, res) {
    const sql = `
        SELECT 
            pv.id,
            pv.name as variant_name,
            pv.price,
            pv.unit,
            p.id as product_id,
            p.name as product_name,
            c.name as category_name
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_available = 1 AND pv.is_active = 1
        ORDER BY p.name, pv.name
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching variants:', err);
            return res.status(500).json({ error: 'Errore nel caricamento varianti' });
        }
        
        res.json({ variants: results });
    });
}

/////////////////////////
// VARIANTI PRODOTTO (ESISTENTI)
/////////////////////////

// GET stock varianti
function getVariantsStock(req, res) {
    const sql = `
        SELECT pv.id, pv.product_id, pv.name, pv.price, pv.stock, pv.low_stock_threshold, pv.unit, p.name AS product_name
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// PATCH aggiornamento stock variante
function updateVariantStock(req, res) {
    const { id } = req.params;
    const { stock } = req.body; // nuovo valore stock
    const sql = 'UPDATE product_variants SET stock = ? WHERE id = ?';
    connection.query(sql, [stock, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Variante non trovata' });
        res.json({ id, stock });
    });
}

/////////////////////////
// FUSTI / KEGS (ESISTENTI)
/////////////////////////

// GET tutti i fusti
function getKegs(req, res) {
    const sql = `
        SELECT k.id, k.product_id, k.total_liters, k.remaining_liters, k.low_threshold, k.is_active, k.brewed_date, k.expiry_date, p.name AS product_name
        FROM kegs k
        JOIN products p ON k.product_id = p.id
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// PATCH aggiornamento litri residui fusto
function updateKegLiters(req, res) {
    const { id } = req.params;
    const { remaining_liters } = req.body;
    const sql = 'UPDATE kegs SET remaining_liters = ? WHERE id = ?';
    connection.query(sql, [remaining_liters, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Fusto non trovato' });
        res.json({ id, remaining_liters });
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
    
    const totalValue = stock.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0);
    
    return {
        total,
        critical,
        outOfStock,
        expired,
        expiring,
        overstocked,
        low,
        ok: total - critical - outOfStock - expired - expiring - overstocked - low,
        totalValue: totalValue.toFixed(2)
    };
}

module.exports = {
    // Nuove funzioni stock
    getAllStock,
    getStockStats,
    createStockEntry,
    updateStockEntry,
    updateStockQuantity,
    deleteStockEntry,
    getStockSuppliers,
    getAvailableVariants,
    
    // Funzioni esistenti
    getVariantsStock,
    updateVariantStock,
    getKegs,
    updateKegLiters
};
