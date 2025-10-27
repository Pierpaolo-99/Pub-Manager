const connection = require('../database/db');

function indexProducts(req, res) {

    const sql = 'SELECT * FROM products';

    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results)
    })
}

function showProduct(req, res) {
    const { id } = req.params;

    const sql = 'SELECT * FROM products WHERE id = ?';

    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(results[0])
    })
}

function createProduct(req, res) {
    const { name, sku, description, category_id, is_available, image_url } = req.body;

    // Controllo campi obbligatori
    if (!name || !sku || !category_id || is_available === undefined) {
        return res.status(400).json({ message: 'Tutti i campi obbligatori devono essere presenti' });
    }

    const sql = `
      INSERT INTO products (name, sku, description, category_id, is_available, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(sql, [name, sku, description, category_id, is_available, image_url || null], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({
            id: results.insertId,
            name,
            sku,
            description,
            category_id,
            is_available,
            image_url
        });
    });
}

function updateProduct(req, res) {
    const productId = req.params.id;
    const { name, sku, description, category_id, is_available, image_url } = req.body;

    const sql = `
      UPDATE products
      SET name = ?, sku = ?, description = ?, category_id = ?, is_available = ?, image_url = ?
      WHERE id = ?
    `;

    connection.query(
        sql,
        [name, sku, description, category_id, is_available, image_url || null, productId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err });
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Prodotto non trovato' });
            }
            res.json({ id: productId, message: 'Prodotto aggiornato con successo' });
        }
    );
}

function destroyProduct(req, res) {
    const productId = req.params.id;

    const sql = 'DELETE FROM products WHERE id = ?';

    connection.query(sql, [productId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Prodotto non trovato' });
        }
        res.json({ id: productId, message: 'Prodotto eliminato con successo' });
    });
}


module.exports = {
    indexProducts,
    showProduct,
    createProduct,
    updateProduct,
    destroyProduct
}