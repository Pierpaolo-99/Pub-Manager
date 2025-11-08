const connection = require('../database/db');

// GET tutti i movimenti ingredienti
function getAllMovements(req, res) {
    const { 
        ingredient_id, 
        type, 
        supplier, 
        start_date, 
        end_date, 
        limit = 50,
        page = 1 
    } = req.query;
    
    console.log('📋 Getting ingredient movements:', { ingredient_id, type, supplier });
    
    let sql = `
        SELECT 
            im.*,
            i.name as ingredient_name,
            i.unit as ingredient_unit,
            i.category as ingredient_category,
            u.username as user_name,
            u.first_name,
            u.last_name
        FROM ingredients_movements im
        INNER JOIN ingredients i ON im.ingredient_id = i.id
        LEFT JOIN users u ON im.user_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (ingredient_id) {
        sql += ` AND im.ingredient_id = ?`;
        params.push(ingredient_id);
    }
    
    if (type) {
        sql += ` AND im.type = ?`;
        params.push(type);
    }
    
    if (supplier) {
        sql += ` AND im.supplier LIKE ?`;
        params.push(`%${supplier}%`);
    }
    
    if (start_date) {
        sql += ` AND DATE(im.created_at) >= ?`;
        params.push(start_date);
    }
    
    if (end_date) {
        sql += ` AND DATE(im.created_at) <= ?`;
        params.push(end_date);
    }
    
    sql += ` ORDER BY im.created_at DESC`;
    
    // Paginazione
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching movements:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento movimenti',
                details: err.message 
            });
        }
        
        const movements = results.map(movement => ({
            ...movement,
            quantity: parseFloat(movement.quantity) || 0,
            cost_per_unit: parseFloat(movement.cost_per_unit) || 0,
            total_cost: parseFloat(movement.total_cost) || 0,
            user_display_name: movement.first_name && movement.last_name 
                ? `${movement.first_name} ${movement.last_name}`
                : movement.user_name || 'Sistema'
        }));
        
        console.log(`✅ Found ${movements.length} movements`);
        res.json({
            success: true,
            movements: movements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: movements.length
            }
        });
    });
}

// GET movimento singolo per ID
function getMovementById(req, res) {
    const { id } = req.params;
    
    console.log('🔍 Getting movement by ID:', id);
    
    const sql = `
        SELECT 
            im.*,
            i.name as ingredient_name,
            i.unit as ingredient_unit,
            i.category as ingredient_category,
            u.username as user_name,
            u.first_name,
            u.last_name
        FROM ingredients_movements im
        INNER JOIN ingredients i ON im.ingredient_id = i.id
        LEFT JOIN users u ON im.user_id = u.id
        WHERE im.id = ?
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching movement:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento movimento',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Movimento non trovato' 
            });
        }
        
        const movement = {
            ...results[0],
            quantity: parseFloat(results[0].quantity) || 0,
            cost_per_unit: parseFloat(results[0].cost_per_unit) || 0,
            total_cost: parseFloat(results[0].total_cost) || 0,
            user_display_name: results[0].first_name && results[0].last_name 
                ? `${results[0].first_name} ${results[0].last_name}`
                : results[0].user_name || 'Sistema'
        };
        
        console.log('✅ Movement found');
        res.json({
            success: true,
            movement: movement
        });
    });
}

// POST crea nuovo movimento
function createMovement(req, res) {
    const {
        ingredient_id,
        batch_id,
        type,
        quantity,
        unit,
        cost_per_unit,
        total_cost,
        reason,
        reference_type,
        reference_id,
        location_from,
        location_to,
        expiry_date,
        batch_code,
        supplier,
        invoice_number,
        notes
    } = req.body;
    
    console.log('➕ Creating new movement:', { ingredient_id, type, quantity });
    
    // Validazione campi obbligatori
    if (!ingredient_id || !type || !quantity || !unit) {
        return res.status(400).json({ 
            success: false,
            error: 'Ingrediente, tipo, quantità e unità sono obbligatori' 
        });
    }
    
    // Validazione tipo movimento
    const validTypes = ['purchase', 'sale', 'waste', 'adjustment', 'transfer', 'production'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            error: `Tipo movimento non valido. Validi: ${validTypes.join(', ')}`
        });
    }
    
    // Validazione quantità
    if (isNaN(quantity) || parseFloat(quantity) === 0) {
        return res.status(400).json({
            success: false,
            error: 'La quantità deve essere un numero diverso da zero'
        });
    }
    
    // Calcola total_cost se non fornito
    const calculatedTotalCost = total_cost || 
        (cost_per_unit ? parseFloat(quantity) * parseFloat(cost_per_unit) : null);
    
    const sql = `
        INSERT INTO ingredients_movements (
            ingredient_id, batch_id, type, quantity, unit, 
            cost_per_unit, total_cost, reason, reference_type, reference_id,
            location_from, location_to, expiry_date, batch_code, 
            supplier, invoice_number, notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        ingredient_id,
        batch_id || null,
        type,
        quantity,
        unit,
        cost_per_unit || null,
        calculatedTotalCost,
        reason || null,
        reference_type || 'manual',
        reference_id || null,
        location_from || null,
        location_to || null,
        expiry_date || null,
        batch_code || null,
        supplier || null,
        invoice_number || null,
        notes || null,
        req.user?.id || null // Assumendo middleware auth
    ];
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('❌ Error creating movement:', err);
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({
                    success: false,
                    error: 'Ingrediente non trovato'
                });
            }
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella registrazione movimento',
                details: err.message 
            });
        }
        
        console.log('✅ Movement created:', result.insertId);
        res.status(201).json({
            success: true,
            id: result.insertId,
            message: 'Movimento registrato con successo'
        });
    });
}

// GET stock corrente calcolato da movimenti
function getCurrentStock(req, res) {
    const { ingredient_id, category, supplier, low_stock_only } = req.query;
    
    console.log('📦 Calculating current stock from movements');
    
    let sql = `
        SELECT 
            i.id as ingredient_id,
            i.name,
            i.category,
            i.unit,
            i.storage_type,
            i.supplier,
            i.cost_per_unit as current_cost_per_unit,
            COALESCE(stock_calc.current_quantity, 0) as current_quantity,
            COALESCE(stock_calc.total_purchases, 0) as total_purchases,
            COALESCE(stock_calc.total_used, 0) as total_used,
            COALESCE(stock_calc.avg_cost, i.cost_per_unit) as avg_cost,
            COALESCE(stock_calc.last_movement_date, i.created_at) as last_movement_date,
            COALESCE(stock_calc.current_value, 0) as current_value,
            CASE 
                WHEN COALESCE(stock_calc.current_quantity, 0) <= 0 THEN 'out_of_stock'
                WHEN COALESCE(stock_calc.current_quantity, 0) <= 10 THEN 'critical'
                WHEN COALESCE(stock_calc.current_quantity, 0) <= 50 THEN 'low'
                ELSE 'ok'
            END as stock_status
        FROM ingredients i
        LEFT JOIN (
            SELECT 
                ingredient_id,
                SUM(CASE 
                    WHEN type IN ('purchase', 'adjustment') AND quantity > 0 THEN quantity
                    WHEN type IN ('sale', 'waste', 'production') THEN -quantity
                    WHEN type = 'adjustment' AND quantity < 0 THEN quantity
                    ELSE 0
                END) as current_quantity,
                SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END) as total_purchases,
                SUM(CASE WHEN type IN ('sale', 'waste', 'production') THEN quantity ELSE 0 END) as total_used,
                AVG(CASE WHEN type = 'purchase' AND cost_per_unit IS NOT NULL THEN cost_per_unit END) as avg_cost,
                MAX(created_at) as last_movement_date,
                SUM(CASE 
                    WHEN type IN ('purchase', 'adjustment') AND quantity > 0 THEN quantity * COALESCE(cost_per_unit, 0)
                    WHEN type IN ('sale', 'waste', 'production') THEN -(quantity * COALESCE(cost_per_unit, 0))
                    WHEN type = 'adjustment' AND quantity < 0 THEN quantity * COALESCE(cost_per_unit, 0)
                    ELSE 0
                END) as current_value
            FROM ingredients_movements
            GROUP BY ingredient_id
        ) stock_calc ON i.id = stock_calc.ingredient_id
        WHERE i.active = 1
    `;
    
    const params = [];
    
    if (ingredient_id) {
        sql += ` AND i.id = ?`;
        params.push(ingredient_id);
    }
    
    if (category) {
        sql += ` AND i.category = ?`;
        params.push(category);
    }
    
    if (supplier) {
        sql += ` AND i.supplier LIKE ?`;
        params.push(`%${supplier}%`);
    }
    
    if (low_stock_only === 'true') {
        sql += ` HAVING stock_status IN ('out_of_stock', 'critical', 'low')`;
    }
    
    sql += ` ORDER BY 
        CASE 
            WHEN COALESCE(stock_calc.current_quantity, 0) <= 0 THEN 1
            WHEN COALESCE(stock_calc.current_quantity, 0) <= 10 THEN 2
            WHEN COALESCE(stock_calc.current_quantity, 0) <= 50 THEN 3
            ELSE 4
        END,
        i.name ASC
    `;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error calculating stock:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel calcolo stock',
                details: err.message 
            });
        }
        
        const stockData = results.map(item => ({
            ...item,
            current_quantity: parseFloat(item.current_quantity) || 0,
            total_purchases: parseFloat(item.total_purchases) || 0,
            total_used: parseFloat(item.total_used) || 0,
            avg_cost: parseFloat(item.avg_cost) || 0,
            current_cost_per_unit: parseFloat(item.current_cost_per_unit) || 0,
            current_value: parseFloat(item.current_value) || 0
        }));
        
        console.log(`✅ Stock calculated for ${stockData.length} ingredients`);
        res.json({
            success: true,
            stock: stockData,
            summary: calculateStockSummary(stockData)
        });
    });
}

// GET statistiche movimenti
function getMovementStats(req, res) {
    const { period = 'month', start_date, end_date } = req.query;
    
    console.log('📊 Getting movement statistics');
    
    // Costruisci filtro date
    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
        dateFilter = 'AND DATE(created_at) BETWEEN ? AND ?';
        params.push(start_date, end_date);
    } else if (period === 'week') {
        dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)';
    } else if (period === 'month') {
        dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
    } else if (period === 'year') {
        dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }
    
    const sql = `
        SELECT 
            type,
            COUNT(*) as movement_count,
            SUM(quantity) as total_quantity,
            AVG(quantity) as avg_quantity,
            SUM(COALESCE(total_cost, 0)) as total_cost,
            AVG(COALESCE(total_cost, 0)) as avg_cost,
            COUNT(DISTINCT ingredient_id) as ingredients_affected
        FROM ingredients_movements
        WHERE 1=1 ${dateFilter}
        GROUP BY type
        ORDER BY movement_count DESC
    `;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching movement stats:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }
        
        const stats = results.map(stat => ({
            ...stat,
            movement_count: parseInt(stat.movement_count) || 0,
            total_quantity: parseFloat(stat.total_quantity) || 0,
            avg_quantity: parseFloat(stat.avg_quantity) || 0,
            total_cost: parseFloat(stat.total_cost) || 0,
            avg_cost: parseFloat(stat.avg_cost) || 0,
            ingredients_affected: parseInt(stat.ingredients_affected) || 0
        }));
        
        const totalMovements = stats.reduce((sum, stat) => sum + stat.movement_count, 0);
        const totalValue = stats.reduce((sum, stat) => sum + stat.total_cost, 0);
        
        console.log('✅ Movement stats calculated');
        res.json({
            success: true,
            period: period,
            stats_by_type: stats,
            summary: {
                total_movements: totalMovements,
                total_value: totalValue,
                types_count: stats.length
            }
        });
    });
}

// Funzione helper per calcolare summary stock
function calculateStockSummary(stock) {
    const total = stock.length;
    const critical = stock.filter(s => s.stock_status === 'critical').length;
    const low = stock.filter(s => s.stock_status === 'low').length;
    const outOfStock = stock.filter(s => s.stock_status === 'out_of_stock').length;
    const ok = stock.filter(s => s.stock_status === 'ok').length;
    
    const totalValue = stock.reduce((sum, item) => sum + parseFloat(item.current_value || 0), 0);
    const totalQuantity = stock.reduce((sum, item) => sum + parseFloat(item.current_quantity || 0), 0);
    
    return {
        total_ingredients: total,
        critical_stock: critical,
        low_stock: low,
        out_of_stock: outOfStock,
        ok_stock: ok,
        total_value: Math.round(totalValue * 100) / 100,
        total_quantity: Math.round(totalQuantity * 100) / 100
    };
}

module.exports = {
    getAllMovements,
    getMovementById,
    createMovement,
    getCurrentStock,
    getMovementStats
};