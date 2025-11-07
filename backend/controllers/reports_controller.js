const connection = require('../database/db');

// Funzione helper per calcolare le date
function calculateDateRange(period) {
    const now = new Date();
    let startDate, endDate = new Date();
    
    switch(period) {
        case 'day':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            startDate = new Date();
            startDate.setDate(now.getDate() - now.getDay()); // Inizio settimana (domenica)
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
    }
    
    return { startDate, endDate };
}

// GET report vendite
function getSalesReport(req, res) {
    const { period = 'week', group_by = 'day' } = req.query;
    const { startDate, endDate } = calculateDateRange(period);
    
    let dateFormat;
    switch(group_by) {
        case 'hour':
            dateFormat = "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')";
            break;
        case 'day':
            dateFormat = "DATE(created_at)";
            break;
        case 'month':
            dateFormat = "DATE_FORMAT(created_at, '%Y-%m')";
            break;
        default:
            dateFormat = "DATE(created_at)";
    }
    
    const sql = `
        SELECT 
            ${dateFormat} as period,
            COUNT(*) as orders_count,
            SUM(total) as total_revenue,
            SUM(subtotal) as subtotal_revenue,
            SUM(tax_amount) as total_tax,
            SUM(total_discount) as total_discounts,
            AVG(total) as avg_order_value,
            MIN(total) as min_order,
            MAX(total) as max_order,
            COUNT(DISTINCT customer_name) as unique_customers,
            SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_revenue,
            SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_revenue,
            SUM(CASE WHEN order_type = 'dine_in' THEN total ELSE 0 END) as dine_in_revenue,
            SUM(CASE WHEN order_type = 'takeaway' THEN total ELSE 0 END) as takeaway_revenue,
            SUM(CASE WHEN order_type = 'delivery' THEN total ELSE 0 END) as delivery_revenue
        FROM orders 
        WHERE status = 'completed' 
            AND created_at BETWEEN ? AND ?
        GROUP BY ${dateFormat}
        ORDER BY period ASC
    `;
    
    connection.query(sql, [startDate, endDate], (err, results) => {
        if (err) {
            console.error('Error fetching sales report:', err);
            return res.status(500).json({ error: 'Errore nel caricamento report vendite' });
        }
        
        const salesData = results.map(row => ({
            ...row,
            total_revenue: parseFloat(row.total_revenue) || 0,
            subtotal_revenue: parseFloat(row.subtotal_revenue) || 0,
            total_tax: parseFloat(row.total_tax) || 0,
            total_discounts: parseFloat(row.total_discounts) || 0,
            avg_order_value: parseFloat(row.avg_order_value) || 0,
            min_order: parseFloat(row.min_order) || 0,
            max_order: parseFloat(row.max_order) || 0,
            cash_revenue: parseFloat(row.cash_revenue) || 0,
            card_revenue: parseFloat(row.card_revenue) || 0,
            dine_in_revenue: parseFloat(row.dine_in_revenue) || 0,
            takeaway_revenue: parseFloat(row.takeaway_revenue) || 0,
            delivery_revenue: parseFloat(row.delivery_revenue) || 0
        }));
        
        // Calcola totali del periodo
        const summary = calculateSalesSummary(salesData, startDate, endDate);
        
        res.json({
            period: period,
            date_range: { start: startDate, end: endDate },
            group_by: group_by,
            data: salesData,
            summary: summary
        });
    });
}

// GET prodotti top
function getTopProducts(req, res) {
    const { period = 'week', limit = 10, category_id } = req.query;
    const { startDate, endDate } = calculateDateRange(period);
    
    let sql = `
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.price as product_price,
            c.name as category_name,
            c.id as category_id,
            SUM(oi.quantity) as total_quantity_sold,
            COUNT(DISTINCT oi.order_id) as orders_count,
            SUM(oi.quantity * oi.price) as total_revenue,
            AVG(oi.price) as avg_price,
            SUM(oi.quantity * oi.price) / SUM(oi.quantity) as avg_unit_revenue,
            (SUM(oi.quantity * oi.price) / (
                SELECT SUM(total) FROM orders 
                WHERE status = 'completed' AND created_at BETWEEN ? AND ?
            )) * 100 as revenue_percentage
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE o.status = 'completed'
            AND o.created_at BETWEEN ? AND ?
    `;
    
    const params = [startDate, endDate, startDate, endDate];
    
    if (category_id) {
        sql += ` AND c.id = ?`;
        params.push(category_id);
    }
    
    sql += `
        GROUP BY p.id, p.name, p.price, c.name, c.id
        ORDER BY total_quantity_sold DESC
        LIMIT ?
    `;
    
    params.push(parseInt(limit));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching top products:', err);
            return res.status(500).json({ error: 'Errore nel caricamento prodotti top' });
        }
        
        const topProducts = results.map(product => ({
            ...product,
            product_price: parseFloat(product.product_price) || 0,
            total_quantity_sold: parseInt(product.total_quantity_sold) || 0,
            orders_count: parseInt(product.orders_count) || 0,
            total_revenue: parseFloat(product.total_revenue) || 0,
            avg_price: parseFloat(product.avg_price) || 0,
            avg_unit_revenue: parseFloat(product.avg_unit_revenue) || 0,
            revenue_percentage: parseFloat(product.revenue_percentage) || 0
        }));
        
        res.json({
            period: period,
            date_range: { start: startDate, end: endDate },
            category_filter: category_id || 'all',
            products: topProducts
        });
    });
}

// GET report inventario
function getInventoryReport(req, res) {
    const { status = 'all', supplier_id, expiring_days = 30 } = req.query;
    
    let sql = `
        SELECT 
            i.id as ingredient_id,
            i.name as ingredient_name,
            i.unit as ingredient_unit,
            i.cost_per_unit as ingredient_cost,
            i.category as ingredient_category,
            ist.quantity as stock_quantity,
            ist.available_quantity,
            ist.reserved_quantity,
            ist.min_threshold,
            ist.max_threshold,
            ist.supplier,
            ist.batch_number,
            ist.expiry_date,
            ist.cost_per_unit as current_cost,
            ist.total_value,
            ist.last_updated,
            CASE 
                WHEN ist.available_quantity <= 0 THEN 'esaurito'
                WHEN ist.available_quantity <= ist.min_threshold THEN 'critico'
                WHEN ist.expiry_date IS NOT NULL AND ist.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 'scadenza_vicina'
                WHEN ist.available_quantity >= ist.max_threshold THEN 'eccesso'
                ELSE 'ok'
            END as stock_status,
            DATEDIFF(ist.expiry_date, CURDATE()) as days_to_expiry
        FROM ingredients i
        LEFT JOIN ingredient_stock ist ON i.id = ist.ingredient_id
        WHERE 1=1
    `;
    
    const params = [parseInt(expiring_days)];
    
    if (status !== 'all') {
        const statusConditions = {
            'esaurito': 'ist.available_quantity <= 0',
            'critico': 'ist.available_quantity > 0 AND ist.available_quantity <= ist.min_threshold',
            'scadenza_vicina': 'ist.expiry_date IS NOT NULL AND ist.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)',
            'eccesso': 'ist.available_quantity >= ist.max_threshold',
            'ok': 'ist.available_quantity > ist.min_threshold AND (ist.expiry_date IS NULL OR ist.expiry_date > DATE_ADD(CURDATE(), INTERVAL ? DAY)) AND (ist.max_threshold IS NULL OR ist.available_quantity < ist.max_threshold)'
        };
        
        if (statusConditions[status]) {
            sql += ` AND (${statusConditions[status]})`;
            if (status === 'scadenza_vicina' || status === 'ok') {
                params.push(parseInt(expiring_days));
            }
        }
    }
    
    if (supplier_id) {
        sql += ` AND ist.supplier = ?`;
        params.push(supplier_id);
    }
    
    sql += ` ORDER BY 
        CASE 
            WHEN ist.available_quantity <= 0 THEN 1
            WHEN ist.available_quantity <= ist.min_threshold THEN 2
            WHEN ist.expiry_date IS NOT NULL AND ist.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 3
            ELSE 4
        END,
        ist.expiry_date ASC,
        i.name ASC
    `;
    
    params.push(parseInt(expiring_days));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching inventory report:', err);
            return res.status(500).json({ error: 'Errore nel caricamento report inventario' });
        }
        
        const inventoryData = results.map(item => ({
            ...item,
            ingredient_cost: parseFloat(item.ingredient_cost) || 0,
            stock_quantity: parseFloat(item.stock_quantity) || 0,
            available_quantity: parseFloat(item.available_quantity) || 0,
            reserved_quantity: parseFloat(item.reserved_quantity) || 0,
            min_threshold: parseFloat(item.min_threshold) || 0,
            max_threshold: parseFloat(item.max_threshold) || null,
            current_cost: parseFloat(item.current_cost) || 0,
            total_value: parseFloat(item.total_value) || 0,
            days_to_expiry: item.days_to_expiry || null
        }));
        
        // Calcola statistiche inventario
        const inventoryStats = calculateInventoryStats(inventoryData);
        
        res.json({
            status_filter: status,
            supplier_filter: supplier_id || 'all',
            expiring_days: parseInt(expiring_days),
            inventory: inventoryData,
            stats: inventoryStats
        });
    });
}

// GET analisi costi
function getCostsAnalysis(req, res) {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = calculateDateRange(period);
    
    // Query ricavi
    const revenueQuery = `
        SELECT 
            'ricavi' as type,
            SUM(total) as amount,
            COUNT(*) as transactions_count,
            AVG(total) as avg_transaction
        FROM orders 
        WHERE status = 'completed' 
            AND created_at BETWEEN ? AND ?
    `;
    
    // Query costi acquisti
    const costsQuery = `
        SELECT 
            'costi_acquisti' as type,
            SUM(total) as amount,
            COUNT(*) as transactions_count,
            AVG(total) as avg_transaction
        FROM purchase_orders 
        WHERE status IN ('delivered', 'invoiced', 'paid')
            AND order_date BETWEEN ? AND ?
    `;
    
    // Query dettaglio costi per categoria
    const costsByCategoryQuery = `
        SELECT 
            i.category,
            SUM(poi.total_cost) as total_cost,
            SUM(poi.quantity) as total_quantity,
            COUNT(DISTINCT po.supplier_id) as suppliers_count
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        JOIN ingredients i ON poi.ingredient_id = i.id
        WHERE po.status IN ('delivered', 'invoiced', 'paid')
            AND po.order_date BETWEEN ? AND ?
        GROUP BY i.category
        ORDER BY total_cost DESC
    `;
    
    // Esegui tutte le query
    connection.query(revenueQuery, [startDate, endDate], (err, revenueResults) => {
        if (err) {
            console.error('Error fetching revenue data:', err);
            return res.status(500).json({ error: 'Errore nel caricamento dati ricavi' });
        }
        
        connection.query(costsQuery, [startDate, endDate], (err, costsResults) => {
            if (err) {
                console.error('Error fetching costs data:', err);
                return res.status(500).json({ error: 'Errore nel caricamento dati costi' });
            }
            
            connection.query(costsByCategoryQuery, [startDate, endDate], (err, categoryResults) => {
                if (err) {
                    console.error('Error fetching costs by category:', err);
                    return res.status(500).json({ error: 'Errore nel caricamento costi per categoria' });
                }
                
                const revenue = revenueResults[0] || { amount: 0, transactions_count: 0, avg_transaction: 0 };
                const costs = costsResults[0] || { amount: 0, transactions_count: 0, avg_transaction: 0 };
                
                const analysis = {
                    period: period,
                    date_range: { start: startDate, end: endDate },
                    revenue: {
                        total: parseFloat(revenue.amount) || 0,
                        transactions: parseInt(revenue.transactions_count) || 0,
                        avg_transaction: parseFloat(revenue.avg_transaction) || 0
                    },
                    costs: {
                        total: parseFloat(costs.amount) || 0,
                        transactions: parseInt(costs.transactions_count) || 0,
                        avg_transaction: parseFloat(costs.avg_transaction) || 0
                    },
                    profit: (parseFloat(revenue.amount) || 0) - (parseFloat(costs.amount) || 0),
                    margin_percentage: revenue.amount > 0 
                        ? ((parseFloat(revenue.amount) - parseFloat(costs.amount)) / parseFloat(revenue.amount)) * 100 
                        : 0,
                    costs_by_category: categoryResults.map(category => ({
                        ...category,
                        total_cost: parseFloat(category.total_cost) || 0,
                        total_quantity: parseFloat(category.total_quantity) || 0,
                        suppliers_count: parseInt(category.suppliers_count) || 0
                    }))
                };
                
                res.json(analysis);
            });
        });
    });
}

// GET statistiche rapide (per dashboard)
function getQuickStats(req, res) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Statistiche di oggi
    const todayStatsQuery = `
        SELECT 
            COUNT(*) as orders_today,
            COALESCE(SUM(total), 0) as revenue_today,
            COALESCE(AVG(total), 0) as avg_order_today
        FROM orders 
        WHERE status = 'completed' 
            AND created_at >= ?
            AND created_at < ?
    `;
    
    // Statistiche di ieri (per confronto)
    const yesterdayStatsQuery = `
        SELECT 
            COUNT(*) as orders_yesterday,
            COALESCE(SUM(total), 0) as revenue_yesterday
        FROM orders 
        WHERE status = 'completed' 
            AND created_at >= ?
            AND created_at < ?
    `;
    
    // Prodotto top di oggi
    const topProductQuery = `
        SELECT 
            p.name as product_name,
            SUM(oi.quantity) as quantity_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.status = 'completed'
            AND o.created_at >= ?
            AND o.created_at < ?
        GROUP BY p.id, p.name
        ORDER BY quantity_sold DESC
        LIMIT 1
    `;
    
    connection.query(todayStatsQuery, [today, tomorrow], (err, todayResults) => {
        if (err) {
            console.error('Error fetching today stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        connection.query(yesterdayStatsQuery, [yesterday, today], (err, yesterdayResults) => {
            if (err) {
                console.error('Error fetching yesterday stats:', err);
                return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
            }
            
            connection.query(topProductQuery, [today, tomorrow], (err, productResults) => {
                if (err) {
                    console.error('Error fetching top product:', err);
                    return res.status(500).json({ error: 'Errore nel caricamento prodotto top' });
                }
                
                const todayStats = todayResults[0] || { orders_today: 0, revenue_today: 0, avg_order_today: 0 };
                const yesterdayStats = yesterdayResults[0] || { orders_yesterday: 0, revenue_yesterday: 0 };
                const topProduct = productResults[0] || { product_name: 'N/A', quantity_sold: 0 };
                
                // Calcola variazioni percentuali
                const revenueChange = yesterdayStats.revenue_yesterday > 0 
                    ? ((todayStats.revenue_today - yesterdayStats.revenue_yesterday) / yesterdayStats.revenue_yesterday) * 100 
                    : 0;
                
                const ordersChange = yesterdayStats.orders_yesterday > 0 
                    ? ((todayStats.orders_today - yesterdayStats.orders_yesterday) / yesterdayStats.orders_yesterday) * 100 
                    : 0;
                
                res.json({
                    revenue_today: parseFloat(todayStats.revenue_today) || 0,
                    revenue_change: Math.round(revenueChange * 100) / 100,
                    orders_today: parseInt(todayStats.orders_today) || 0,
                    orders_change: Math.round(ordersChange * 100) / 100,
                    avg_order_value: parseFloat(todayStats.avg_order_today) || 0,
                    top_product: {
                        name: topProduct.product_name,
                        quantity: parseInt(topProduct.quantity_sold) || 0
                    },
                    margin_percentage: 68 // Placeholder - da calcolare con costi reali
                });
            });
        });
    });
}

// Funzioni helper
function calculateSalesSummary(salesData, startDate, endDate) {
    const totalRevenue = salesData.reduce((sum, day) => sum + day.total_revenue, 0);
    const totalOrders = salesData.reduce((sum, day) => sum + day.orders_count, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_orders: totalOrders,
        avg_order_value: Math.round(avgOrderValue * 100) / 100,
        period_days: salesData.length,
        avg_daily_revenue: salesData.length > 0 ? Math.round((totalRevenue / salesData.length) * 100) / 100 : 0
    };
}

function calculateInventoryStats(inventoryData) {
    const total = inventoryData.length;
    const esaurito = inventoryData.filter(i => i.stock_status === 'esaurito').length;
    const critico = inventoryData.filter(i => i.stock_status === 'critico').length;
    const scadenzaVicina = inventoryData.filter(i => i.stock_status === 'scadenza_vicina').length;
    const eccesso = inventoryData.filter(i => i.stock_status === 'eccesso').length;
    const ok = inventoryData.filter(i => i.stock_status === 'ok').length;
    
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.total_value || 0), 0);
    
    return {
        total_items: total,
        status_breakdown: {
            esaurito,
            critico,
            scadenza_vicina,
            eccesso,
            ok
        },
        total_inventory_value: Math.round(totalValue * 100) / 100,
        alerts: esaurito + critico + scadenzaVicina
    };
}

module.exports = {
    getSalesReport,
    getTopProducts,
    getInventoryReport,
    getCostsAnalysis,
    getQuickStats
};