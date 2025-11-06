const db = require('../database/db');

// GET tutti gli ordini di acquisto
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { 
      status, 
      supplier_id, 
      search, 
      from_date, 
      to_date,
      limit = 50,
      offset = 0 
    } = req.query;
    
    let query = `
      SELECT 
        po.*,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        u.username as created_by_name,
        COUNT(poi.id) as items_count,
        SUM(poi.quantity) as total_items_quantity,
        SUM(CASE WHEN poi.received_quantity > 0 THEN 1 ELSE 0 END) as received_items_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (status && status !== 'all') {
      query += ' AND po.status = ?';
      params.push(status);
    }
    
    if (supplier_id && supplier_id !== 'all') {
      query += ' AND po.supplier_id = ?';
      params.push(supplier_id);
    }
    
    if (search) {
      query += ' AND (po.order_number LIKE ? OR s.name LIKE ? OR po.invoice_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (from_date) {
      query += ' AND po.order_date >= ?';
      params.push(from_date);
    }
    
    if (to_date) {
      query += ' AND po.order_date <= ?';
      params.push(to_date);
    }
    
    query += ` 
      GROUP BY po.id
      ORDER BY po.order_date DESC, po.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const getOrders = () => {
      return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const orders = await getOrders();
    
    // Calcola statistiche
    const stats = await calculatePurchaseOrderStats();
    
    console.log(`✅ Retrieved ${orders.length} purchase orders`);
    
    res.json({
      orders: orders,
      stats: stats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: orders.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching purchase orders:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento ordini di acquisto',
      message: error.message 
    });
  }
};

// GET singolo ordine di acquisto con dettagli
const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Query principale per l'ordine
    const getOrder = () => {
      return new Promise((resolve, reject) => {
        const query = `
          SELECT 
            po.*,
            s.name as supplier_name,
            s.email as supplier_email,
            s.phone as supplier_phone,
            s.address as supplier_address,
            s.vat_number as supplier_vat,
            u.username as created_by_name
          FROM purchase_orders po
          LEFT JOIN suppliers s ON po.supplier_id = s.id
          LEFT JOIN users u ON po.created_by = u.id
          WHERE po.id = ?
        `;
        
        db.query(query, [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    // Query per gli item dell'ordine
    const getOrderItems = () => {
      return new Promise((resolve, reject) => {
        const query = `
          SELECT 
            poi.*,
            i.name as ingredient_name,
            i.category as ingredient_category,
            i.unit as ingredient_unit
          FROM purchase_order_items poi
          INNER JOIN ingredients i ON poi.ingredient_id = i.id
          WHERE poi.purchase_order_id = ?
          ORDER BY i.name
        `;
        
        db.query(query, [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const [orders, items] = await Promise.all([getOrder(), getOrderItems()]);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Ordine di acquisto non trovato' });
    }
    
    const order = {
      ...orders[0],
      items: items
    };
    
    console.log(`✅ Retrieved purchase order: ${order.order_number}`);
    res.json(order);
    
  } catch (error) {
    console.error('❌ Error fetching purchase order:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento ordine di acquisto',
      message: error.message 
    });
  }
};

// POST nuovo ordine di acquisto
const createPurchaseOrder = async (req, res) => {
  try {
    const {
      supplier_id,
      order_date,
      expected_delivery_date,
      payment_method,
      payment_terms,
      delivery_address,
      notes,
      items
    } = req.body;
    
    // Validazione
    if (!supplier_id || !order_date || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Campi obbligatori mancanti',
        required: ['supplier_id', 'order_date', 'items']
      });
    }
    
    // Genera numero ordine
    const order_number = await generateOrderNumber();
    
    // Calcola totali
    const { subtotal, tax_amount, total } = calculateOrderTotals(items);
    
    // Inserisci ordine principale
    const insertOrderQuery = `
      INSERT INTO purchase_orders 
      (supplier_id, order_number, status, order_date, expected_delivery_date, 
       subtotal, tax_amount, total, payment_method, payment_terms, 
       delivery_address, notes, created_by)
      VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const orderValues = [
      supplier_id,
      order_number,
      order_date,
      expected_delivery_date || null,
      subtotal,
      tax_amount,
      total,
      payment_method || null,
      payment_terms || null,
      delivery_address || null,
      notes || null,
      req.user?.id || 1 // TODO: Usare user autenticato
    ];
    
    const createOrder = () => {
      return new Promise((resolve, reject) => {
        db.query(insertOrderQuery, orderValues, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const orderResult = await createOrder();
    const orderId = orderResult.insertId;
    
    // Inserisci items dell'ordine
    const insertItemsQuery = `
      INSERT INTO purchase_order_items 
      (purchase_order_id, ingredient_id, quantity, unit, unit_price, total_price, notes)
      VALUES ?
    `;
    
    const itemsValues = items.map(item => [
      orderId,
      item.ingredient_id,
      item.quantity,
      item.unit,
      item.unit_price,
      parseFloat(item.quantity) * parseFloat(item.unit_price),
      item.notes || null
    ]);
    
    const createItems = () => {
      return new Promise((resolve, reject) => {
        db.query(insertItemsQuery, [itemsValues], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    await createItems();
    
    console.log(`✅ Created purchase order: ${order_number} (ID: ${orderId})`);
    res.status(201).json({
      message: 'Ordine di acquisto creato con successo',
      id: orderId,
      order_number: order_number
    });
    
  } catch (error) {
    console.error('❌ Error creating purchase order:', error);
    res.status(500).json({ 
      error: 'Errore nella creazione ordine di acquisto',
      message: error.message 
    });
  }
};

// PUT aggiorna ordine di acquisto
const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_id,
      status,
      order_date,
      expected_delivery_date,
      actual_delivery_date,
      discount_amount,
      shipping_cost,
      payment_method,
      payment_terms,
      invoice_number,
      delivery_address,
      notes,
      items
    } = req.body;
    
    // Verifica esistenza ordine
    const checkExists = () => {
      return new Promise((resolve, reject) => {
        db.query('SELECT id, status FROM purchase_orders WHERE id = ?', [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const existing = await checkExists();
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Ordine di acquisto non trovato' });
    }
    
    // Calcola nuovi totali se gli items sono forniti
    let subtotal, tax_amount, total;
    if (items && items.length > 0) {
      const totals = calculateOrderTotals(items, discount_amount, shipping_cost);
      subtotal = totals.subtotal;
      tax_amount = totals.tax_amount;
      total = totals.total;
    }
    
    // Aggiorna ordine principale
    const updateOrderQuery = `
      UPDATE purchase_orders SET
        supplier_id = COALESCE(?, supplier_id),
        status = COALESCE(?, status),
        order_date = COALESCE(?, order_date),
        expected_delivery_date = ?,
        actual_delivery_date = ?,
        subtotal = COALESCE(?, subtotal),
        tax_amount = COALESCE(?, tax_amount),
        discount_amount = COALESCE(?, discount_amount),
        shipping_cost = COALESCE(?, shipping_cost),
        total = COALESCE(?, total),
        payment_method = ?,
        payment_terms = ?,
        invoice_number = ?,
        delivery_address = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const updateValues = [
      supplier_id,
      status,
      order_date,
      expected_delivery_date,
      actual_delivery_date,
      subtotal,
      tax_amount,
      discount_amount || 0,
      shipping_cost || 0,
      total,
      payment_method,
      payment_terms,
      invoice_number,
      delivery_address,
      notes,
      id
    ];
    
    const updateOrder = () => {
      return new Promise((resolve, reject) => {
        db.query(updateOrderQuery, updateValues, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    await updateOrder();
    
    // Aggiorna items se forniti
    if (items && items.length > 0) {
      // Elimina items esistenti
      const deleteItems = () => {
        return new Promise((resolve, reject) => {
          db.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
      };
      
      await deleteItems();
      
      // Inserisci nuovi items
      const insertItemsQuery = `
        INSERT INTO purchase_order_items 
        (purchase_order_id, ingredient_id, quantity, unit, unit_price, total_price, received_quantity, notes)
        VALUES ?
      `;
      
      const itemsValues = items.map(item => [
        id,
        item.ingredient_id,
        item.quantity,
        item.unit,
        item.unit_price,
        parseFloat(item.quantity) * parseFloat(item.unit_price),
        item.received_quantity || 0,
        item.notes || null
      ]);
      
      const insertItems = () => {
        return new Promise((resolve, reject) => {
          db.query(insertItemsQuery, [itemsValues], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
      };
      
      await insertItems();
    }
    
    console.log(`✅ Updated purchase order ID: ${id}`);
    res.json({ message: 'Ordine di acquisto aggiornato con successo' });
    
  } catch (error) {
    console.error('❌ Error updating purchase order:', error);
    res.status(500).json({ 
      error: 'Errore nell\'aggiornamento ordine di acquisto',
      message: error.message 
    });
  }
};

// DELETE ordine di acquisto
const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se l'ordine può essere eliminato
    const checkStatus = () => {
      return new Promise((resolve, reject) => {
        db.query('SELECT status FROM purchase_orders WHERE id = ?', [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const orderData = await checkStatus();
    if (orderData.length === 0) {
      return res.status(404).json({ error: 'Ordine di acquisto non trovato' });
    }
    
    const { status } = orderData[0];
    if (['delivered', 'invoiced', 'paid'].includes(status)) {
      return res.status(400).json({ 
        error: 'Non è possibile eliminare un ordine già consegnato, fatturato o pagato' 
      });
    }
    
    // Elimina items dell'ordine
    const deleteItems = () => {
      return new Promise((resolve, reject) => {
        db.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    await deleteItems();
    
    // Elimina ordine
    const deleteOrder = () => {
      return new Promise((resolve, reject) => {
        db.query('DELETE FROM purchase_orders WHERE id = ?', [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const result = await deleteOrder();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ordine di acquisto non trovato' });
    }
    
    console.log(`✅ Deleted purchase order ID: ${id}`);
    res.json({ message: 'Ordine di acquisto eliminato con successo' });
    
  } catch (error) {
    console.error('❌ Error deleting purchase order:', error);
    res.status(500).json({ 
      error: 'Errore nell\'eliminazione ordine di acquisto',
      message: error.message 
    });
  }
};

// PUT aggiorna stato ordine
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actual_delivery_date, invoice_number } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Stato richiesto' });
    }
    
    const updateQuery = `
      UPDATE purchase_orders SET
        status = ?,
        actual_delivery_date = ?,
        invoice_number = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const updateStatus = () => {
      return new Promise((resolve, reject) => {
        db.query(updateQuery, [status, actual_delivery_date, invoice_number, id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const result = await updateStatus();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ordine di acquisto non trovato' });
    }
    
    console.log(`✅ Updated order ${id} status to: ${status}`);
    res.json({ message: 'Stato ordine aggiornato con successo' });
    
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ 
      error: 'Errore nell\'aggiornamento stato ordine',
      message: error.message 
    });
  }
};

// GET fornitori disponibili
const getSuppliers = async (req, res) => {
  try {
    const getSuppliers = () => {
      return new Promise((resolve, reject) => {
        const query = `
          SELECT id, name, email, phone, address, vat_number
          FROM suppliers 
          WHERE active = 1
          ORDER BY name
        `;
        db.query(query, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const suppliers = await getSuppliers();
    
    console.log(`✅ Retrieved ${suppliers.length} suppliers`);
    res.json({ suppliers });
    
  } catch (error) {
    console.error('❌ Error fetching suppliers:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento fornitori',
      message: error.message 
    });
  }
};

// Funzioni helper
const generateOrderNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const getLastNumber = () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT order_number 
        FROM purchase_orders 
        WHERE order_number LIKE ? 
        ORDER BY order_number DESC 
        LIMIT 1
      `;
      db.query(query, [`ORD-${year}${month}-%`], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };
  
  const lastOrders = await getLastNumber();
  let nextNumber = 1;
  
  if (lastOrders.length > 0) {
    const lastNumber = lastOrders[0].order_number;
    const numberPart = lastNumber.split('-')[2];
    nextNumber = parseInt(numberPart) + 1;
  }
  
  return `ORD-${year}${month}-${String(nextNumber).padStart(3, '0')}`;
};

const calculateOrderTotals = (items, discountAmount = 0, shippingCost = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
  }, 0);
  
  const tax_rate = 0.22; // 22% IVA
  const discountedSubtotal = subtotal - parseFloat(discountAmount);
  const tax_amount = discountedSubtotal * tax_rate;
  const total = discountedSubtotal + tax_amount + parseFloat(shippingCost);
  
  return {
    subtotal: subtotal.toFixed(2),
    tax_amount: tax_amount.toFixed(2),
    total: total.toFixed(2)
  };
};

const calculatePurchaseOrderStats = async () => {
  const getStats = () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_orders,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_orders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) as total_value,
          SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END) as delivered_value,
          COUNT(CASE WHEN expected_delivery_date < CURDATE() AND status NOT IN ('delivered', 'cancelled') THEN 1 END) as overdue_orders
        FROM purchase_orders
        WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `;
      
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  };
  
  return await getStats();
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  updateOrderStatus,
  getSuppliers
};