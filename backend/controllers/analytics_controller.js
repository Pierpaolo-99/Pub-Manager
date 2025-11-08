const connection = require('../database/db');

// GET overview analytics per dashboard
function getOverviewAnalytics(req, res) {
    console.log('📊 Getting overview analytics for dashboard');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Converti le date in formato MySQL
    const todayStr = today.toISOString().slice(0, 10);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const queries = {
        // Statistiche ordini corrette
        ordersStats: `
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_orders,
                COUNT(CASE WHEN status IN ('pending', 'in_preparazione') THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'pronto' THEN 1 END) as ready_orders,
                COUNT(CASE WHEN status IN ('servito', 'pagato') THEN 1 END) as completed_orders,
                COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total ELSE 0 END), 0) as today_revenue,
                COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total ELSE 0 END), 0) as weekly_revenue,
                COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total ELSE 0 END), 0) as monthly_revenue,
                COALESCE(AVG(total), 0) as avg_order_value,
                COUNT(CASE WHEN table_id IS NOT NULL THEN 1 END) as dine_in_orders,
                COUNT(CASE WHEN table_id IS NULL THEN 1 END) as takeaway_orders
            FROM orders 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `,
        
        // Statistiche prodotti corrette
        productsStats: `
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_products,
                COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_products,
                COUNT(CASE WHEN featured = 1 THEN 1 END) as featured_products
            FROM products
        `,
        
        // Statistiche stock
        stockStats: `
            SELECT 
                COUNT(*) as total_stock_items,
                COUNT(CASE WHEN quantity <= 0 THEN 1 END) as out_of_stock,
                COUNT(CASE WHEN quantity <= min_threshold AND quantity > 0 THEN 1 END) as low_stock,
                COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= CURDATE() THEN 1 END) as expired_items,
                COALESCE(SUM(quantity * cost_per_unit), 0) as total_stock_value
            FROM stock
        `,
        
        // Statistiche utenti
        usersStats: `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_users,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
                COUNT(CASE WHEN role = 'waiter' THEN 1 END) as waiter_users,
                COUNT(CASE WHEN role = 'kitchen' THEN 1 END) as kitchen_users,
                COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recently_active
            FROM users
        `,
        
        // Statistiche tavoli
        tablesStats: `
            SELECT 
                COUNT(*) as total_tables,
                COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_tables,
                COUNT(CASE WHEN status = 'free' THEN 1 END) as free_tables,
                COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved_tables,
                COALESCE(SUM(capacity), 0) as total_capacity,
                COALESCE(AVG(capacity), 0) as avg_table_capacity
            FROM tables 
            WHERE active = 1
        `,
        
        // Statistiche categorie
        categoriesStats: `
            SELECT 
                COUNT(*) as total_categories,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_categories
            FROM categories
        `
    };

    Promise.all([
        // Orders stats
        new Promise((resolve) => {
            connection.query(queries.ordersStats, [
                todayStr, todayStr, weekStartStr, monthStartStr
            ], (err, results) => {
                if (err) {
                    console.error('❌ Error in orders stats:', err);
                    resolve({ 
                        total_orders: 0, today_orders: 0, pending_orders: 0, 
                        ready_orders: 0, completed_orders: 0, today_revenue: 0, 
                        weekly_revenue: 0, monthly_revenue: 0, avg_order_value: 0,
                        dine_in_orders: 0, takeaway_orders: 0
                    });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        
        // Products stats  
        new Promise((resolve) => {
            connection.query(queries.productsStats, (err, results) => {
                if (err) {
                    console.error('❌ Error in products stats:', err);
                    resolve({ total_products: 0, active_products: 0, inactive_products: 0, featured_products: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        
        // Stock stats
        new Promise((resolve) => {
            connection.query(queries.stockStats, (err, results) => {
                if (err) {
                    console.error('❌ Error in stock stats:', err);
                    resolve({ 
                        total_stock_items: 0, out_of_stock: 0, low_stock: 0, 
                        expired_items: 0, total_stock_value: 0 
                    });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        
        // Users stats
        new Promise((resolve) => {
            connection.query(queries.usersStats, (err, results) => {
                if (err) {
                    console.error('❌ Error in users stats:', err);
                    resolve({ 
                        total_users: 0, active_users: 0, admin_users: 0, 
                        waiter_users: 0, kitchen_users: 0, recently_active: 0 
                    });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        
        // Tables stats
        new Promise((resolve) => {
            connection.query(queries.tablesStats, (err, results) => {
                if (err) {
                    console.error('❌ Error in tables stats:', err);
                    resolve({ 
                        total_tables: 0, occupied_tables: 0, free_tables: 0, 
                        reserved_tables: 0, total_capacity: 0, avg_table_capacity: 0 
                    });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        
        // Categories stats
        new Promise((resolve) => {
            connection.query(queries.categoriesStats, (err, results) => {
                if (err) {
                    console.error('❌ Error in categories stats:', err);
                    resolve({ total_categories: 0, active_categories: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        })
    ]).then(([ordersStats, productsStats, stockStats, usersStats, tablesStats, categoriesStats]) => {
        
        const analytics = {
            orders: {
                total: parseInt(ordersStats.total_orders) || 0,
                today: parseInt(ordersStats.today_orders) || 0,
                pending: parseInt(ordersStats.pending_orders) || 0,
                ready: parseInt(ordersStats.ready_orders) || 0,
                completed: parseInt(ordersStats.completed_orders) || 0,
                todayRevenue: parseFloat(ordersStats.today_revenue) || 0,
                weeklyRevenue: parseFloat(ordersStats.weekly_revenue) || 0,
                monthlyRevenue: parseFloat(ordersStats.monthly_revenue) || 0,
                avgOrderValue: parseFloat(ordersStats.avg_order_value) || 0,
                dineIn: parseInt(ordersStats.dine_in_orders) || 0,
                takeaway: parseInt(ordersStats.takeaway_orders) || 0
            },
            stock: {
                total: parseInt(stockStats.total_stock_items) || 0,
                outOfStock: parseInt(stockStats.out_of_stock) || 0,
                lowStock: parseInt(stockStats.low_stock) || 0,
                expired: parseInt(stockStats.expired_items) || 0,
                totalValue: parseFloat(stockStats.total_stock_value) || 0
            },
            products: {
                total: parseInt(productsStats.total_products) || 0,
                active: parseInt(productsStats.active_products) || 0,
                inactive: parseInt(productsStats.inactive_products) || 0,
                featured: parseInt(productsStats.featured_products) || 0
            },
            users: {
                total: parseInt(usersStats.total_users) || 0,
                active: parseInt(usersStats.active_users) || 0,
                admins: parseInt(usersStats.admin_users) || 0,
                waiters: parseInt(usersStats.waiter_users) || 0,
                kitchen: parseInt(usersStats.kitchen_users) || 0,
                recentlyActive: parseInt(usersStats.recently_active) || 0
            },
            tables: {
                total: parseInt(tablesStats.total_tables) || 0,
                occupied: parseInt(tablesStats.occupied_tables) || 0,
                free: parseInt(tablesStats.free_tables) || 0,
                reserved: parseInt(tablesStats.reserved_tables) || 0,
                totalCapacity: parseInt(tablesStats.total_capacity) || 0,
                avgCapacity: parseFloat(tablesStats.avg_table_capacity) || 0,
                occupancyRate: tablesStats.total_tables > 0 ? 
                    Math.round((parseInt(tablesStats.occupied_tables) / parseInt(tablesStats.total_tables)) * 100) : 0
            },
            categories: {
                total: parseInt(categoriesStats.total_categories) || 0,
                active: parseInt(categoriesStats.active_categories) || 0
            },
            alerts: {
                stockAlerts: (parseInt(stockStats.out_of_stock) || 0) + (parseInt(stockStats.low_stock) || 0),
                expiredItems: parseInt(stockStats.expired_items) || 0,
                pendingOrders: parseInt(ordersStats.pending_orders) || 0
            }
        };

        console.log('✅ Overview analytics calculated successfully');
        res.json({
            success: true,
            data: analytics,
            timestamp: new Date().toISOString()
        });
        
    }).catch(error => {
        console.error('❌ Error fetching overview analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel caricamento analytics',
            details: error.message
        });
    });
}

// GET sales analytics per periodo
function getSalesAnalytics(req, res) {
    const { period = '7', start_date, end_date } = req.query;
    
    console.log('📈 Getting sales analytics for period:', { period, start_date, end_date });
    
    let dateFilter = '';
    let params = [];
    
    if (start_date && end_date) {
        dateFilter = 'DATE(created_at) BETWEEN ? AND ?';
        params = [start_date, end_date];
    } else {
        dateFilter = 'created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)';
        params = [parseInt(period)];
    }
    
    const salesQuery = `
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as orders_count,
            SUM(total) as total_revenue,
            AVG(total) as avg_order_value,
            COUNT(CASE WHEN table_id IS NOT NULL THEN 1 END) as dine_in_count,
            COUNT(CASE WHEN table_id IS NULL THEN 1 END) as takeaway_count,
            SUM(CASE WHEN table_id IS NOT NULL THEN total ELSE 0 END) as dine_in_revenue,
            SUM(CASE WHEN table_id IS NULL THEN total ELSE 0 END) as takeaway_revenue
        FROM orders 
        WHERE ${dateFilter} AND status IN ('servito', 'pagato')
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC
    `;
    
    connection.query(salesQuery, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching sales analytics:', err);
            return res.status(500).json({
                success: false,
                error: 'Errore nel caricamento analytics vendite',
                details: err.message
            });
        }
        
        const salesData = results.map(row => ({
            date: row.date,
            orders: parseInt(row.orders_count),
            revenue: parseFloat(row.total_revenue) || 0,
            avgOrderValue: parseFloat(row.avg_order_value) || 0,
            dineIn: {
                orders: parseInt(row.dine_in_count),
                revenue: parseFloat(row.dine_in_revenue) || 0
            },
            takeaway: {
                orders: parseInt(row.takeaway_count),
                revenue: parseFloat(row.takeaway_revenue) || 0
            }
        }));
        
        const totals = results.reduce((acc, row) => ({
            orders: acc.orders + parseInt(row.orders_count),
            revenue: acc.revenue + (parseFloat(row.total_revenue) || 0),
            dineInOrders: acc.dineInOrders + parseInt(row.dine_in_count),
            takeawayOrders: acc.takeawayOrders + parseInt(row.takeaway_count)
        }), { orders: 0, revenue: 0, dineInOrders: 0, takeawayOrders: 0 });
        
        console.log(`✅ Sales analytics calculated for ${salesData.length} days`);
        res.json({
            success: true,
            data: salesData,
            summary: {
                ...totals,
                avgOrderValue: totals.orders > 0 ? totals.revenue / totals.orders : 0
            },
            period: period,
            dateRange: {
                start: start_date || null,
                end: end_date || null
            }
        });
    });
}

// GET top products analytics
function getTopProducts(req, res) {
    const { limit = 10, period = '30' } = req.query;
    
    console.log('🏆 Getting top products analytics:', { limit, period });
    
    const topProductsQuery = `
        SELECT 
            p.id,
            p.name as product_name,
            pv.name as variant_name,
            c.name as category_name,
            c.color as category_color,
            SUM(oi.quantity) as total_quantity,
            COUNT(DISTINCT oi.order_id) as orders_count,
            SUM(oi.subtotal) as total_revenue,
            AVG(oi.price_at_sale) as avg_price
        FROM order_items oi
        INNER JOIN product_variants pv ON oi.product_variant_id = pv.id
        INNER JOIN products p ON pv.product_id = p.id
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND o.status IN ('servito', 'pagato')
        GROUP BY p.id, p.name, pv.name, c.name, c.color
        ORDER BY total_quantity DESC
        LIMIT ?
    `;
    
    connection.query(topProductsQuery, [parseInt(period), parseInt(limit)], (err, results) => {
        if (err) {
            console.error('❌ Error fetching top products:', err);
            return res.status(500).json({
                success: false,
                error: 'Errore nel caricamento top products',
                details: err.message
            });
        }
        
        const topProducts = results.map((product, index) => ({
            rank: index + 1,
            id: product.id,
            name: `${product.product_name}${product.variant_name !== product.product_name ? ` - ${product.variant_name}` : ''}`,
            category: product.category_name || 'Nessuna categoria',
            categoryColor: product.category_color || '#6B7280',
            quantity: parseInt(product.total_quantity),
            orders: parseInt(product.orders_count),
            revenue: parseFloat(product.total_revenue) || 0,
            avgPrice: parseFloat(product.avg_price) || 0
        }));
        
        console.log(`✅ Top ${topProducts.length} products calculated`);
        res.json({
            success: true,
            data: topProducts,
            period: parseInt(period),
            limit: parseInt(limit)
        });
    });
}

// GET performance metrics
function getPerformanceMetrics(req, res) {
    console.log('⚡ Getting performance metrics');
    
    const metricsQuery = `
        SELECT 
            AVG(CASE 
                WHEN o.status = 'servito' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                THEN TIMESTAMPDIFF(MINUTE, o.created_at, o.updated_at)
                ELSE NULL 
            END) as avg_order_time_today,
            AVG(CASE 
                WHEN o.status = 'servito' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                THEN TIMESTAMPDIFF(MINUTE, o.created_at, o.updated_at)
                ELSE NULL 
            END) as avg_order_time_week,
            COUNT(CASE 
                WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND TIMESTAMPDIFF(MINUTE, o.created_at, COALESCE(o.updated_at, NOW())) > 30
                THEN 1 ELSE NULL 
            END) as delayed_orders_today,
            (SELECT COUNT(*) FROM tables WHERE status = 'occupied') as current_occupied_tables,
            (SELECT COUNT(*) FROM tables WHERE active = 1) as total_active_tables
        FROM orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    
    connection.query(metricsQuery, (err, results) => {
        if (err) {
            console.error('❌ Error fetching performance metrics:', err);
            return res.status(500).json({
                success: false,
                error: 'Errore nel caricamento metriche performance',
                details: err.message
            });
        }
        
        const metrics = results[0] || {};
        
        const performanceData = {
            orderTimes: {
                today: parseFloat(metrics.avg_order_time_today) || 0,
                week: parseFloat(metrics.avg_order_time_week) || 0
            },
            delayedOrders: parseInt(metrics.delayed_orders_today) || 0,
            tableOccupancy: {
                occupied: parseInt(metrics.current_occupied_tables) || 0,
                total: parseInt(metrics.total_active_tables) || 0,
                rate: metrics.total_active_tables > 0 ? 
                    Math.round((parseInt(metrics.current_occupied_tables) / parseInt(metrics.total_active_tables)) * 100) : 0
            }
        };
        
        console.log('✅ Performance metrics calculated');
        res.json({
            success: true,
            data: performanceData,
            timestamp: new Date().toISOString()
        });
    });
}

module.exports = {
    getOverviewAnalytics,
    getSalesAnalytics,
    getTopProducts,
    getPerformanceMetrics
};