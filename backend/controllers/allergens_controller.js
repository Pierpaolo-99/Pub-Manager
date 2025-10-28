const connection = require('../database/db');

/////////////////////////
// ALLERGENI CRUD
/////////////////////////

// GET tutti gli allergeni
function getAllergens(req, res) {
    const sql = 'SELECT * FROM allergens';
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// POST nuovo allergene
function createAllergen(req, res) {
    const { name } = req.body;
    const sql = 'INSERT INTO allergens (name) VALUES (?)';
    connection.query(sql, [name], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ id: results.insertId, name });
    });
}

// PATCH aggiornamento allergene
function updateAllergen(req, res) {
    const { id } = req.params;
    const { name } = req.body;
    const sql = 'UPDATE allergens SET name = ? WHERE id = ?';
    connection.query(sql, [name, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Allergene non trovato' });
        res.json({ id, name });
    });
}

// DELETE allergene
function deleteAllergen(req, res) {
    const { id } = req.params;
    const sql = 'DELETE FROM allergens WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Allergene non trovato' });
        res.json({ message: 'Allergene eliminato' });
    });
}

/////////////////////////
// ALLERGENI-PRODOTTO
/////////////////////////

// Assegna allergene a prodotto
function addAllergenToProduct(req, res) {
    const { productId, allergenId } = req.body;
    const sql = 'INSERT INTO product_allergens (product_id, allergen_id) VALUES (?, ?)';
    connection.query(sql, [productId, allergenId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ message: 'Allergene assegnato al prodotto', productId, allergenId });
    });
}

// Rimuovi allergene da prodotto
function removeAllergenFromProduct(req, res) {
    const { productId, allergenId } = req.params;
    const sql = 'DELETE FROM product_allergens WHERE product_id = ? AND allergen_id = ?';
    connection.query(sql, [productId, allergenId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Allergene rimosso dal prodotto' });
    });
}

module.exports = {
    getAllergens,
    createAllergen,
    updateAllergen,
    deleteAllergen,
    addAllergenToProduct,
    removeAllergenFromProduct
};
