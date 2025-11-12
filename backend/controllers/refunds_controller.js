const connection = require('../database/db');

// Registra un rimborso
exports.createRefund = (req, res) => {
    const { order_id, amount, reason } = req.body;
    if (!order_id || !amount) {
        return res.status(400).json({ success: false, error: 'Dati mancanti' });
    }
    const sql = `
        INSERT INTO refunds (order_id, amount, reason)
        VALUES (?, ?, ?)
    `;
    connection.query(sql, [order_id, amount, reason], (err, result) => {
        if (err) {
            console.error('❌ Error in createRefund:', err);
            return res.status(500).json({ success: false, error: 'Errore rimborso', details: err.message });
        }
        res.json({ success: true, message: 'Rimborso registrato', id: result.insertId });
    });
};

// (Opzionale) Lista rimborsi
exports.listRefunds = (req, res) => {
    const sql = `SELECT * FROM refunds ORDER BY created_at DESC`;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error in listRefunds:', err);
            return res.status(500).json({ success: false, error: 'Errore caricamento rimborsi', details: err.message });
        }
        res.json({ success: true, refunds: results });
    });
};