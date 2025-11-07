const connection = require('../database/db');

// GET overview analytics per dashboard
function getOverviewAnalytics(req, res) {
    console.log('📊 getOverviewAnalytics called');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    // Converti le date in formato MySQL
    const todayStr = today.toISOString().slice(0, 19).replace('T', ' ');
    const tomorrowStr = tomorrow.toISOString().slice(0, 19).replace('T', ' ');
    const weekStartStr = weekStart.toISOString().slice(0, 19).replace('T', ' ');

    const queries = {
        // Statistiche ordini (usa il nome corretto della tabella)
        ordersStats: `
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN created_at >= ? AND created_at < ? THEN 1 END) as today_orders,
                COUNT(CASE WHEN status IN ('pending', 'in_preparazione') THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'pagato' THEN 1 END) as completed_orders,
                COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN total ELSE 0 END), 0) as today_revenue,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN total ELSE 0 END), 0) as weekly_revenue
            FROM orders 
            WHERE created_at >= ?
        `,
        
        // Statistiche prodotti
        productsStats: `
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN is_available = 1 THEN 1 END) as available_products
            FROM products
        `,
        
        // Statistiche utenti
        usersStats: `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_users
            FROM users
        `
    };

    Promise.all([
        // Orders stats
        new Promise((resolve, reject) => {
            connection.query(queries.ordersStats, [
                todayStr, tomorrowStr, // per today_orders
                todayStr, tomorrowStr, // per today_revenue  
                weekStartStr,          // per weekly_revenue
                weekStartStr           // per WHERE clause
            ], (err, results) => {
                if (err) {
                    console.error('Error in orders stats:', err);
                    resolve({ total_orders: 0, today_orders: 0, pending_orders: 0, completed_orders: 0, today_revenue: 0, weekly_revenue: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        
        // Products stats  
        new Promise((resolve, reject) => {
            connection.query(queries.productsStats, (err, results) => {
                if (err) {
                    console.error('Error in products stats:', err);
                    resolve({ total_products: 0, available_products: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        }),
        
        // Users stats
        new Promise((resolve, reject) => {
            connection.query(queries.usersStats, (err, results) => {
                if (err) {
                    console.error('Error in users stats:', err);
                    resolve({ total_users: 0, active_users: 0 });
                } else {
                    resolve(results[0] || {});
                }
            });
        })
    ]).then(([ordersStats, productsStats, usersStats]) => {
        
        const analytics = {
            orders: {
                total: parseInt(ordersStats.total_orders) || 0,
                today: parseInt(ordersStats.today_orders) || 0,
                pending: parseInt(ordersStats.pending_orders) || 0,
                completed: parseInt(ordersStats.completed_orders) || 0,
                todayRevenue: parseFloat(ordersStats.today_revenue) || 0,
                weeklyRevenue: parseFloat(ordersStats.weekly_revenue) || 0
            },
            stock: {
                total: 0, // Placeholder - implementare quando hai la tabella stock
                lowStock: 0,
                outOfStock: 0,
                totalValue: 0
            },
            products: {
                total: parseInt(productsStats.total_products) || 0,
                available: parseInt(productsStats.available_products) || 0
            },
            users: {
                total: parseInt(usersStats.total_users) || 0,
                active: parseInt(usersStats.active_users) || 0
            }
        };

        console.log('✅ Analytics data:', analytics);
        res.json(analytics);
        
    }).catch(error => {
        console.error('❌ Error fetching analytics:', error);
        
        // Fallback data per evitare errori nel frontend
        const fallbackData = {
            orders: { total: 0, today: 0, pending: 0, completed: 0, todayRevenue: 0, weeklyRevenue: 0 },
            stock: { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
            products: { total: 0, available: 0 },
            users: { total: 0, active: 0 }
        };
        
        res.json(fallbackData);
    });
}

module.exports = {
    getOverviewAnalytics
};