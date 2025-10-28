const connection = require('../database/db');

// GET tutte le categorie
function getCategories(req, res) {
    const sql = 'SELECT * FROM categories';
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// POST nuova categoria
function createCategory(req, res) {
    const { name, slug, description } = req.body;
    const sql = 'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)';
    connection.query(sql, [name, slug, description], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ id: results.insertId, name, slug, description });
    });
}

// PATCH aggiornamento categoria
function updateCategory(req, res) {
    const { id } = req.params;
    const { name, slug, description } = req.body;
    const sql = 'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?';
    connection.query(sql, [name, slug, description, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Categoria non trovata' });
        res.json({ id, name, slug, description });
    });
}

// DELETE categoria
function deleteCategory(req, res) {
    const { id } = req.params;
    const sql = 'DELETE FROM categories WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Categoria non trovata' });
        res.json({ message: 'Categoria eliminata' });
    });
}

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
