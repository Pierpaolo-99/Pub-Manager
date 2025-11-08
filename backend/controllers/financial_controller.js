const connection = require('../database/db');

// GET sommario dati finanziari CORRETTO
const getFinancialSummary = async (req, res) => {
  try {
    const { period = 'month', date, comparison } = req.query;
    console.log('📊 Financial summary request:', { period, date, comparison });
    
    // Costruisci filtri data
    const dateFilter = buildDateFilter(period, date);
    const previousDateFilter = buildDateFilter(period, date, true);
    
    console.log('🔍 Date filters:', { dateFilter, previousDateFilter });
    
    // Query per dati attuali CORRETTA
    const currentQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COUNT(CASE WHEN payment_method = 'contanti' THEN 1 END) as cash_orders,
        COUNT(CASE WHEN payment_method = 'carta' THEN 1 END) as card_orders,
        COUNT(CASE WHEN payment_method = 'bancomat' THEN 1 END) as debit_orders,
        COALESCE(SUM(CASE WHEN payment_method = 'contanti' THEN total END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'carta' THEN total END), 0) as card_revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'bancomat' THEN total END), 0) as debit_revenue
      FROM orders 
      WHERE status IN ('servito', 'pagato') AND ${dateFilter}
    `;
    
    // Query per dati precedenti CORRETTA
    const previousQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
      FROM orders 
      WHERE status IN ('servito', 'pagato') AND ${previousDateFilter}
    `;
    
    // Query costi reali da purchase_orders
    const costsQuery = `
      SELECT 
        COALESCE(SUM(po.total), 0) as total_purchase_costs,
        COUNT(*) as purchase_orders_count,
        COALESCE(SUM(CASE WHEN poi.ingredient_id IN (
          SELECT DISTINCT ingredient_id FROM ingredients WHERE category = 'meat'
        ) THEN poi.total_price END), 0) as meat_costs,
        COALESCE(SUM(CASE WHEN poi.ingredient_id IN (
          SELECT DISTINCT ingredient_id FROM ingredients WHERE category = 'beverage'
        ) THEN poi.total_price END), 0) as beverage_costs,
        COALESCE(SUM(CASE WHEN poi.ingredient_id IN (
          SELECT DISTINCT ingredient_id FROM ingredients WHERE category IN ('vegetable', 'grain')
        ) THEN poi.total_price END), 0) as food_costs
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.status IN ('delivered', 'invoiced', 'paid') 
        AND po.actual_delivery_date IS NOT NULL
        AND ${dateFilter.replace('created_at', 'po.actual_delivery_date')}
    `;
    
    // Query stock movements per fallback costi
    const stockMovementsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN sm.type = 'out' THEN sm.total_cost END), 0) as estimated_costs,
        COUNT(CASE WHEN sm.type = 'out' THEN 1 END) as out_movements
      FROM stock_movements sm
      WHERE ${dateFilter.replace('created_at', 'sm.created_at')}
    `;
    
    // Esegui queries con Promise wrapper
    const executeQuery = (sql) => {
      return new Promise((resolve, reject) => {
        connection.query(sql, (err, results) => {
          if (err) reject(err);
          else resolve(results[0] || {});
        });
      });
    };
    
    // Esegui tutte le queries in parallelo
    const [currentResults, previousResults, costsResults, stockMovements] = await Promise.all([
      executeQuery(currentQuery),
      executeQuery(previousQuery),
      executeQuery(costsQuery).catch(() => ({ total_purchase_costs: 0 })), // Fallback se tabella non accessibile
      executeQuery(stockMovementsQuery).catch(() => ({ estimated_costs: 0 }))
    ]);
    
    console.log('📈 Query results:', { currentResults, previousResults, costsResults });
    
    // Calcola costi (usa dati reali se disponibili, altrimenti stima)
    const realCosts = parseFloat(costsResults.total_purchase_costs) || 0;
    const estimatedCosts = parseFloat(stockMovements.estimated_costs) || 0;
    const fallbackCosts = parseFloat(currentResults.total_revenue) * 0.55; // Stima più conservativa
    
    const actualCosts = realCosts > 0 ? realCosts : 
                       estimatedCosts > 0 ? estimatedCosts : fallbackCosts;
    
    // Calcola costi periodo precedente (stima proporzionale)
    const previousRevenue = parseFloat(previousResults.total_revenue) || 0;
    const costRatio = currentResults.total_revenue > 0 ? 
                     (actualCosts / parseFloat(currentResults.total_revenue)) : 0.55;
    const previousCosts = previousRevenue * costRatio;
    
    // Calcola profitti
    const currentProfit = parseFloat(currentResults.total_revenue) - actualCosts;
    const previousProfit = previousRevenue - previousCosts;
    
    // Calcola margini
    const currentMargin = currentResults.total_revenue > 0 ? 
                         (currentProfit / parseFloat(currentResults.total_revenue)) * 100 : 0;
    const previousMargin = previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0;
    
    // Breakdown expenses (usa dati reali quando possibile)
    const expenseBreakdown = {
      ingredients: parseFloat(costsResults.food_costs) || (actualCosts * 0.45),
      beverages: parseFloat(costsResults.beverage_costs) || (actualCosts * 0.25),
      meat: parseFloat(costsResults.meat_costs) || (actualCosts * 0.20),
      labor: actualCosts * 0.30, // Stima per costo del lavoro
      utilities: actualCosts * 0.08,
      rent: actualCosts * 0.15,
      other: actualCosts * 0.07
    };
    
    // Prepara risposta
    const financialData = {
      period: period,
      date_range: extractDateRangeFromFilter(dateFilter),
      revenue: {
        current: parseFloat(currentResults.total_revenue) || 0,
        previous: previousRevenue,
        change: calculatePercentageChange(currentResults.total_revenue, previousRevenue),
        breakdown: {
          cash: parseFloat(currentResults.cash_revenue) || 0,
          card: parseFloat(currentResults.card_revenue) || 0,
          debit: parseFloat(currentResults.debit_revenue) || 0
        },
        tax_collected: parseFloat(currentResults.total_tax) || 0,
        discounts_given: parseFloat(currentResults.total_discounts) || 0
      },
      costs: {
        current: actualCosts,
        previous: previousCosts,
        change: calculatePercentageChange(actualCosts, previousCosts),
        source: realCosts > 0 ? 'purchase_orders' : 
               estimatedCosts > 0 ? 'stock_movements' : 'estimated',
        purchase_orders_count: parseInt(costsResults.purchase_orders_count) || 0
      },
      profit: {
        current: currentProfit,
        previous: previousProfit,
        change: calculatePercentageChange(currentProfit, previousProfit),
        margin_percentage: Math.round(currentMargin * 100) / 100
      },
      margin: {
        current: currentMargin,
        previous: previousMargin,
        change: calculatePercentageChange(currentMargin, previousMargin)
      },
      orders: {
        current: parseInt(currentResults.total_orders) || 0,
        previous: parseInt(previousResults.total_orders) || 0,
        change: calculatePercentageChange(currentResults.total_orders, previousResults.total_orders),
        payment_breakdown: {
          cash: parseInt(currentResults.cash_orders) || 0,
          card: parseInt(currentResults.card_orders) || 0,
          debit: parseInt(currentResults.debit_orders) || 0
        }
      },
      avgOrder: {
        current: parseFloat(currentResults.avg_order_value) || 0,
        previous: parseFloat(previousResults.avg_order_value) || 0,
        change: calculatePercentageChange(currentResults.avg_order_value, previousResults.avg_order_value)
      },
      expenses: expenseBreakdown,
      summary: {
        total_transactions: parseInt(currentResults.total_orders) || 0,
        gross_revenue: parseFloat(currentResults.total_revenue) || 0,
        net_profit: currentProfit,
        profit_margin: currentMargin,
        cost_ratio: currentResults.total_revenue > 0 ? 
                   (actualCosts / parseFloat(currentResults.total_revenue)) * 100 : 0
      }
    };
    
    console.log('✅ Financial data prepared successfully');
    res.json({
      success: true,
      data: financialData
    });
    
  } catch (error) {
    console.error('❌ Financial summary error:', error);
    
    // Restituisci dati di fallback strutturati
    const fallbackData = {
      period: req.query.period || 'month',
      revenue: { current: 0, previous: 0, change: 0, breakdown: { cash: 0, card: 0, debit: 0 } },
      costs: { current: 0, previous: 0, change: 0, source: 'fallback' },
      profit: { current: 0, previous: 0, change: 0, margin_percentage: 0 },
      margin: { current: 0, previous: 0, change: 0 },
      orders: { current: 0, previous: 0, change: 0, payment_breakdown: { cash: 0, card: 0, debit: 0 } },
      avgOrder: { current: 0, previous: 0, change: 0 },
      expenses: { ingredients: 0, beverages: 0, meat: 0, labor: 0, utilities: 0, rent: 0, other: 0 },
      summary: { total_transactions: 0, gross_revenue: 0, net_profit: 0, profit_margin: 0, cost_ratio: 0 }
    };
    
    res.status(500).json({ 
      success: false,
      error: 'Errore nel calcolo dati finanziari',
      details: error.message,
      data: fallbackData
    });
  }
};

// GET report dettagliato CORRETTO
const getDetailedReport = async (req, res) => {
  try {
    const { period = 'month', date, limit = 100 } = req.query;
    console.log('📋 Detailed report request:', { period, date, limit });
    
    const dateFilter = buildDateFilter(period, date);
    
    const detailQuery = `
      SELECT 
        o.id,
        o.table_id,
        o.customer_name,
        o.total,
        o.subtotal,
        o.tax_amount,
        o.discount_amount,
        o.status,
        o.payment_method,
        o.payment_status,
        o.created_at,
        o.served_at,
        o.paid_at,
        COUNT(oi.id) as items_count,
        COALESCE(SUM(oi.quantity), 0) as total_items,
        t.number as table_number,
        u.first_name as waiter_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status IN ('servito', 'pagato') AND ${dateFilter}
      GROUP BY o.id, o.table_id, o.customer_name, o.total, o.subtotal, 
               o.tax_amount, o.discount_amount, o.status, o.payment_method, 
               o.payment_status, o.created_at, o.served_at, o.paid_at, 
               t.number, u.first_name
      ORDER BY o.created_at DESC
      LIMIT ?
    `;
    
    const executeDetailQuery = () => {
      return new Promise((resolve, reject) => {
        connection.query(detailQuery, [parseInt(limit)], (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
      });
    };
    
    const orders = await executeDetailQuery();
    
    // Calcola statistiche dettagliate
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const totalTax = orders.reduce((sum, order) => sum + parseFloat(order.tax_amount || 0), 0);
    const totalDiscounts = orders.reduce((sum, order) => sum + parseFloat(order.discount_amount || 0), 0);
    
    const paymentMethodStats = orders.reduce((stats, order) => {
      const method = order.payment_method || 'unknown';
      stats[method] = (stats[method] || 0) + parseFloat(order.total || 0);
      return stats;
    }, {});
    
    const detailedData = {
      period: period,
      date_range: extractDateRangeFromFilter(dateFilter),
      orders: orders.map(order => ({
        ...order,
        total: parseFloat(order.total) || 0,
        subtotal: parseFloat(order.subtotal) || 0,
        tax_amount: parseFloat(order.tax_amount) || 0,
        discount_amount: parseFloat(order.discount_amount) || 0,
        items_count: parseInt(order.items_count) || 0,
        total_items: parseInt(order.total_items) || 0
      })),
      summary: {
        total_orders: orders.length,
        total_revenue: totalRevenue,
        total_tax: totalTax,
        total_discounts: totalDiscounts,
        avg_order_value: orders.length > 0 ? totalRevenue / orders.length : 0,
        payment_methods: paymentMethodStats
      },
      analytics: {
        orders_by_day: {}, // Può essere implementato se necessario
        peak_hours: {},    // Può essere implementato se necessario
        table_performance: {} // Può essere implementato se necessario
      }
    };
    
    console.log(`✅ Detailed report prepared with ${orders.length} orders`);
    res.json({
      success: true,
      data: detailedData
    });
    
  } catch (error) {
    console.error('❌ Detailed report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore nel caricamento report dettagliato',
      details: error.message,
      data: {
        orders: [],
        summary: { total_orders: 0, total_revenue: 0, avg_order_value: 0 }
      }
    });
  }
};

// GET esportazione dati MIGLIORATA
const exportFinancialData = async (req, res) => {
  try {
    const { period = 'month', date, format = 'json' } = req.query;
    console.log('📁 Export request:', { period, date, format });
    
    // Ottieni dati per esportazione
    const dateFilter = buildDateFilter(period, date);
    
    const exportQuery = `
      SELECT 
        o.id,
        o.created_at as order_date,
        o.total,
        o.subtotal,
        o.tax_amount,
        o.discount_amount,
        o.payment_method,
        o.status,
        o.customer_name,
        t.number as table_number,
        CONCAT(u.first_name, ' ', u.last_name) as waiter
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status IN ('servito', 'pagato') AND ${dateFilter}
      ORDER BY o.created_at ASC
    `;
    
    const executeExportQuery = () => {
      return new Promise((resolve, reject) => {
        connection.query(exportQuery, (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
      });
    };
    
    const exportData = await executeExportQuery();
    
    if (format === 'csv') {
      // Implementa export CSV quando necessario
      res.json({ 
        message: 'Export CSV in sviluppo',
        data_count: exportData.length,
        format: 'csv',
        status: 'development'
      });
    } else {
      // Restituisce dati JSON
      res.json({
        success: true,
        format: 'json',
        period: period,
        date_range: extractDateRangeFromFilter(dateFilter),
        export_data: exportData,
        summary: {
          records_count: exportData.length,
          total_revenue: exportData.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
          export_timestamp: new Date().toISOString()
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore nell\'esportazione',
      details: error.message 
    });
  }
};

// Funzioni helper MIGLIORATE
function buildDateFilter(period, date, isPrevious = false) {
  try {
    let startDate, endDate;
    
    const today = new Date();
    if (!date) {
      date = period === 'day' ? today.toISOString().split('T')[0] :
             period === 'week' ? today.toISOString().split('T')[0] :
             today.toISOString().slice(0, 7); // YYYY-MM
    }
    
    if (period === 'day') {
      const baseDate = new Date(date);
      if (isPrevious) {
        baseDate.setDate(baseDate.getDate() - 1);
      }
      startDate = endDate = baseDate.toISOString().split('T')[0];
    } 
    else if (period === 'week') {
      const baseDate = new Date(date);
      if (isPrevious) {
        baseDate.setDate(baseDate.getDate() - 7);
      }
      const startOfWeek = new Date(baseDate);
      startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = endOfWeek.toISOString().split('T')[0];
    } 
    else if (period === 'month') {
      const [year, month] = date.split('-').map(Number);
      let targetYear = year;
      let targetMonth = month;
      
      if (isPrevious) {
        targetMonth -= 1;
        if (targetMonth < 1) {
          targetMonth = 12;
          targetYear -= 1;
        }
      }
      
      startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
      endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
    }
    else {
      // Default a mese corrente
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    
    return `DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;
    
  } catch (error) {
    console.error('❌ Date filter error:', error);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return `DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;
  }
}

function extractDateRangeFromFilter(filter) {
  const matches = filter.match(/'(\d{4}-\d{2}-\d{2})'.+?'(\d{4}-\d{2}-\d{2})'/);
  return matches ? { start: matches[1], end: matches[2] } : null;
}

function calculatePercentageChange(current, previous) {
  const currentVal = parseFloat(current) || 0;
  const previousVal = parseFloat(previous) || 0;
  
  if (previousVal === 0) {
    return currentVal > 0 ? 100 : 0;
  }
  
  return Math.round(((currentVal - previousVal) / previousVal) * 10000) / 100;
}

// Esporta le funzioni
module.exports = {
  getFinancialSummary,
  getDetailedReport,
  exportFinancialData
};