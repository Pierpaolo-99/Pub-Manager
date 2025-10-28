const connection = require('../database/db');

/////////////////////////
// PROMOZIONI CRUD
/////////////////////////

// GET tutte le promozioni
function getPromotions(req, res) {
    const sql = 'SELECT * FROM promotions';
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// POST nuova promozione
function createPromotion(req, res) {
    const { name, description, discount_type, discount_value, start_date, end_date, active } = req.body;
    const sql = `
        INSERT INTO promotions
        (name, description, discount_type, discount_value, start_date, end_date, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    connection.query(sql, [name, description, discount_type, discount_value, start_date, end_date, active || 1], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ id: results.insertId, name, description, discount_type, discount_value, start_date, end_date, active: active || 1 });
    });
}

// PATCH aggiornamento promozione
function updatePromotion(req, res) {
    const { id } = req.params;
    const { name, description, discount_type, discount_value, start_date, end_date, active } = req.body;
    const sql = `
        UPDATE promotions
        SET name = ?, description = ?, discount_type = ?, discount_value = ?, start_date = ?, end_date = ?, active = ?
        WHERE id = ?
    `;
    connection.query(sql, [name, description, discount_type, discount_value, start_date, end_date, active, id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Promozione non trovata' });
        res.json({ id, name, description, discount_type, discount_value, start_date, end_date, active });
    });
}


// DELETE promozione
function deletePromotion(req, res) {
    const { id } = req.params;
    const sql = 'DELETE FROM promotions WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Promozione non trovata' });
        res.json({ message: 'Promozione eliminata' });
    });
}

/////////////////////////
// PROMOZIONI-PRODOTTO
/////////////////////////

// Assegna promozione a prodotto
function addPromotionToProduct(req, res) {
    const { productId, promotionId } = req.body;
    const sql = 'INSERT INTO product_promotions (product_id, promotion_id) VALUES (?, ?)';
    connection.query(sql, [productId, promotionId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ message: 'Promozione assegnata al prodotto', productId, promotionId });
    });
}

// Rimuovi promozione da prodotto
function removePromotionFromProduct(req, res) {
    const { productId, promotionId } = req.params;
    const sql = 'DELETE FROM product_promotions WHERE product_id = ? AND promotion_id = ?';
    connection.query(sql, [productId, promotionId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Promozione rimossa dal prodotto' });
    });
}

module.exports = {
    getPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    addPromotionToProduct,
    removePromotionFromProduct
};
