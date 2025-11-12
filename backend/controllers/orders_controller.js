const connection = require('../database/db');

// GET tutti gli ordini con informazioni tavolo
function getAllOrders(req, res) {
    console.log('🔄 getAllOrders chiamata');
    
    const { 
        status, 
        table_id, 
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
            o.total,
            o.status,
            o.payment_method,
            o.notes,
            o.created_at,
            o.updated_at,
            t.number as table_number,
            t.location as table_location,
            t.capacity as table_capacity,
            u.username as waiter_name,
            COUNT(oi.id) as items_count
        FROM orders o
        LEFT JOIN tables t ON o.table_id = t.id
        LEFT JOIN users u ON o.user_id = u.id
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
        GROUP BY o.id, o.table_id, o.user_id, o.total, o.status, o.payment_method, o.notes, o.created_at, o.updated_at,
                 t.number, t.location, t.capacity, u.username
        ORDER BY o.created_at DESC 
        LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Executing orders query with params:', params);
    
    connection.query(sql, params, async (err, orders) => {
        if (err) {
            console.error('❌ Error fetching orders:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento degli ordini',
                details: err.message 
            });
        }

        if (orders.length === 0) {
            return res.json({
                success: true,
                orders: [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: 0
                }
            });
        }

        // Carica gli items per ogni ordine
        try {
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
                            pv.sku as variant_sku,
                            p.name as product_name,
                            p.image_url as product_image,
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
                                    price: parseFloat(item.price),
                                    subtotal: parseFloat(item.subtotal),
                                    notes: item.notes,
                                    status: item.item_status,
                                    sku: item.variant_sku,
                                    product_name: item.product_name,
                                    variant_name: item.variant_name,
                                    image: item.product_image,
                                    category: item.category_name
                                })));
                            }
                        });
                    });

                    // Calcola il totale verificato
                    const calculatedTotal = items.reduce((sum, item) => {
                        return sum + (parseFloat(item.subtotal) || 0);
                    }, 0);

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
                        total: parseFloat(order.total),
                        calculated_total: parseFloat(calculatedTotal.toFixed(2)),
                        items: items,
                        isUrgent,
                        waitingTime: diffMinutes
                    };
                })
            );

            console.log(`✅ Caricati ${ordersWithItems.length} ordini con items`);
            res.json({
                success: true,
                orders: ordersWithItems,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: ordersWithItems.length
                }
            });

        } catch (itemsError) {
            console.error('❌ Error loading order items:', itemsError);
            res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento dettagli ordini',
                details: itemsError.message 
            });
        }
    });
}

// GET singolo ordine con dettagli completi
function getOrderById(req, res) {
    const { id } = req.params;
    
    console.log('🔍 Getting order by ID:', id);
    
    const sql = `
        SELECT 
            o.*,
            t.number as table_number,
            t.location as table_location,
            t.capacity as table_capacity,
            u.username as waiter_name
        FROM orders o
        LEFT JOIN tables t ON o.table_id = t.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `;
    
    connection.query(sql, [id], (err, orders) => {
        if (err) {
            console.error('❌ Error fetching order:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento ordine',
                details: err.message 
            });
        }

        if (orders.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Ordine non trovato' 
            });
        }

        const order = orders[0];
        
        // Carica gli items con dettagli prodotto
        const itemsQuery = `
            SELECT 
                oi.*,
                pv.name as variant_name,
                pv.sku as variant_sku,
                p.name as product_name,
                p.description as product_description,
                p.image_url as product_image,
                c.name as category_name,
                c.icon as category_icon
            FROM order_items oi
            INNER JOIN product_variants pv ON oi.product_variant_id = pv.id
            INNER JOIN products p ON pv.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE oi.order_id = ?
            ORDER BY oi.id
        `;
        
        connection.query(itemsQuery, [id], (err2, items) => {
            if (err2) {
                console.error('❌ Error fetching order items:', err2);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nel caricamento items ordine',
                    details: err2.message 
                });
            }

            const processedItems = items.map(item => ({
                id: item.id,
                name: `${item.product_name}${item.variant_name !== item.product_name ? ` - ${item.variant_name}` : ''}`,
                quantity: item.quantity,
                price: parseFloat(item.price_at_sale),
                subtotal: parseFloat(item.subtotal),
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
                    sku: item.variant_sku
                }
            }));

            const result = {
                ...order,
                total: parseFloat(order.total),
                items: processedItems
            };

            console.log(`✅ Order ${id} loaded with ${processedItems.length} items`);
            res.json({
                success: true,
                order: result
            });
        });
    });
}

// POST nuovo ordine corretto
function createOrder(req, res) {
    const {
        table_id,
        items = [],
        notes,
        payment_method = 'contanti'
    } = req.body;

    console.log('➕ Creating new order:', { table_id, items: items.length, payment_method });

    if (!items || items.length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'L\'ordine deve contenere almeno un prodotto' 
        });
    }

    // Validazione items
    for (const item of items) {
        if (!item.product_variant_id || !item.quantity || !item.price) {
            return res.status(400).json({ 
                success: false,
                error: 'Ogni item deve avere product_variant_id, quantity e price' 
            });
        }
    }

    // Inizia transazione
    connection.beginTransaction((err) => {
        if (err) {
            console.error('❌ Transaction error:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nell\'avvio transazione',
                details: err.message 
            });
        }

        // Calcola totale
        let total = 0;
        for (const item of items) {
            total += parseFloat(item.price) * parseInt(item.quantity);
        }

        // Inserisci ordine principale
        const orderSql = `
            INSERT INTO orders (
                table_id, user_id, total, status, payment_method, notes, created_at, updated_at
            ) VALUES (?, ?, ?, 'pending', ?, ?, NOW(), NOW())
        `;

        connection.query(orderSql, [
            table_id || null,
            req.user?.id || 1,
            total.toFixed(2),
            payment_method,
            notes || null
        ], (orderErr, orderResult) => {
            if (orderErr) {
                return connection.rollback(() => {
                    console.error('❌ Error creating order:', orderErr);
                    res.status(500).json({
                        success: false,
                        error: 'Errore nella creazione ordine',
                        details: orderErr.message
                    });
                });
            }

            const orderId = orderResult.insertId;
            let itemsProcessed = 0;
            let hasError = false;

            // Inserisci items
            items.forEach((item) => {
                const itemSubtotal = parseFloat(item.price) * parseInt(item.quantity);
                
                const itemSql = `
                    INSERT INTO order_items (
                        order_id, product_variant_id, quantity, 
                        price_at_sale, subtotal, notes, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
                `;

                connection.query(itemSql, [
                    orderId,
                    item.product_variant_id,
                    item.quantity,
                    item.price,
                    itemSubtotal.toFixed(2),
                    item.notes || null
                ], (itemErr) => {
                    if (itemErr && !hasError) {
                        hasError = true;
                        return connection.rollback(() => {
                            console.error('❌ Error creating order item:', itemErr);
                            res.status(500).json({
                                success: false,
                                error: 'Errore nella creazione item ordine',
                                details: itemErr.message
                            });
                        });
                    }

                    itemsProcessed++;
                    if (itemsProcessed === items.length && !hasError) {
                        // Tutti gli items inseriti, aggiorna stock tramite stock_movements
                        let stockUpdatesProcessed = 0;
                        
                        items.forEach((item) => {
                            // Crea movimento stock OUT
                            const movementSql = `
                                INSERT INTO stock_movements (
                                    product_variant_id, type, quantity, reason, 
                                    reference_id, reference_type, user_id, created_at
                                ) VALUES (?, 'out', ?, 'Vendita ordine', ?, 'order', ?, NOW())
                            `;

                            connection.query(movementSql, [
                                item.product_variant_id,
                                item.quantity,
                                orderId,
                                req.user?.id || 1
                            ], (movErr) => {
                                if (movErr) {
                                    console.error('⚠️ Warning - Error creating stock movement:', movErr);
                                    // Non bloccare l'ordine per errori di stock
                                }

                                // Aggiorna quantità stock se esiste
                                const updateStockSql = `
                                    UPDATE stock 
                                    SET quantity = GREATEST(0, quantity - ?)
                                    WHERE product_variant_id = ?
                                `;

                                connection.query(updateStockSql, [
                                    item.quantity,
                                    item.product_variant_id
                                ], (stockErr) => {
                                    if (stockErr) {
                                        console.error('⚠️ Warning - Error updating stock:', stockErr);
                                        // Non bloccare l'ordine per errori di stock
                                    }

                                    stockUpdatesProcessed++;
                                    if (stockUpdatesProcessed === items.length) {
                                        // Aggiorna stato tavolo se necessario
                                        if (table_id) {
                                            const updateTableSql = `
                                                UPDATE tables 
                                                SET status = 'occupied', updated_at = NOW() 
                                                WHERE id = ?
                                            `;

                                            connection.query(updateTableSql, [table_id], (tableErr) => {
                                                if (tableErr) {
                                                    console.error('⚠️ Warning - Error updating table:', tableErr);
                                                }

                                                // Commit transazione
                                                connection.commit((commitErr) => {
                                                    if (commitErr) {
                                                        return connection.rollback(() => {
                                                            console.error('❌ Commit error:', commitErr);
                                                            res.status(500).json({
                                                                success: false,
                                                                error: 'Errore nel completamento ordine',
                                                                details: commitErr.message
                                                            });
                                                        });
                                                    }

                                                    console.log(`✅ Created order ID: ${orderId} with ${items.length} items`);
                                                    res.status(201).json({
                                                        success: true,
                                                        message: 'Ordine creato con successo',
                                                        order: {
                                                            id: orderId,
                                                            total: parseFloat(total.toFixed(2)),
                                                            items: items.length
                                                        }
                                                    });
                                                });
                                            });
                                        } else {
                                            // Nessun tavolo, commit diretto
                                            connection.commit((commitErr) => {
                                                if (commitErr) {
                                                    return connection.rollback(() => {
                                                        console.error('❌ Commit error:', commitErr);
                                                        res.status(500).json({
                                                            success: false,
                                                            error: 'Errore nel completamento ordine',
                                                            details: commitErr.message
                                                        });
                                                    });
                                                }

                                                console.log(`✅ Created order ID: ${orderId} with ${items.length} items`);
                                                res.status(201).json({
                                                    success: true,
                                                    message: 'Ordine creato con successo',
                                                    order: {
                                                        id: orderId,
                                                        total: parseFloat(total.toFixed(2)),
                                                        items: items.length
                                                    }
                                                });
                                            });
                                        }
                                    }
                                });
                            });
                        });
                    }
                });
            });
        });
    });
}

// PATCH aggiornamento stato ordine
function updateOrderStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    console.log('✏️ Updating order status:', { id, status });

    if (!status) {
        return res.status(400).json({ 
            success: false,
            error: 'Stato è obbligatorio' 
        });
    }

    // Valida stati possibili
    const validStatuses = ['pending', 'in_preparazione', 'pronto', 'servito', 'pagato', 'annullato'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            success: false,
            error: 'Stato non valido',
            validStatuses
        });
    }

    const sql = `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`;

    connection.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error('❌ Error updating order status:', err);
            return res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento stato ordine',
                details: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Ordine non trovato' 
            });
        }

        // Se l'ordine è completato/annullato, libera il tavolo
        if (['pagato', 'annullato'].includes(status)) {
            const getTableSql = 'SELECT table_id FROM orders WHERE id = ?';
            
            connection.query(getTableSql, [id], (tableErr, tableResults) => {
                if (!tableErr && tableResults.length > 0 && tableResults[0].table_id) {
                    const updateTableSql = `
                        UPDATE tables 
                        SET status = 'free', updated_at = NOW() 
                        WHERE id = ?
                    `;

                    connection.query(updateTableSql, [tableResults[0].table_id], (updateTableErr) => {
                        if (updateTableErr) {
                            console.error('⚠️ Warning - Error freeing table:', updateTableErr);
                        }
                    });
                }
            });
        }

        console.log(`✅ Updated order ${id} to status: ${status}`);
        res.json({ 
            success: true,
            message: 'Stato ordine aggiornato con successo',
            order: {
                id: parseInt(id),
                status
            }
        });
    });
}

// DELETE ordine
function deleteOrder(req, res) {
    const { id } = req.params;

    console.log('🗑️ Deleting order:', id);

    // Inizia transazione
    connection.beginTransaction((err) => {
        if (err) {
            console.error('❌ Transaction error:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nell\'avvio transazione',
                details: err.message 
            });
        }

        // Ottieni info ordine
        const getOrderSql = 'SELECT table_id, status FROM orders WHERE id = ?';
        
        connection.query(getOrderSql, [id], (orderErr, orderInfo) => {
            if (orderErr) {
                return connection.rollback(() => {
                    console.error('❌ Error getting order info:', orderErr);
                    res.status(500).json({ 
                        success: false,
                        error: 'Errore nel caricamento info ordine',
                        details: orderErr.message 
                    });
                });
            }

            if (orderInfo.length === 0) {
                return connection.rollback(() => {
                    res.status(404).json({ 
                        success: false,
                        error: 'Ordine non trovato' 
                    });
                });
            }

            // Non permettere eliminazione di ordini pagati
            if (['pagato'].includes(orderInfo[0].status)) {
                return connection.rollback(() => {
                    res.status(400).json({ 
                        success: false,
                        error: 'Non è possibile eliminare un ordine già pagato' 
                    });
                });
            }

            // Elimina items ordine
            const deleteItemsSql = 'DELETE FROM order_items WHERE order_id = ?';
            
            connection.query(deleteItemsSql, [id], (itemsErr) => {
                if (itemsErr) {
                    return connection.rollback(() => {
                        console.error('❌ Error deleting order items:', itemsErr);
                        res.status(500).json({ 
                            success: false,
                            error: 'Errore nell\'eliminazione items',
                            details: itemsErr.message 
                        });
                    });
                }

                // Elimina ordine
                const deleteOrderSql = 'DELETE FROM orders WHERE id = ?';
                
                connection.query(deleteOrderSql, [id], (deleteErr, result) => {
                    if (deleteErr) {
                        return connection.rollback(() => {
                            console.error('❌ Error deleting order:', deleteErr);
                            res.status(500).json({ 
                                success: false,
                                error: 'Errore nell\'eliminazione ordine',
                                details: deleteErr.message 
                            });
                        });
                    }

                    // Libera tavolo se necessario
                    if (orderInfo[0].table_id) {
                        const updateTableSql = `
                            UPDATE tables 
                            SET status = 'free', updated_at = NOW() 
                            WHERE id = ?
                        `;

                        connection.query(updateTableSql, [orderInfo[0].table_id], (tableErr) => {
                            if (tableErr) {
                                console.error('⚠️ Warning - Error freeing table:', tableErr);
                            }

                            // Commit transazione
                            connection.commit((commitErr) => {
                                if (commitErr) {
                                    return connection.rollback(() => {
                                        console.error('❌ Commit error:', commitErr);
                                        res.status(500).json({ 
                                            success: false,
                                            error: 'Errore nel completamento eliminazione',
                                            details: commitErr.message 
                                        });
                                    });
                                }

                                console.log(`✅ Deleted order ID: ${id}`);
                                res.json({ 
                                    success: true,
                                    message: 'Ordine eliminato con successo' 
                                });
                            });
                        });
                    } else {
                        // Nessun tavolo, commit diretto
                        connection.commit((commitErr) => {
                            if (commitErr) {
                                return connection.rollback(() => {
                                    console.error('❌ Commit error:', commitErr);
                                    res.status(500).json({ 
                                        success: false,
                                        error: 'Errore nel completamento eliminazione',
                                        details: commitErr.message 
                                    });
                                });
                            }

                            console.log(`✅ Deleted order ID: ${id}`);
                            res.json({ 
                                success: true,
                                message: 'Ordine eliminato con successo' 
                            });
                        });
                    }
                });
            });
        });
    });
}

// GET statistiche ordini
function getOrdersStats(req, res) {
    console.log('📊 Getting orders statistics');
    
    const today = new Date().toISOString().split('T')[0];
    
    const statsQuery = `
        SELECT 
            COUNT(*) as total_orders,
            COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_orders,
            COUNT(CASE WHEN status IN ('pending', 'in_preparazione') THEN 1 END) as pending_orders,
            COUNT(CASE WHEN status = 'pronto' THEN 1 END) as ready_orders,
            COUNT(CASE WHEN status IN ('servito', 'pagato') THEN 1 END) as completed_orders,
            COUNT(CASE WHEN status = 'annullato' THEN 1 END) as cancelled_orders,
            COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total ELSE 0 END), 0) as today_revenue,
            COALESCE(AVG(total), 0) as average_order_value,
            COUNT(CASE WHEN table_id IS NOT NULL THEN 1 END) as dine_in_orders,
            COUNT(CASE WHEN table_id IS NULL THEN 1 END) as takeaway_orders
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;

    connection.query(statsQuery, [today, today], (err, results) => {
        if (err) {
            console.error('❌ Error fetching orders stats:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento statistiche',
                details: err.message,
                // Fallback data
                stats: {
                    total_orders: 0,
                    today_orders: 0,
                    pending_orders: 0,
                    ready_orders: 0,
                    completed_orders: 0,
                    today_revenue: 0
                }
            });
        }

        const stats = results[0] || {};
        
        // Assicurati che tutti i valori siano numerici
        const processedStats = {
            total_orders: parseInt(stats.total_orders) || 0,
            today_orders: parseInt(stats.today_orders) || 0,
            pending_orders: parseInt(stats.pending_orders) || 0,
            ready_orders: parseInt(stats.ready_orders) || 0,
            completed_orders: parseInt(stats.completed_orders) || 0,
            cancelled_orders: parseInt(stats.cancelled_orders) || 0,
            today_revenue: parseFloat(stats.today_revenue) || 0,
            average_order_value: parseFloat(stats.average_order_value) || 0,
            dine_in_orders: parseInt(stats.dine_in_orders) || 0,
            takeaway_orders: parseInt(stats.takeaway_orders) || 0
        };

        console.log('✅ Orders stats calculated:', processedStats);
        res.json({
            success: true,
            stats: processedStats
        });
    });
}

// GET tavoli con stato corrente
function getTablesWithStatus(req, res) {
    console.log('🏪 Getting tables with current status');
    
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
        GROUP BY t.id, t.number, t.location, t.capacity, t.status, t.active, t.notes, t.created_at, t.updated_at,
                 o.id, o.total, o.status
        ORDER BY t.number
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching tables:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento tavoli',
                details: err.message 
            });
        }
        
        const tables = results.map(table => ({
            ...table,
            active: Boolean(table.active),
            current_order_total: table.current_order_total ? parseFloat(table.current_order_total) : null,
            current_order_items: parseInt(table.current_order_items) || 0,
            currentOrder: table.current_order_id ? {
                id: table.current_order_id,
                total: parseFloat(table.current_order_total),
                status: table.current_order_status,
                items: parseInt(table.current_order_items) || 0
            } : null
        }));
        
        console.log(`✅ Found ${tables.length} tables`);
        res.json({
            success: true,
            tables: tables
        });
    });
}

// Checkout ordine (pagamento)
exports.checkoutOrder = (req, res) => {
    const { id } = req.params;
    const { payment_method, change_given } = req.body;

    const sql = `
        UPDATE orders 
        SET status = 'pagato', payment_status = 'completed', payment_method = ?, change_given = ?, paid_at = NOW(), updated_at = NOW()
        WHERE id = ?
    `;
    connection.query(sql, [payment_method, change_given, id], (err, result) => {
        if (err) {
            console.error('❌ Error in checkoutOrder:', err);
            return res.status(500).json({ success: false, error: 'Errore nel checkout', details: err.message });
        }
        res.json({ success: true, message: 'Pagamento completato', order_id: id });
    });
};

// Rimborso ordine
exports.refundOrder = (req, res) => {
    const { id } = req.params;
    const { amount, reason } = req.body;

    // Aggiorna status ordine e registra rimborso (aggiungi tabella refunds se vuoi tracciare)
    const sql = `
        UPDATE orders 
        SET status = 'annullato', payment_status = 'failed', updated_at = NOW()
        WHERE id = ?
    `;
    connection.query(sql, [id], (err) => {
        if (err) {
            console.error('❌ Error in refundOrder:', err);
            return res.status(500).json({ success: false, error: 'Errore nel rimborso', details: err.message });
        }
        // (Opzionale) Inserisci nella tabella refunds
        res.json({ success: true, message: 'Rimborso effettuato', order_id: id });
    });
};

// Sospendi ordine
exports.holdOrder = (req, res) => {
    const { id } = req.params;
    const sql = `
        UPDATE orders 
        SET held_at = NOW(), updated_at = NOW()
        WHERE id = ?
    `;
    connection.query(sql, [id], (err) => {
        if (err) {
            console.error('❌ Error in holdOrder:', err);
            return res.status(500).json({ success: false, error: 'Errore nel sospendere ordine', details: err.message });
        }
        res.json({ success: true, message: 'Ordine sospeso', order_id: id });
    });
};

// Recupera ordine sospeso
exports.recallOrder = (req, res) => {
    const { id } = req.params;
    const sql = `
        UPDATE orders 
        SET held_at = NULL, updated_at = NOW()
        WHERE id = ?
    `;
    connection.query(sql, [id], (err) => {
        if (err) {
            console.error('❌ Error in recallOrder:', err);
            return res.status(500).json({ success: false, error: 'Errore nel recuperare ordine', details: err.message });
        }
        res.json({ success: true, message: 'Ordine recuperato', order_id: id });
    });
};

// Applica sconto manuale
exports.applyDiscount = (req, res) => {
    const { id } = req.params;
    const { discount_type, discount_amount } = req.body;

    const sql = `
        UPDATE orders 
        SET discount_type = ?, discount_amount = ?, updated_at = NOW()
        WHERE id = ?
    `;
    connection.query(sql, [discount_type, discount_amount, id], (err) => {
        if (err) {
            console.error('❌ Error in applyDiscount:', err);
            return res.status(500).json({ success: false, error: 'Errore nell\'applicare sconto', details: err.message });
        }
        res.json({ success: true, message: 'Sconto applicato', order_id: id });
    });
};

// Lista ordini sospesi
exports.listHeldOrders = (req, res) => {
    const sql = `
        SELECT * FROM orders WHERE held_at IS NOT NULL ORDER BY held_at DESC
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error in listHeldOrders:', err);
            return res.status(500).json({ success: false, error: 'Errore nel caricamento ordini sospesi', details: err.message });
        }
        res.json({ success: true, orders: results });
    });
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    getOrdersStats,
    getTablesWithStatus
};
