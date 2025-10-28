const connection = require('../database/db');

/////////////////////////
// TAVOLI
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
// ORDINI
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
    const { status } = req.body; // in_preparazione, pronto, servito, pagato, annullato
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    connection.query(sql, [status, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Ordine non trovato' });
        res.json({ id, status });
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
