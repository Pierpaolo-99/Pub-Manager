const db = require('../database/db');

// GET sommario dati finanziari
const getFinancialSummary = async (req, res) => {
  try {
    const { period, date, comparison } = req.query;
    console.log('📊 Financial summary request:', { period, date, comparison });
    
    // Costruisci filtri data
    const dateFilter = buildDateFilter(period, date);
    const previousDateFilter = buildDateFilter(period, date, true);
    
    console.log('🔍 Date filters:', { dateFilter, previousDateFilter });
    
    // Query per dati attuali
    const currentQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
      FROM orders 
      WHERE status = 'completed' AND ${dateFilter}
    `;
    
    // Query per dati precedenti
    const previousQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
      FROM orders 
      WHERE status = 'completed' AND ${previousDateFilter}
    `;
    
    // Usa Promise per gestire le query in modo corretto
    const getCurrentData = () => {
      return new Promise((resolve, reject) => {
        db.query(currentQuery, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const getPreviousData = () => {
      return new Promise((resolve, reject) => {
        db.query(previousQuery, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    // Esegui queries in parallelo
    const [currentResults, previousResults] = await Promise.all([
      getCurrentData(),
      getPreviousData()
    ]);
    
    const current = currentResults[0] || { total_orders: 0, total_revenue: 0, avg_order_value: 0 };
    const previous = previousResults[0] || { total_orders: 0, total_revenue: 0, avg_order_value: 0 };
    
    console.log('📈 Query results:', { current, previous });
    
    // Calcola costi stimati (60% dei ricavi)
    const currentCosts = parseFloat(current.total_revenue) * 0.6;
    const previousCosts = parseFloat(previous.total_revenue) * 0.6;
    
    // Calcola profitti
    const currentProfit = parseFloat(current.total_revenue) - currentCosts;
    const previousProfit = parseFloat(previous.total_revenue) - previousCosts;
    
    // Calcola margini
    const currentMargin = current.total_revenue > 0 ? (currentProfit / parseFloat(current.total_revenue)) * 100 : 0;
    const previousMargin = previous.total_revenue > 0 ? (previousProfit / parseFloat(previous.total_revenue)) * 100 : 0;
    
    // Prepara risposta
    const financialData = {
      revenue: {
        current: parseFloat(current.total_revenue) || 0,
        previous: parseFloat(previous.total_revenue) || 0,
        change: calculatePercentageChange(current.total_revenue, previous.total_revenue)
      },
      costs: {
        current: currentCosts,
        previous: previousCosts,
        change: calculatePercentageChange(currentCosts, previousCosts)
      },
      profit: {
        current: currentProfit,
        previous: previousProfit,
        change: calculatePercentageChange(currentProfit, previousProfit)
      },
      margin: {
        current: currentMargin,
        previous: previousMargin,
        change: calculatePercentageChange(currentMargin, previousMargin)
      },
      orders: {
        current: parseInt(current.total_orders) || 0,
        previous: parseInt(previous.total_orders) || 0,
        change: calculatePercentageChange(current.total_orders, previous.total_orders)
      },
      avgOrder: {
        current: parseFloat(current.avg_order_value) || 0,
        previous: parseFloat(previous.avg_order_value) || 0,
        change: calculatePercentageChange(current.avg_order_value, previous.avg_order_value)
      },
      expenses: {
        ingredients: currentCosts * 0.55,
        labor: currentCosts * 0.25,
        utilities: currentCosts * 0.10,
        rent: currentCosts * 0.15,
        other: currentCosts * 0.10
      },
      dailyTrend: [],
      topProducts: []
    };
    
    console.log('✅ Financial data prepared:', financialData);
    res.json(financialData);
    
  } catch (error) {
    console.error('❌ Financial summary error:', error);
    
    // Restituisci dati di fallback in caso di errore
    const fallbackData = {
      revenue: { current: 0, previous: 0, change: 0 },
      costs: { current: 0, previous: 0, change: 0 },
      profit: { current: 0, previous: 0, change: 0 },
      margin: { current: 0, previous: 0, change: 0 },
      orders: { current: 0, previous: 0, change: 0 },
      avgOrder: { current: 0, previous: 0, change: 0 },
      expenses: {
        ingredients: 0,
        labor: 0,
        utilities: 0,
        rent: 0,
        other: 0
      },
      dailyTrend: [],
      topProducts: []
    };
    
    res.status(500).json({ 
      error: 'Errore nel calcolo dati finanziari',
      message: error.message,
      data: fallbackData // Include dati di fallback
    });
  }
};

// GET report dettagliato
const getDetailedReport = async (req, res) => {
  try {
    const { period, date } = req.query;
    console.log('📋 Detailed report request:', { period, date });
    
    const dateFilter = buildDateFilter(period, date);
    
    const detailQuery = `
      SELECT 
        o.id,
        o.total,
        o.status,
        o.created_at,
        o.payment_method,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE ${dateFilter}
      GROUP BY o.id, o.total, o.status, o.created_at, o.payment_method
      ORDER BY o.created_at DESC
      LIMIT 100
    `;
    
    const getOrdersData = () => {
      return new Promise((resolve, reject) => {
        db.query(detailQuery, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const orders = await getOrdersData();
    
    const detailedData = {
      orders: orders || [],
      summary: {
        totalOrders: orders ? orders.length : 0,
        totalRevenue: orders ? orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) : 0,
        avgOrder: orders && orders.length > 0 ? 
          orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / orders.length : 0
      }
    };
    
    console.log('✅ Detailed report prepared:', { ordersCount: orders ? orders.length : 0 });
    res.json(detailedData);
    
  } catch (error) {
    console.error('❌ Detailed report error:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento report dettagliato',
      message: error.message,
      data: {
        orders: [],
        summary: { totalOrders: 0, totalRevenue: 0, avgOrder: 0 }
      }
    });
  }
};

// GET esportazione dati
const exportFinancialData = async (req, res) => {
  try {
    const { period, date, format } = req.query;
    console.log('📁 Export request:', { period, date, format });
    
    // Per ora restituisce un messaggio
    res.json({ 
      message: 'Funzione di esportazione in sviluppo',
      format: format || 'excel',
      period: period || 'month',
      date: date || new Date().toISOString().slice(0, 7),
      status: 'development'
    });
    
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ 
      error: 'Errore nell\'esportazione',
      message: error.message 
    });
  }
};

// Funzioni helper
function buildDateFilter(period, date, isPrevious = false) {
  try {
    let startDate, endDate;
    
    // Se non c'è una data, usa oggi
    if (!date) {
      const today = new Date();
      date = period === 'day' ? today.toISOString().split('T')[0] :
             period === 'week' ? today.toISOString().split('T')[0] :
             today.toISOString().slice(0, 7);
    }
    
    if (period === 'day') {
      const baseDate = new Date(date);
      if (isPrevious) {
        baseDate.setDate(baseDate.getDate() - 1);
      }
      startDate = endDate = baseDate.toISOString().split('T')[0];
    } 
    else if (period === 'week') {
      // Per la settimana, usa la data come punto di partenza
      const baseDate = new Date(date);
      if (isPrevious) {
        baseDate.setDate(baseDate.getDate() - 7);
      }
      const startOfWeek = new Date(baseDate);
      startOfWeek.setDate(baseDate.getDate() - baseDate.getDay()); // Inizio settimana (domenica)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Fine settimana (sabato)
      
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
    
    console.log('📅 Date range:', { startDate, endDate, period, isPrevious });
    return `DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;
    
  } catch (error) {
    console.error('❌ Date filter error:', error);
    // Fallback a mese corrente
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    console.log('📅 Fallback date range:', { startDate, endDate });
    return `DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;
  }
}

function calculatePercentageChange(current, previous) {
  const currentVal = parseFloat(current) || 0;
  const previousVal = parseFloat(previous) || 0;
  
  if (previousVal === 0) {
    return currentVal > 0 ? 100 : 0;
  }
  
  return ((currentVal - previousVal) / previousVal) * 100;
}

// Esporta le funzioni
module.exports = {
  getFinancialSummary,
  getDetailedReport,
  exportFinancialData
};