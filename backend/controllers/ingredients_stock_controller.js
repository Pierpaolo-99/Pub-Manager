const connection = require('../database/db');

// GET tutti gli stock ingredienti
function getAllIngredientStock(req, res) {
    const { 
        search, 
        status, 
        location, 
        expiring_days = 30,
        supplier,
        low_stock = false 
    } = req.query;
    
    let sql = `
        SELECT 
            ist.*,
            i.name as ingredient_name,
            i.category,
            i.storage_type,
            CASE 
                WHEN ist.available_quantity <= 0 THEN 'out_of_stock'
                WHEN ist.available_quantity <= ist.min_threshold THEN 'critical'
                WHEN ist.available_quantity <= (ist.min_threshold * 1.5) THEN 'low'
                WHEN ist.expiry_date <= CURDATE() THEN 'expired'
                WHEN ist.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 'expiring'
                ELSE 'ok'
            END as stock_status,
            DATEDIFF(ist.expiry_date, CURDATE()) as days_to_expiry
        FROM ingredient_stock ist
        INNER JOIN ingredients i ON ist.ingredient_id = i.id
        WHERE 1=1
    `;
    
    const params = [expiring_days];
    
    // Filtri
    if (search) {
        sql += ` AND (i.name LIKE ? OR ist.batch_code LIKE ? OR ist.supplier LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (location) {
        sql += ` AND ist.location = ?`;
        params.push(location);
    }
    
    if (supplier) {
        sql += ` AND ist.supplier = ?`;
        params.push(supplier);
    }
    
    if (low_stock === 'true') {
        sql += ` AND ist.available_quantity <= ist.min_threshold`;
    }
    
    sql += ` ORDER BY 
        CASE 
            WHEN ist.available_quantity <= 0 THEN 1
            WHEN ist.available_quantity <= ist.min_threshold THEN 2
            WHEN ist.expiry_date <= CURDATE() THEN 3
            WHEN ist.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 4
            ELSE 5
        END,
        ist.expiry_date ASC,
        i.name ASC
    `;
    
    params.push(expiring_days);
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching ingredient stock:', err);
            return res.status(500).json({ error: 'Errore nel caricamento stock ingredienti' });
        }
        
        res.json({
            stock: results,
            summary: calculateStockSummary(results)
        });
    });
}

// GET statistiche stock ingredienti
function getStockStats(req, res) {
    const sql = `
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN available_quantity <= 0 THEN 1 END) as out_of_stock,
            COUNT(CASE WHEN available_quantity <= min_threshold AND available_quantity > 0 THEN 1 END) as low_stock,
            COUNT(CASE WHEN expiry_date <= CURDATE() THEN 1 END) as expired,
            COUNT(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND expiry_date > CURDATE() THEN 1 END) as expiring_soon,
            SUM(total_value) as total_value,
            COUNT(DISTINCT supplier) as suppliers_count,
            COUNT(DISTINCT location) as locations_count
        FROM ingredient_stock ist
        INNER JOIN ingredients i ON ist.ingredient_id = i.id
        WHERE i.active = 1
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching stock stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        res.json(results[0]);
    });
}

// POST nuovo carico merce
function createStockEntry(req, res) {
    const {
        ingredient_id,
        batch_code,
        quantity,
        unit,
        cost_per_unit,
        min_threshold,
        max_threshold,
        supplier,
        purchase_date,
        expiry_date,
        location,
        notes
    } = req.body;
    
    // Validazione
    if (!ingredient_id || !quantity || !unit) {
        return res.status(400).json({ 
            error: 'Ingrediente, quantità e unità sono obbligatori' 
        });
    }
    
    const sql = `
        INSERT INTO ingredient_stock (
            ingredient_id, batch_code, quantity, unit, cost_per_unit,
            min_threshold, max_threshold, supplier, purchase_date, 
            expiry_date, location, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        ingredient_id,
        batch_code || null,
        quantity,
        unit,
        cost_per_unit || 0,
        min_threshold || 0,
        max_threshold || null,
        supplier || null,
        purchase_date || null,
        expiry_date || null,
        location || null,
        notes || null
    ];
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error creating stock entry:', err);
            return res.status(500).json({ error: 'Errore nella creazione del carico' });
        }
        
        res.status(201).json({
            id: result.insertId,
            message: 'Carico merce registrato con successo'
        });
    });
}

// PUT aggiornamento stock
function updateStockEntry(req, res) {
    const { id } = req.params;
    const {
        quantity,
        reserved_quantity,
        min_threshold,
        max_threshold,
        cost_per_unit,
        supplier,
        expiry_date,
        location,
        notes
    } = req.body;
    
    const sql = `
        UPDATE ingredient_stock 
        SET 
            quantity = ?,
            reserved_quantity = ?,
            min_threshold = ?,
            max_threshold = ?,
            cost_per_unit = ?,
            supplier = ?,
            expiry_date = ?,
            location = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        quantity,
        reserved_quantity || 0,
        min_threshold || 0,
        max_threshold || null,
        cost_per_unit || 0,
        supplier || null,
        expiry_date || null,
        location || null,
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

// DELETE rimozione stock
function deleteStockEntry(req, res) {
    const { id } = req.params;
    
    const sql = 'DELETE FROM ingredient_stock WHERE id = ?';
    
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

// GET locazioni disponibili
function getLocations(req, res) {
    const sql = `
        SELECT DISTINCT location 
        FROM ingredient_stock 
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

// GET fornitori distinti
function getSuppliers(req, res) {
    const sql = `
        SELECT DISTINCT supplier 
        FROM ingredient_stock 
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

// Funzione helper per calcolare summary
function calculateStockSummary(stock) {
    const total = stock.length;
    const critical = stock.filter(s => s.stock_status === 'critical').length;
    const low = stock.filter(s => s.stock_status === 'low').length;
    const expired = stock.filter(s => s.stock_status === 'expired').length;
    const expiring = stock.filter(s => s.stock_status === 'expiring').length;
    const outOfStock = stock.filter(s => s.stock_status === 'out_of_stock').length;
    
    const totalValue = stock.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0);
    
    return {
        total,
        critical,
        low,
        expired,
        expiring,
        outOfStock,
        ok: total - critical - low - expired - expiring - outOfStock,
        totalValue: totalValue.toFixed(2)
    };
}

module.exports = {
    getAllIngredientStock,
    getStockStats,
    createStockEntry,
    updateStockEntry,
    deleteStockEntry,
    getLocations,
    getSuppliers
};