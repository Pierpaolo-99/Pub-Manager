const connection = require('../database/db');

/////////////////////////
// NUOVE FUNZIONI PER IL FRONTEND ADMIN
/////////////////////////

// GET tutti gli ordini per l'admin dashboard
async function getAllOrders(req, res) {
    console.log('🔄 getAllOrders chiamata');
    try {
        const sql = `
            SELECT 
                o.id,
                o.table_id as table_number,
                o.user_id,
                o.status,
                o.total,
                o.payment_method,
                o.created_at,
                o.updated_at,
                'Cliente' as customer_name
            FROM orders o
            ORDER BY o.created_at DESC
        `;
        
        // Promisify la query
        const orders = await new Promise((resolve, reject) => {
            connection.query(sql, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (orders.length === 0) {
            return res.json([]);
        }

        // Carica gli items per ogni ordine usando Promise.all
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const itemsQuery = `
                    SELECT 
                        oi.id,
                        oi.quantity,
                        oi.price_at_sale as price,
                        oi.note as notes,
                        COALESCE(pv.name, p.name, 'Prodotto') as name
                    FROM order_items oi
                    LEFT JOIN product_variants pv ON oi.product_variant_id = pv.id
                    LEFT JOIN products p ON pv.product_id = p.id
                    WHERE oi.order_id = ?
                    ORDER BY oi.id
                `;

                const items = await new Promise((resolve, reject) => {
                    connection.query(itemsQuery, [order.id], (err2, results) => {
                        if (err2) {
                            console.error('Error loading items for order', order.id, err2);
                            resolve([]); // Ritorna array vuoto invece di fallire
                        } else {
                            resolve(results.map(item => ({
                                id: item.id,
                                name: item.name,
                                quantity: item.quantity,
                                price: item.price,
                                notes: item.notes
                            })));
                        }
                    });
                });

                // Mappa gli stati del database agli stati del frontend
                const statusMapping = {
                    'pending': 'pending',
                    'in_preparazione': 'preparing', 
                    'pronto': 'ready',
                    'servito': 'served',
                    'pagato': 'completed',
                    'annullato': 'cancelled'
                };

                // Calcola il totale se non presente
                let calculatedTotal = order.total;
                if (!calculatedTotal && items.length > 0) {
                    calculatedTotal = items.reduce((sum, item) => {
                        return sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1));
                    }, 0).toFixed(2);
                }

                return {
                    ...order,
                    status: statusMapping[order.status] || order.status,
                    total: calculatedTotal,
                    items: items
                };
            })
        );

        console.log(`✅ Caricati ${ordersWithItems.length} ordini`);
        res.json(ordersWithItems);

    } catch (error) {
        console.log('❌ Errore in getAllOrders:', error);
        res.status(500).json({ 
            error: 'Errore nel caricamento degli ordini',
            message: error.message 
        });
    }
}

// GET singolo ordine per ID
async function getOrderById(req, res) {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT 
                o.id,
                o.table_id as table_number,
                o.user_id,
                o.status,
                o.total,
                o.payment_method,
                o.created_at,
                o.updated_at,
                'Cliente' as customer_name
            FROM orders o
            WHERE o.id = ?
        `;
        
        const orders = await new Promise((resolve, reject) => {
            connection.query(sql, [id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Ordine non trovato' });
        }

        const order = orders[0];
        
        // Carica gli items
        const itemsQuery = `
            SELECT 
                oi.id,
                oi.quantity,
                oi.price_at_sale as price,
                oi.note as notes,
                COALESCE(pv.name, p.name, 'Prodotto') as name
            FROM order_items oi
            LEFT JOIN product_variants pv ON oi.product_variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            WHERE oi.order_id = ?
            ORDER BY oi.id
        `;
        
        const items = await new Promise((resolve, reject) => {
            connection.query(itemsQuery, [id], (err2, results) => {
                if (err2) reject(err2);
                else resolve(results.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    notes: item.notes
                })));
            });
        });

        // Mappa gli stati
        const statusMapping = {
            'pending': 'pending',
            'in_preparazione': 'preparing', 
            'pronto': 'ready',
            'servito': 'served',
            'pagato': 'completed',
            'annullato': 'cancelled'
        };

        // Calcola il totale se non presente
        let calculatedTotal = order.total;
        if (!calculatedTotal && items.length > 0) {
            calculatedTotal = items.reduce((sum, item) => {
                return sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1));
            }, 0).toFixed(2);
        }

        const result = {
            ...order,
            status: statusMapping[order.status] || order.status,
            total: calculatedTotal,
            items: items
        };

        res.json(result);

    } catch (error) {
        console.error('Error in getOrderById:', error);
        res.status(500).json({ 
            error: 'Errore nel caricamento dell\'ordine',
            message: error.message 
        });
    }
}

// Funzione per creare ordini dal frontend (semplificata)
function createSimpleOrder(req, res) {
    const { 
        table_number, 
        customer_name, 
        items = [], 
        notes,
        status = 'pending' 
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'L\'ordine deve contenere almeno un prodotto' });
    }

    // Calcola il totale
    let total = 0;
    items.forEach(item => {
        total += parseFloat(item.price) * parseInt(item.quantity);
    });

    // Inserisci l'ordine nella tabella esistente
    const orderSql = `
        INSERT INTO orders (table_id, user_id, status, total, payment_method) 
        VALUES (?, 1, ?, ?, 'contanti')
    `;
    
    connection.query(orderSql, [table_number || 1, status, total.toFixed(2)], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const orderId = result.insertId;
        
        // Inserisci gli items (usando la struttura esistente)
        let itemsInserted = 0;
        const totalItems = items.length;
        
        items.forEach(item => {
            // Per ora usa product_variant_id = 1 se non specificato
            const itemSql = `
                INSERT INTO order_items (order_id, product_variant_id, quantity, price_at_sale, subtotal, note)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const subtotal = parseFloat(item.price) * parseInt(item.quantity);
            
            connection.query(itemSql, [
                orderId, 
                item.product_id || 1, 
                item.quantity, 
                item.price, 
                subtotal, 
                item.notes
            ], (err2) => {
                if (err2) console.error('Error inserting item:', err2);
                
                itemsInserted++;
                if (itemsInserted === totalItems) {
                    res.status(201).json({
                        message: 'Ordine creato con successo',
                        id: orderId
                    });
                }
            });
        });
    });
}

// GET statistiche ordini
function getOrdersStats(req, res) {
    const today = new Date().toISOString().split('T')[0];

    const statsQuery = `
        SELECT 
            COUNT(*) as total_orders,
            COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_orders,
            COUNT(CASE WHEN status IN ('pending', 'in_preparazione') THEN 1 END) as pending_orders,
            COUNT(CASE WHEN status IN ('pagato', 'servito') THEN 1 END) as completed_orders,
            COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total ELSE 0 END), 0) as today_revenue,
            COALESCE(AVG(total), 0) as average_order_value
        FROM orders
    `;

    connection.query(statsQuery, [today, today], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
}

/////////////////////////
// TAVOLI (ESISTENTI)
/////////////////////////

// GET tutti i tavoli
function getTables(req, res) {
    const sql = 'SELECT * FROM tables';
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// PATCH aggiornamento stato tavolo
function updateTableStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body; // libero, occupato, in_attesa
    const sql = 'UPDATE tables SET status = ? WHERE id = ?';
    connection.query(sql, [status, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Tavolo non trovato' });
        res.json({ id, status });
    });
}

/////////////////////////
// ORDINI (ESISTENTI)
/////////////////////////

// POST nuovo ordine
function createOrder(req, res) {
    const { table_id, user_id, payment_method } = req.body;
    const sql = 'INSERT INTO orders (table_id, user_id, payment_method) VALUES (?, ?, ?)';
    connection.query(sql, [table_id, user_id, payment_method], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ id: results.insertId, table_id, user_id, payment_method });
    });
}

// GET ordini per tavolo
function getOrdersByTable(req, res) {
    const { table_id } = req.params;
    const sql = 'SELECT * FROM orders WHERE table_id = ?';
    connection.query(sql, [table_id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// PATCH aggiornamento stato ordine
function updateOrderStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    // Mappa gli stati del frontend a quelli del database
    const statusMapping = {
        'pending': 'pending',
        'preparing': 'in_preparazione', 
        'ready': 'pronto',
        'served': 'servito',
        'completed': 'pagato',
        'cancelled': 'annullato'
    };

    const dbStatus = statusMapping[status] || status;
    
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    connection.query(sql, [dbStatus, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Ordine non trovato' });
        res.json({ id, status }); // Ritorna lo status originale del frontend
    });
}

// DELETE ordine
function deleteOrder(req, res) {
    const { id } = req.params;
    const sql = 'DELETE FROM orders WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Ordine non trovato' });
        res.json({ message: 'Ordine eliminato' });
    });
}

/////////////////////////
// ORDER ITEMS
/////////////////////////

function addItemToOrder(req, res) {
    const { order_id, product_variant_id, quantity, price_at_sale, note } = req.body;
    const subtotal = quantity * price_at_sale;

    // 1. Inserisci item
    const sqlInsert = `
        INSERT INTO order_items (order_id, product_variant_id, quantity, price_at_sale, subtotal, note)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(sqlInsert, [order_id, product_variant_id, quantity, price_at_sale, subtotal, note], (err, results) => {
        if (err) return res.status(500).json({ error: err });

        // 2. Aggiorna stock variante
        const sqlVariantStock = `
            UPDATE product_variants
            SET stock = stock - ?
            WHERE id = ?
        `;
        connection.query(sqlVariantStock, [quantity, product_variant_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });

            // 3. Controlla se la variante è birra alla spina
            const sqlKeg = 'SELECT keg_id FROM product_variants WHERE id = ?';
            connection.query(sqlKeg, [product_variant_id], (err3, results3) => {
                if (err3) return res.status(500).json({ error: err3 });
                const kegId = results3[0].keg_id;

                if (kegId) {
                    // decrementa litri residui del fusto
                    const litersSoldPerUnit = 0.5; // esempio: bicchiere 0.5L
                    const totalLiters = quantity * litersSoldPerUnit;

                    const sqlUpdateKeg = `
                        UPDATE kegs
                        SET remaining_liters = remaining_liters - ?
                        WHERE id = ?
                    `;
                    connection.query(sqlUpdateKeg, [totalLiters, kegId], (err4) => {
                        if (err4) return res.status(500).json({ error: err4 });
                        res.status(201).json({ id: results.insertId, order_id, product_variant_id, quantity, price_at_sale, subtotal, note });
                    });
                } else {
                    // non è birra alla spina
                    res.status(201).json({ id: results.insertId, order_id, product_variant_id, quantity, price_at_sale, subtotal, note });
                }
            });
        });
    });
}


function updateOrderItem(req, res) {
    const { id } = req.params;
    const { quantity, price_at_sale } = req.body;

    // 1. Prendi la vecchia quantità e il keg_id
    const sqlOld = `
        SELECT quantity, product_variant_id, pv.keg_id
        FROM order_items oi
        JOIN product_variants pv ON oi.product_variant_id = pv.id
        WHERE oi.id = ?
    `;
    connection.query(sqlOld, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Item non trovato' });

        const oldQuantity = results[0].quantity;
        const variantId = results[0].product_variant_id;
        const kegId = results[0].keg_id;
        const diff = quantity - oldQuantity; // differenza per stock

        // 2. Aggiorna item
        const subtotal = quantity * price_at_sale;
        const sqlUpdate = 'UPDATE order_items SET quantity = ?, price_at_sale = ?, subtotal = ? WHERE id = ?';
        connection.query(sqlUpdate, [quantity, price_at_sale, subtotal, id], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });

            // 3. Aggiorna stock variante
            const sqlStock = 'UPDATE product_variants SET stock = stock - ? WHERE id = ?';
            connection.query(sqlStock, [diff, variantId], (err3) => {
                if (err3) return res.status(500).json({ error: err3 });

                // 4. Aggiorna fusto se presente
                if (kegId) {
                    const litersSoldPerUnit = 0.5; // bicchiere standard
                    const totalLiters = diff * litersSoldPerUnit;

                    const sqlKeg = 'UPDATE kegs SET remaining_liters = remaining_liters - ? WHERE id = ?';
                    connection.query(sqlKeg, [totalLiters, kegId], (err4) => {
                        if (err4) return res.status(500).json({ error: err4 });
                        res.json({ id, quantity, price_at_sale, subtotal });
                    });
                } else {
                    res.json({ id, quantity, price_at_sale, subtotal });
                }
            });
        });
    });
}

function deleteOrderItem(req, res) {
    const { id } = req.params;

    // 1. Prendi quantità e keg_id
    const sqlOld = `
        SELECT quantity, product_variant_id, pv.keg_id
        FROM order_items oi
        JOIN product_variants pv ON oi.product_variant_id = pv.id
        WHERE oi.id = ?
    `;
    connection.query(sqlOld, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Item non trovato' });

        const quantity = results[0].quantity;
        const variantId = results[0].product_variant_id;
        const kegId = results[0].keg_id;

        // 2. Elimina item
        const sqlDelete = 'DELETE FROM order_items WHERE id = ?';
        connection.query(sqlDelete, [id], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });

            // 3. Ripristina stock variante
            const sqlStock = 'UPDATE product_variants SET stock = stock + ? WHERE id = ?';
            connection.query(sqlStock, [quantity, variantId], (err3) => {
                if (err3) return res.status(500).json({ error: err3 });

                // 4. Ripristina fusto se presente
                if (kegId) {
                    const litersSoldPerUnit = 0.5; // bicchiere standard
                    const totalLiters = quantity * litersSoldPerUnit;

                    const sqlKeg = 'UPDATE kegs SET remaining_liters = remaining_liters + ? WHERE id = ?';
                    connection.query(sqlKeg, [totalLiters, kegId], (err4) => {
                        if (err4) return res.status(500).json({ error: err4 });
                        res.json({ message: 'Item eliminato e stock/fusto aggiornati' });
                    });
                } else {
                    res.json({ message: 'Item eliminato e stock aggiornato' });
                }
            });
        });
    });
}


module.exports = {
    // Nuove funzioni per l'admin
    getAllOrders,
    getOrderById,
    createSimpleOrder,
    getOrdersStats,
    
    // Funzioni esistenti
    getTables,
    updateTableStatus,
    createOrder,
    getOrdersByTable,
    updateOrderStatus,
    deleteOrder,
    addItemToOrder,
    updateOrderItem,
    deleteOrderItem
};
