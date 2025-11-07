const connection = require('../database/db');

/////////////////////////
// NUOVE FUNZIONI MIGLIORATE
/////////////////////////

// GET tutti gli ordini con informazioni tavolo
async function getAllOrders(req, res) {
    console.log('🔄 getAllOrders chiamata');
    try {
        const { 
            status, 
            table_id, 
            customer_name, 
            payment_method,
            date_from,
            date_to,
            limit = 100,
            offset = 0 
        } = req.query;

        let sql = `
            SELECT 
                o.id,
                o.table_id,
                o.user_id,
                o.customer_name,
                o.customer_phone,
                o.customer_email,
                o.status,
                o.total,
                o.subtotal,
                o.tax_amount,
                o.discount_amount,
                o.promotion_id,
                o.payment_method,
                o.payment_status,
                o.notes,
                o.kitchen_notes,
                o.estimated_ready_time,
                o.served_at,
                o.paid_at,
                o.created_at,
                o.updated_at,
                t.number as table_number,
                t.location as table_location,
                t.capacity as table_capacity,
                u.username as waiter_name,
                p.name as promotion_name,
                COUNT(oi.id) as items_count
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN promotions p ON o.promotion_id = p.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Filtri
        if (status) {
            sql += ` AND o.status = ?`;
            params.push(status);
        }
        
        if (table_id) {
            sql += ` AND o.table_id = ?`;
            params.push(table_id);
        }
        
        if (customer_name) {
            sql += ` AND o.customer_name LIKE ?`;
            params.push(`%${customer_name}%`);
        }
        
        if (payment_method) {
            sql += ` AND o.payment_method = ?`;
            params.push(payment_method);
        }
        
        if (date_from) {
            sql += ` AND DATE(o.created_at) >= ?`;
            params.push(date_from);
        }
        
        if (date_to) {
            sql += ` AND DATE(o.created_at) <= ?`;
            params.push(date_to);
        }

        sql += ` 
            GROUP BY o.id 
            ORDER BY o.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        params.push(parseInt(limit), parseInt(offset));

        const orders = await new Promise((resolve, reject) => {
            connection.query(sql, params, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (orders.length === 0) {
            return res.json([]);
        }

        // Carica gli items per ogni ordine
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const itemsQuery = `
                    SELECT 
                        oi.id,
                        oi.quantity,
                        oi.price_at_sale as price,
                        oi.subtotal,
                        oi.notes,
                        oi.status as item_status,
                        pv.name as variant_name,
                        p.name as product_name,
                        p.image as product_image,
                        c.name as category_name
                    FROM order_items oi
                    INNER JOIN product_variants pv ON oi.product_variant_id = pv.id
                    INNER JOIN products p ON pv.product_id = p.id
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE oi.order_id = ?
                    ORDER BY oi.id
                `;

                const items = await new Promise((resolve, reject) => {
                    connection.query(itemsQuery, [order.id], (err2, results) => {
                        if (err2) {
                            console.error('Error loading items for order', order.id, err2);
                            resolve([]);
                        } else {
                            resolve(results.map(item => ({
                                id: item.id,
                                name: `${item.product_name}${item.variant_name !== item.product_name ? ` - ${item.variant_name}` : ''}`,
                                quantity: item.quantity,
                                price: item.price,
                                subtotal: item.subtotal,
                                notes: item.notes,
                                status: item.item_status,
                                image: item.product_image,
                                category: item.category_name
                            })));
                        }
                    });
                });

                // Calcola il totale se non presente
                let calculatedTotal = order.total;
                if (!calculatedTotal && items.length > 0) {
                    calculatedTotal = items.reduce((sum, item) => {
                        return sum + parseFloat(item.subtotal || 0);
                    }, 0).toFixed(2);
                }

                // Determina se l'ordine è urgente
                const now = new Date();
                const orderDate = new Date(order.created_at);
                const diffMinutes = Math.floor((now - orderDate) / (1000 * 60));
                
                let isUrgent = false;
                if (order.status === 'pending' && diffMinutes > 15) isUrgent = true;
                if (order.status === 'in_preparazione' && diffMinutes > 30) isUrgent = true;
                if (order.status === 'pronto' && diffMinutes > 10) isUrgent = true;

                return {
                    ...order,
                    total: calculatedTotal,
                    items: items,
                    isUrgent,
                    waitingTime: diffMinutes
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

// GET singolo ordine con dettagli completi
async function getOrderById(req, res) {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT 
                o.*,
                t.number as table_number,
                t.location as table_location,
                t.capacity as table_capacity,
                u.username as waiter_name,
                p.name as promotion_name,
                p.discount_value as promotion_discount
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN promotions p ON o.promotion_id = p.id
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
        
        // Carica gli items con dettagli prodotto
        const itemsQuery = `
            SELECT 
                oi.*,
                pv.name as variant_name,
                pv.unit as variant_unit,
                p.name as product_name,
                p.description as product_description,
                p.image as product_image,
                c.name as category_name,
                c.icon as category_icon
            FROM order_items oi
            INNER JOIN product_variants pv ON oi.product_variant_id = pv.id
            INNER JOIN products p ON pv.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE oi.order_id = ?
            ORDER BY oi.id
        `;
        
        const items = await new Promise((resolve, reject) => {
            connection.query(itemsQuery, [id], (err2, results) => {
                if (err2) reject(err2);
                else resolve(results.map(item => ({
                    id: item.id,
                    name: `${item.product_name}${item.variant_name !== item.product_name ? ` - ${item.variant_name}` : ''}`,
                    quantity: item.quantity,
                    price: item.price_at_sale,
                    subtotal: item.subtotal,
                    notes: item.notes,
                    status: item.status,
                    product: {
                        name: item.product_name,
                        description: item.product_description,
                        image: item.product_image,
                        category: item.category_name,
                        categoryIcon: item.category_icon
                    },
                    variant: {
                        name: item.variant_name,
                        unit: item.variant_unit
                    }
                })));
            });
        });

        const result = {
            ...order,
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

// POST nuovo ordine migliorato
async function createOrder(req, res) {
    try {
        const {
            table_id,
            customer_name,
            customer_phone,
            customer_email,
            items = [],
            notes,
            kitchen_notes,
            payment_method = 'contanti',
            promotion_id,
            discount_amount = 0
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ 
                error: 'L\'ordine deve contenere almeno un prodotto' 
            });
        }

        // Inizia transazione
        await new Promise((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        try {
            // Calcola totali
            let subtotal = 0;
            for (const item of items) {
                subtotal += parseFloat(item.price) * parseInt(item.quantity);
            }

            const tax_amount = subtotal * 0.22; // 22% IVA
            const total = subtotal + tax_amount - parseFloat(discount_amount);

            // Inserisci ordine principale
            const orderSql = `
                INSERT INTO orders (
                    table_id, user_id, customer_name, customer_phone, customer_email,
                    status, subtotal, tax_amount, discount_amount, total,
                    payment_method, promotion_id, notes, kitchen_notes
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const orderResult = await new Promise((resolve, reject) => {
                connection.query(orderSql, [
                    table_id || null,
                    req.user?.id || 1,
                    customer_name || null,
                    customer_phone || null,
                    customer_email || null,
                    subtotal.toFixed(2),
                    tax_amount.toFixed(2),
                    discount_amount,
                    total.toFixed(2),
                    payment_method,
                    promotion_id || null,
                    notes || null,
                    kitchen_notes || null
                ], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            const orderId = orderResult.insertId;

            // Inserisci items
            for (const item of items) {
                const itemSubtotal = parseFloat(item.price) * parseInt(item.quantity);
                
                const itemSql = `
                    INSERT INTO order_items (
                        order_id, product_variant_id, quantity, 
                        price_at_sale, subtotal, notes
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;

                await new Promise((resolve, reject) => {
                    connection.query(itemSql, [
                        orderId,
                        item.product_variant_id,
                        item.quantity,
                        item.price,
                        itemSubtotal.toFixed(2),
                        item.notes || null
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Aggiorna stock se necessario
                const updateStockSql = `
                    UPDATE product_variants 
                    SET stock = GREATEST(0, stock - ?) 
                    WHERE id = ?
                `;

                await new Promise((resolve, reject) => {
                    connection.query(updateStockSql, [
                        item.quantity,
                        item.product_variant_id
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // Se c'è un tavolo, aggiorna il suo stato
            if (table_id) {
                const updateTableSql = `
                    UPDATE tables 
                    SET status = 'occupied', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `;

                await new Promise((resolve, reject) => {
                    connection.query(updateTableSql, [table_id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // Commit transazione
            await new Promise((resolve, reject) => {
                connection.commit((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Created order ID: ${orderId}`);
            res.status(201).json({
                message: 'Ordine creato con successo',
                id: orderId,
                total: total.toFixed(2)
            });

        } catch (err) {
            // Rollback in caso di errore
            await new Promise((resolve) => {
                connection.rollback(() => resolve());
            });
            throw err;
        }

    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            error: 'Errore nella creazione ordine',
            message: error.message
        });
    }
}

// PATCH aggiornamento stato ordine migliorato
async function updateOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Stato è obbligatorio' });
        }

        // Prepara campi aggiuntivi in base al nuovo stato
        let additionalFields = {};
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (status === 'servito' && !additionalFields.served_at) {
            additionalFields.served_at = now;
        }
        
        if (status === 'pagato' && !additionalFields.paid_at) {
            additionalFields.paid_at = now;
            additionalFields.payment_status = 'completed';
        }

        // Costruisci query dinamica
        let updateFields = ['status = ?'];
        let updateValues = [status];

        Object.entries(additionalFields).forEach(([field, value]) => {
            updateFields.push(`${field} = ?`);
            updateValues.push(value);
        });

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        const sql = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;

        const result = await new Promise((resolve, reject) => {
            connection.query(sql, updateValues, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ordine non trovato' });
        }

        // Se l'ordine è completato/pagato, libera il tavolo
        if (['pagato', 'annullato'].includes(status)) {
            const getTableSql = 'SELECT table_id FROM orders WHERE id = ?';
            
            const tableResult = await new Promise((resolve, reject) => {
                connection.query(getTableSql, [id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (tableResult.length > 0 && tableResult[0].table_id) {
                const updateTableSql = `
                    UPDATE tables 
                    SET status = 'free', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `;

                await new Promise((resolve, reject) => {
                    connection.query(updateTableSql, [tableResult[0].table_id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }

        console.log(`✅ Updated order ${id} to status: ${status}`);
        res.json({ 
            message: 'Stato ordine aggiornato con successo',
            id: parseInt(id),
            status,
            ...additionalFields
        });

    } catch (error) {
        console.error('❌ Error updating order status:', error);
        res.status(500).json({
            error: 'Errore nell\'aggiornamento stato ordine',
            message: error.message
        });
    }
}

// DELETE ordine migliorato
async function deleteOrder(req, res) {
    try {
        const { id } = req.params;

        // Inizia transazione
        await new Promise((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        try {
            // Ottieni info ordine
            const getOrderSql = 'SELECT table_id, status FROM orders WHERE id = ?';
            
            const orderInfo = await new Promise((resolve, reject) => {
                connection.query(getOrderSql, [id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (orderInfo.length === 0) {
                return res.status(404).json({ message: 'Ordine non trovato' });
            }

            // Non permettere eliminazione di ordini pagati
            if (['pagato'].includes(orderInfo[0].status)) {
                return res.status(400).json({ 
                    error: 'Non è possibile eliminare un ordine già pagato' 
                });
            }

            // Elimina items ordine
            const deleteItemsSql = 'DELETE FROM order_items WHERE order_id = ?';
            
            await new Promise((resolve, reject) => {
                connection.query(deleteItemsSql, [id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Elimina ordine
            const deleteOrderSql = 'DELETE FROM orders WHERE id = ?';
            
            const result = await new Promise((resolve, reject) => {
                connection.query(deleteOrderSql, [id], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            // Libera tavolo se necessario
            if (orderInfo[0].table_id) {
                const updateTableSql = `
                    UPDATE tables 
                    SET status = 'free', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `;

                await new Promise((resolve, reject) => {
                    connection.query(updateTableSql, [orderInfo[0].table_id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // Commit transazione
            await new Promise((resolve, reject) => {
                connection.commit((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Deleted order ID: ${id}`);
            res.json({ message: 'Ordine eliminato con successo' });

        } catch (err) {
            // Rollback in caso di errore
            await new Promise((resolve) => {
                connection.rollback(() => resolve());
            });
            throw err;
        }

    } catch (error) {
        console.error('❌ Error deleting order:', error);
        res.status(500).json({
            error: 'Errore nell\'eliminazione ordine',
            message: error.message
        });
    }
}

// GET statistiche ordini migliorate
function getOrdersStats(req, res) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const statsQuery = `
        SELECT 
            COUNT(*) as total_orders,
            COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_orders,
            COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as yesterday_orders,
            COUNT(CASE WHEN status IN ('pending', 'in_preparazione') THEN 1 END) as pending_orders,
            COUNT(CASE WHEN status = 'pronto' THEN 1 END) as ready_orders,
            COUNT(CASE WHEN status IN ('servito', 'pagato') THEN 1 END) as completed_orders,
            COUNT(CASE WHEN status = 'annullato' THEN 1 END) as cancelled_orders,
            COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total ELSE 0 END), 0) as today_revenue,
            COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total ELSE 0 END), 0) as yesterday_revenue,
            COALESCE(AVG(total), 0) as average_order_value,
            COUNT(CASE WHEN table_id IS NOT NULL THEN 1 END) as dine_in_orders,
            COUNT(CASE WHEN table_id IS NULL THEN 1 END) as takeaway_orders
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;

    connection.query(statsQuery, [today, yesterdayStr, today, yesterdayStr], (err, results) => {
        if (err) {
            console.error('Error fetching orders stats:', err);
            return res.status(500).json({ 
                error: err.message,
                // Fallback data
                total_orders: 0,
                today_orders: 0,
                pending_orders: 0,
                ready_orders: 0,
                completed_orders: 0,
                today_revenue: 0,
                revenue_trend: 0
            });
        }

        const stats = results[0] || {};
        
        // Assicurati che tutti i valori siano numerici
        const processedStats = {
            total_orders: parseInt(stats.total_orders) || 0,
            today_orders: parseInt(stats.today_orders) || 0,
            yesterday_orders: parseInt(stats.yesterday_orders) || 0,
            pending_orders: parseInt(stats.pending_orders) || 0,
            ready_orders: parseInt(stats.ready_orders) || 0,
            completed_orders: parseInt(stats.completed_orders) || 0,
            cancelled_orders: parseInt(stats.cancelled_orders) || 0,
            today_revenue: parseFloat(stats.today_revenue) || 0,
            yesterday_revenue: parseFloat(stats.yesterday_revenue) || 0,
            average_order_value: parseFloat(stats.average_order_value) || 0,
            dine_in_orders: parseInt(stats.dine_in_orders) || 0,
            takeaway_orders: parseInt(stats.takeaway_orders) || 0
        };
        
        // Calcola trend in modo sicuro
        const revenueChange = processedStats.yesterday_revenue > 0 
            ? ((processedStats.today_revenue - processedStats.yesterday_revenue) / processedStats.yesterday_revenue * 100)
            : 0;

        processedStats.revenue_trend = parseFloat(revenueChange.toFixed(1));

        console.log('✅ Orders stats processed:', processedStats);
        res.json(processedStats);
    });
}

// GET tavoli con stato
function getTablesWithStatus(req, res) {
    const sql = `
        SELECT 
            t.*,
            o.id as current_order_id,
            o.total as current_order_total,
            o.status as current_order_status,
            COUNT(oi.id) as current_order_items
        FROM tables t
        LEFT JOIN orders o ON t.id = o.table_id 
            AND o.status IN ('pending', 'in_preparazione', 'pronto', 'servito')
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE t.active = 1
        GROUP BY t.id
        ORDER BY t.number
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching tables:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const tables = results.map(table => ({
            ...table,
            active: Boolean(table.active),
            currentOrder: table.current_order_id ? {
                id: table.current_order_id,
                total: table.current_order_total,
                status: table.current_order_status,
                items: table.current_order_items || 0
            } : null
        }));
        
        res.json(tables);
    });
}

/////////////////////////
// FUNZIONI ESISTENTI (mantenute per compatibilità)
/////////////////////////

// Funzione per creare ordini dal frontend (semplificata - deprecata)
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

    let total = 0;
    items.forEach(item => {
        total += parseFloat(item.price) * parseInt(item.quantity);
    });

    const orderSql = `
        INSERT INTO orders (table_id, user_id, status, total, payment_method) 
        VALUES (?, 1, ?, ?, 'contanti')
    `;
    
    connection.query(orderSql, [table_number || 1, status, total.toFixed(2)], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const orderId = result.insertId;
        
        let itemsInserted = 0;
        const totalItems = items.length;
        
        items.forEach(item => {
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

module.exports = {
    // Funzioni principali migliorate
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    getOrdersStats,
    getTablesWithStatus,
    
    // Funzioni legacy (per compatibilità)
    createSimpleOrder
};
