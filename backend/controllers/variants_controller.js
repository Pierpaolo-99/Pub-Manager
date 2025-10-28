const connection = require('../database/db')

function indexVariants (req,res){

    const sql = 'SELECT * FROM product_variants'

    connection.query(sql, (err,results) => {
        if (err) return res.status(500).json({error: err});
        res.json(results)
    })
}

function showVariant(req, res) {
    const { id } = req.params;

    const sql = 'SELECT * FROM product_variants WHERE id = ?';

    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Variant not found' });
        res.json(results[0])
    })
}

// GET varianti di un singolo prodotto
function byProduct(req, res) {
    const { product_id } = req.params;
    const sql = 'SELECT * FROM product_variants WHERE product_id = ?';
    connection.query(sql, [product_id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

function createVariant(req, res) {
    const { product_id, name, price, stock, low_stock_threshold, is_active, unit } = req.body;
    const sql = `
        INSERT INTO product_variants 
        (product_id, name, price, stock, low_stock_threshold, is_active, unit)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    connection.query(sql, [product_id, name, price, stock, low_stock_threshold, is_active, unit], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({
            id: results.insertId,
            product_id,
            name,
            price,
            stock,
            low_stock_threshold,
            is_active,
            unit
        });
    });
}

function updateVariant(req, res) {
    const { id } = req.params;
    const { name, price, stock, low_stock_threshold, is_active, unit } = req.body;
    const sql = `
        UPDATE product_variants 
        SET name = ?, price = ?, stock = ?, low_stock_threshold = ?, is_active = ?, unit = ? 
        WHERE id = ?
    `;
    connection.query(sql, [name, price, stock, low_stock_threshold, is_active, unit, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Variante non trovata' });
        res.json({ id, name, price, stock, low_stock_threshold, is_active, unit });
    });
}

function destroyVariant(req, res) {
    const { id } = req.params;
    const sql = 'DELETE FROM product_variants WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Variante non trovata' });
        res.json({ message: 'Variante eliminata' });
    });
}

module.exports = {
    indexVariants,
    showVariant,
    byProduct,
    createVariant,
    updateVariant,
    destroyVariant
}