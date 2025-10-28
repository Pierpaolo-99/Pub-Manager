const connection = require('../database/db');

/////////////////////////
// VARIANTI PRODOTTO
/////////////////////////

// GET stock varianti
function getVariantsStock(req, res) {
    const sql = `
        SELECT pv.id, pv.product_id, pv.name, pv.price, pv.stock, pv.low_stock_threshold, pv.unit, p.name AS product_name
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// PATCH aggiornamento stock variante
function updateVariantStock(req, res) {
    const { id } = req.params;
    const { stock } = req.body; // nuovo valore stock
    const sql = 'UPDATE product_variants SET stock = ? WHERE id = ?';
    connection.query(sql, [stock, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Variante non trovata' });
        res.json({ id, stock });
    });
}

/////////////////////////
// FUSTI / KEGS
/////////////////////////

// GET tutti i fusti
function getKegs(req, res) {
    const sql = `
        SELECT k.id, k.product_id, k.total_liters, k.remaining_liters, k.low_threshold, k.is_active, k.brewed_date, k.expiry_date, p.name AS product_name
        FROM kegs k
        JOIN products p ON k.product_id = p.id
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// PATCH aggiornamento litri residui fusto
function updateKegLiters(req, res) {
    const { id } = req.params;
    const { remaining_liters } = req.body;
    const sql = 'UPDATE kegs SET remaining_liters = ? WHERE id = ?';
    connection.query(sql, [remaining_liters, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Fusto non trovato' });
        res.json({ id, remaining_liters });
    });
}

module.exports = {
    getVariantsStock,
    updateVariantStock,
    getKegs,
    updateKegLiters
};
