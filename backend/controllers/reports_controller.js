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

// GET report vendite CORRETTO
function getSalesReport(req, res) {
    const { period = 'week', group_by = 'day', start_date, end_date } = req.query;
    
    console.log('📈 Getting sales report:', { period, group_by });
    
    let startDate, endDate;
    
    if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
    } else {
        ({ startDate, endDate } = calculateDateRange(period));
    }
    
    let dateFormat;
    switch(group_by) {
        case 'hour':
            dateFormat = "DATE_FORMAT(o.created_at, '%Y-%m-%d %H:00:00')";
            break;
        case 'day':
            dateFormat = "DATE(o.created_at)";
            break;
        case 'month':
            dateFormat = "DATE_FORMAT(o.created_at, '%Y-%m')";
            break;
        default:
            dateFormat = "DATE(o.created_at)";
    }
    
    const sql = `
        SELECT 
            ${dateFormat} as period,
            COUNT(o.id) as orders_count,
            COALESCE(SUM(o.total), 0) as total_revenue,
            COALESCE(AVG(o.total), 0) as avg_order_value,
            COALESCE(MIN(o.total), 0) as min_order,
            COALESCE(MAX(o.total), 0) as max_order,
            COUNT(DISTINCT o.user_id) as unique_waiters,
            COALESCE(SUM(CASE WHEN o.payment_method = 'contanti' THEN o.total ELSE 0 END), 0) as cash_revenue,
            COALESCE(SUM(CASE WHEN o.payment_method = 'carta' THEN o.total ELSE 0 END), 0) as card_revenue,
            COALESCE(SUM(CASE WHEN o.payment_method = 'bancomat' THEN o.total ELSE 0 END), 0) as debit_revenue,
            COALESCE(SUM(CASE WHEN o.table_id IS NOT NULL THEN o.total ELSE 0 END), 0) as dine_in_revenue,
            COALESCE(SUM(CASE WHEN o.table_id IS NULL THEN o.total ELSE 0 END), 0) as takeaway_revenue,
            COUNT(CASE WHEN o.table_id IS NOT NULL THEN 1 END) as dine_in_orders,
            COUNT(CASE WHEN o.table_id IS NULL THEN 1 END) as takeaway_orders
        FROM orders o
        WHERE o.status IN ('servito', 'pagato')
            AND o.created_at BETWEEN ? AND ?
        GROUP BY ${dateFormat}
        ORDER BY period ASC
    `;
    
    connection.query(sql, [startDate, endDate], (err, results) => {
        if (err) {
            console.error('❌ Error fetching sales report:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento report vendite',
                details: err.message 
            });
        }
        
        const salesData = results.map(row => ({
            period: row.period,
            orders_count: parseInt(row.orders_count) || 0,
            total_revenue: parseFloat(row.total_revenue) || 0,
            avg_order_value: parseFloat(row.avg_order_value) || 0,
            min_order: parseFloat(row.min_order) || 0,
            max_order: parseFloat(row.max_order) || 0,
            unique_waiters: parseInt(row.unique_waiters) || 0,
            payment_breakdown: {
                cash: parseFloat(row.cash_revenue) || 0,
                card: parseFloat(row.card_revenue) || 0,
                debit: parseFloat(row.debit_revenue) || 0
            },
            order_type_breakdown: {
                dine_in: {
                    orders: parseInt(row.dine_in_orders) || 0,
                    revenue: parseFloat(row.dine_in_revenue) || 0
                },
                takeaway: {
                    orders: parseInt(row.takeaway_orders) || 0,
                    revenue: parseFloat(row.takeaway_revenue) || 0
                }
            }
        }));
        
        // Calcola totali del periodo
        const summary = calculateSalesSummary(salesData);
        
        console.log(`✅ Sales report calculated for ${salesData.length} periods`);
        res.json({
            success: true,
            period: period,
            date_range: { 
                start: startDate.toISOString().split('T')[0], 
                end: endDate.toISOString().split('T')[0] 
            },
            group_by: group_by,
            data: salesData,
            summary: summary
        });
    });
}

// GET prodotti top CORRETTO
function getTopProducts(req, res) {
    const { period = 'week', limit = 10, category_id } = req.query;
    
    console.log('🏆 Getting top products report:', { period, limit, category_id });
    
    const { startDate, endDate } = calculateDateRange(period);
    
    let sql = `
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.base_price as product_price,
            pv.name as variant_name,
            pv.sku as variant_sku,
            c.name as category_name,
            c.id as category_id,
            c.color as category_color,
            SUM(oi.quantity) as total_quantity_sold,
            COUNT(DISTINCT oi.order_id) as orders_count,
            COALESCE(SUM(oi.subtotal), 0) as total_revenue,
            COALESCE(AVG(oi.price_at_sale), 0) as avg_price,
            COALESCE(SUM(oi.subtotal) / NULLIF(SUM(oi.quantity), 0), 0) as avg_unit_revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN product_variants pv ON oi.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE o.status IN ('servito', 'pagato')
            AND o.created_at BETWEEN ? AND ?
    `;
    
    const params = [startDate, endDate];
    
    if (category_id) {
        sql += ` AND c.id = ?`;
        params.push(category_id);
    }
    
    sql += `
        GROUP BY p.id, p.name, p.base_price, pv.name, pv.sku, c.name, c.id, c.color
        ORDER BY total_quantity_sold DESC
        LIMIT ?
    `;
    
    params.push(parseInt(limit));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching top products:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento prodotti top',
                details: err.message 
            });
        }
        
        const topProducts = results.map((product, index) => ({
            rank: index + 1,
            product_id: product.product_id,
            product_name: product.product_name,
            variant_name: product.variant_name,
            full_name: `${product.product_name}${product.variant_name !== product.product_name ? ` - ${product.variant_name}` : ''}`,
            sku: product.variant_sku,
            category: product.category_name || 'Nessuna categoria',
            category_color: product.category_color || '#6B7280',
            base_price: parseFloat(product.product_price) || 0,
            total_quantity_sold: parseInt(product.total_quantity_sold) || 0,
            orders_count: parseInt(product.orders_count) || 0,
            total_revenue: parseFloat(product.total_revenue) || 0,
            avg_price: parseFloat(product.avg_price) || 0,
            avg_unit_revenue: parseFloat(product.avg_unit_revenue) || 0
        }));
        
        // Calcola percentuale di revenue per ogni prodotto
        const totalRevenue = topProducts.reduce((sum, p) => sum + p.total_revenue, 0);
        
        const productsWithPercentage = topProducts.map(product => ({
            ...product,
            revenue_percentage: totalRevenue > 0 ? 
                Math.round((product.total_revenue / totalRevenue) * 10000) / 100 : 0
        }));
        
        console.log(`✅ Top ${productsWithPercentage.length} products calculated`);
        res.json({
            success: true,
            period: period,
            date_range: { 
                start: startDate.toISOString().split('T')[0], 
                end: endDate.toISOString().split('T')[0] 
            },
            category_filter: category_id || 'all',
            products: productsWithPercentage,
            summary: {
                total_products: productsWithPercentage.length,
                total_revenue: totalRevenue,
                total_quantity: productsWithPercentage.reduce((sum, p) => sum + p.total_quantity_sold, 0)
            }
        });
    });
}

// GET report inventario CORRETTO
function getInventoryReport(req, res) {
    const { status = 'all', supplier_filter, expiring_days = 30 } = req.query;
    
    console.log('📦 Getting inventory report:', { status, supplier_filter, expiring_days });
    
    let sql = `
        SELECT 
            s.id as stock_id,
            s.quantity as stock_quantity,
            s.unit,
            s.min_threshold,
            s.max_threshold,
            s.cost_per_unit,
            s.supplier,
            s.expiry_date,
            s.notes as stock_notes,
            s.last_restock_date,
            pv.name as variant_name,
            pv.sku as variant_sku,
            p.name as product_name,
            p.image_url as product_image,
            c.name as category_name,
            c.color as category_color,
            (s.quantity * s.cost_per_unit) as total_value,
            CASE 
                WHEN s.quantity <= 0 THEN 'esaurito'
                WHEN s.quantity <= s.min_threshold THEN 'critico'
                WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 'scadenza_vicina'
                WHEN s.max_threshold IS NOT NULL AND s.quantity >= s.max_threshold THEN 'eccesso'
                ELSE 'ok'
            END as stock_status,
            CASE 
                WHEN s.expiry_date IS NOT NULL 
                THEN DATEDIFF(s.expiry_date, CURDATE()) 
                ELSE NULL 
            END as days_to_expiry
        FROM stock s
        INNER JOIN product_variants pv ON s.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    `;
    
    const params = [parseInt(expiring_days)];
    
    if (status !== 'all') {
        switch(status) {
            case 'esaurito':
                sql += ` AND s.quantity <= 0`;
                break;
            case 'critico':
                sql += ` AND s.quantity > 0 AND s.quantity <= s.min_threshold`;
                break;
            case 'scadenza_vicina':
                sql += ` AND s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`;
                params.push(parseInt(expiring_days));
                break;
            case 'eccesso':
                sql += ` AND s.max_threshold IS NOT NULL AND s.quantity >= s.max_threshold`;
                break;
            case 'ok':
                sql += ` AND s.quantity > s.min_threshold 
                         AND (s.expiry_date IS NULL OR s.expiry_date > DATE_ADD(CURDATE(), INTERVAL ? DAY)) 
                         AND (s.max_threshold IS NULL OR s.quantity < s.max_threshold)`;
                params.push(parseInt(expiring_days));
                break;
        }
    }
    
    if (supplier_filter) {
        sql += ` AND s.supplier LIKE ?`;
        params.push(`%${supplier_filter}%`);
    }
    
    sql += ` ORDER BY 
        CASE 
            WHEN s.quantity <= 0 THEN 1
            WHEN s.quantity <= s.min_threshold THEN 2
            WHEN s.expiry_date IS NOT NULL AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 3
            ELSE 4
        END,
        s.expiry_date ASC,
        p.name ASC
    `;
    
    params.push(parseInt(expiring_days));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching inventory report:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento report inventario',
                details: err.message 
            });
        }
        
        const inventoryData = results.map(item => ({
            stock_id: item.stock_id,
            product_name: item.product_name,
            variant_name: item.variant_name,
            full_name: `${item.product_name}${item.variant_name !== item.product_name ? ` - ${item.variant_name}` : ''}`,
            sku: item.variant_sku,
            category: item.category_name || 'Nessuna categoria',
            category_color: item.category_color || '#6B7280',
            quantity: parseFloat(item.stock_quantity) || 0,
            unit: item.unit || 'pz',
            min_threshold: parseFloat(item.min_threshold) || 0,
            max_threshold: item.max_threshold ? parseFloat(item.max_threshold) : null,
            cost_per_unit: parseFloat(item.cost_per_unit) || 0,
            total_value: parseFloat(item.total_value) || 0,
            supplier: item.supplier || 'Non specificato',
            // ❌ RIMOSSO: batch_number (campo inesistente)
            expiry_date: item.expiry_date,
            days_to_expiry: item.days_to_expiry,
            last_restock_date: item.last_restock_date,
            stock_status: item.stock_status,
            notes: item.stock_notes
        }));
        
        // Calcola statistiche inventario
        const inventoryStats = calculateInventoryStats(inventoryData);
        
        console.log(`✅ Inventory report calculated for ${inventoryData.length} items`);
        res.json({
            success: true,
            status_filter: status,
            supplier_filter: supplier_filter || 'all',
            expiring_days: parseInt(expiring_days),
            inventory: inventoryData,
            stats: inventoryStats
        });
    });
}

// GET analisi costi MIGLIORATA (con purchase_orders)
function getCostsAnalysis(req, res) {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = calculateDateRange(period);
    
    console.log('💰 Getting enhanced costs analysis:', { period });
    
    // Query ricavi
    const revenueQuery = `
        SELECT 
            COALESCE(SUM(total), 0) as total_revenue,
            COUNT(*) as orders_count,
            COALESCE(AVG(total), 0) as avg_order_value
        FROM orders 
        WHERE status IN ('servito', 'pagato')
            AND created_at BETWEEN ? AND ?
    `;
    
    // Query costi reali da purchase_orders
    const purchaseCostsQuery = `
        SELECT 
            COALESCE(SUM(po.total), 0) as total_purchase_costs,
            COUNT(*) as purchase_orders_count,
            COALESCE(AVG(po.total), 0) as avg_purchase_value
        FROM purchase_orders po
        WHERE po.status IN ('delivered', 'invoiced', 'paid')
            AND po.actual_delivery_date BETWEEN ? AND ?
    `;
    
    // Query valore stock attuale
    const stockValueQuery = `
        SELECT 
            COALESCE(SUM(quantity * cost_per_unit), 0) as total_stock_value,
            COUNT(*) as stock_items,
            COALESCE(AVG(cost_per_unit), 0) as avg_cost_per_unit
        FROM stock
        WHERE quantity > 0
    `;
    
    // Query movimenti stock (uscite come proxy vendite)
    const movementsQuery = `
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'out' THEN quantity * cost_per_unit END), 0) as estimated_costs,
            COUNT(CASE WHEN type = 'out' THEN 1 END) as out_movements,
            COUNT(CASE WHEN type = 'in' THEN 1 END) as in_movements
        FROM stock_movements sm
        LEFT JOIN stock s ON sm.product_variant_id = s.product_variant_id
        WHERE sm.created_at BETWEEN ? AND ?
    `;
    
    Promise.all([
        new Promise((resolve, reject) => {
            connection.query(revenueQuery, [startDate, endDate], (err, results) => {
                if (err) reject(err);
                else resolve(results[0] || {});
            });
        }),
        new Promise((resolve, reject) => {
            connection.query(purchaseCostsQuery, [startDate, endDate], (err, results) => {
                if (err) {
                    console.warn('⚠️ Purchase costs query failed, using fallback');
                    resolve({ total_purchase_costs: 0, purchase_orders_count: 0, avg_purchase_value: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        new Promise((resolve, reject) => {
            connection.query(stockValueQuery, (err, results) => {
                if (err) reject(err);
                else resolve(results[0] || {});
            });
        }),
        new Promise((resolve, reject) => {
            connection.query(movementsQuery, [startDate, endDate], (err, results) => {
                if (err) reject(err);
                else resolve(results[0] || {});
            });
        })
    ]).then(([revenue, purchaseCosts, stockValue, movements]) => {
        
        const revenueAmount = parseFloat(revenue.total_revenue) || 0;
        const realCosts = parseFloat(purchaseCosts.total_purchase_costs) || 0;
        const estimatedCosts = parseFloat(movements.estimated_costs) || 0;
        
        // Usa costi reali se disponibili, altrimenti stima
        const actualCosts = realCosts > 0 ? realCosts : estimatedCosts;
        const profit = revenueAmount - actualCosts;
        const marginPercentage = revenueAmount > 0 ? (profit / revenueAmount) * 100 : 0;
        
        const analysis = {
            period: period,
            date_range: { 
                start: startDate.toISOString().split('T')[0], 
                end: endDate.toISOString().split('T')[0] 
            },
            revenue: {
                total: revenueAmount,
                orders: parseInt(revenue.orders_count) || 0,
                avg_order: parseFloat(revenue.avg_order_value) || 0
            },
            costs: {
                actual: actualCosts,
                purchase_orders: realCosts,
                estimated: estimatedCosts,
                source: realCosts > 0 ? 'purchase_orders' : 'stock_movements',
                stock_value: parseFloat(stockValue.total_stock_value) || 0,
                purchase_orders_count: parseInt(purchaseCosts.purchase_orders_count) || 0,
                movements: {
                    out: parseInt(movements.out_movements) || 0,
                    in: parseInt(movements.in_movements) || 0
                }
            },
            profit: {
                amount: profit,
                margin_percentage: Math.round(marginPercentage * 100) / 100
            },
            stock_info: {
                total_items: parseInt(stockValue.stock_items) || 0,
                avg_cost: parseFloat(stockValue.avg_cost_per_unit) || 0
            }
        };
        
        console.log('✅ Enhanced costs analysis calculated');
        res.json({
            success: true,
            data: analysis
        });
        
    }).catch(error => {
        console.error('❌ Error in costs analysis:', error);
        res.status(500).json({ 
            success: false,
            error: 'Errore nell\'analisi costi',
            details: error.message 
        });
    });
}

// GET statistiche rapide (per dashboard) CORRETTE
function getQuickStats(req, res) {
    console.log('⚡ Getting quick stats for dashboard');
    
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
        WHERE status IN ('servito', 'pagato')
            AND created_at >= ? AND created_at < ?
    `;
    
    // Statistiche di ieri (per confronto)
    const yesterdayStatsQuery = `
        SELECT 
            COUNT(*) as orders_yesterday,
            COALESCE(SUM(total), 0) as revenue_yesterday
        FROM orders 
        WHERE status IN ('servito', 'pagato')
            AND created_at >= ? AND created_at < ?
    `;
    
    // Prodotto top di oggi
    const topProductQuery = `
        SELECT 
            p.name as product_name,
            pv.name as variant_name,
            SUM(oi.quantity) as quantity_sold
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN product_variants pv ON oi.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        WHERE o.status IN ('servito', 'pagato')
            AND o.created_at >= ? AND o.created_at < ?
        GROUP BY p.id, p.name, pv.name
        ORDER BY quantity_sold DESC
        LIMIT 1
    `;
    
    Promise.all([
        new Promise((resolve) => {
            connection.query(todayStatsQuery, [today, tomorrow], (err, results) => {
                if (err) {
                    console.error('❌ Error in today stats:', err);
                    resolve({ orders_today: 0, revenue_today: 0, avg_order_today: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        new Promise((resolve) => {
            connection.query(yesterdayStatsQuery, [yesterday, today], (err, results) => {
                if (err) {
                    console.error('❌ Error in yesterday stats:', err);
                    resolve({ orders_yesterday: 0, revenue_yesterday: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        new Promise((resolve) => {
            connection.query(topProductQuery, [today, tomorrow], (err, results) => {
                if (err) {
                    console.error('❌ Error in top product:', err);
                    resolve({ product_name: 'N/A', variant_name: '', quantity_sold: 0 });
                } else {
                    resolve(results[0] || { product_name: 'N/A', variant_name: '', quantity_sold: 0 });
                }
            });
        })
    ]).then(([todayStats, yesterdayStats, topProduct]) => {
        
        // Calcola variazioni percentuali
        const revenueChange = yesterdayStats.revenue_yesterday > 0 
            ? ((todayStats.revenue_today - yesterdayStats.revenue_yesterday) / yesterdayStats.revenue_yesterday) * 100 
            : 0;
        
        const ordersChange = yesterdayStats.orders_yesterday > 0 
            ? ((todayStats.orders_today - yesterdayStats.orders_yesterday) / yesterdayStats.orders_yesterday) * 100 
            : 0;
        
        const topProductName = topProduct.variant_name !== topProduct.product_name && topProduct.variant_name 
            ? `${topProduct.product_name} - ${topProduct.variant_name}`
            : topProduct.product_name;
        
        console.log('✅ Quick stats calculated');
        res.json({
            success: true,
            data: {
                revenue_today: parseFloat(todayStats.revenue_today) || 0,
                revenue_change: Math.round(revenueChange * 100) / 100,
                orders_today: parseInt(todayStats.orders_today) || 0,
                orders_change: Math.round(ordersChange * 100) / 100,
                avg_order_value: parseFloat(todayStats.avg_order_today) || 0,
                top_product: {
                    name: topProductName,
                    quantity: parseInt(topProduct.quantity_sold) || 0
                }
            },
            timestamp: new Date().toISOString()
        });
        
    }).catch(error => {
        console.error('❌ Error fetching quick stats:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel caricamento statistiche rapide',
            details: error.message
        });
    });
}

// Funzioni helper CORRETTE
function calculateSalesSummary(salesData) {
    const totalRevenue = salesData.reduce((sum, day) => sum + (day.total_revenue || 0), 0);
    const totalOrders = salesData.reduce((sum, day) => sum + (day.orders_count || 0), 0);
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
        alerts: esaurito + critico + scadenzaVicina,
        categories: [...new Set(inventoryData.map(i => i.category))].length
    };
}

module.exports = {
    getSalesReport,
    getTopProducts,
    getInventoryReport,
    getCostsAnalysis,
    getQuickStats
};