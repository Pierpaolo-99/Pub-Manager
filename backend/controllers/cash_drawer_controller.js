const connection = require('../database/db');

// Registra una nuova operazione di cassa
exports.cashOperation = (req, res) => {
    const { user_id, operation_type, amount, reason } = req.body;
    if (!user_id || !operation_type || !amount) {
        return res.status(400).json({ success: false, error: 'Dati mancanti' });
    }
    const sql = `
        INSERT INTO cash_drawer_operations (user_id, operation_type, amount, reason)
        VALUES (?, ?, ?, ?)
    `;
    connection.query(sql, [user_id, operation_type, amount, reason], (err, result) => {
        if (err) {
            console.error('❌ Error in cashOperation:', err);
            return res.status(500).json({ success: false, error: 'Errore operazione cassa', details: err.message });
        }
        res.json({ success: true, message: 'Operazione registrata', id: result.insertId });
    });
};

// (Opzionale) Lista operazioni di cassa
exports.listOperations = (req, res) => {
    const sql = `SELECT * FROM cash_drawer_operations ORDER BY created_at DESC`;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error in listOperations:', err);
            return res.status(500).json({ success: false, error: 'Errore caricamento operazioni', details: err.message });
        }
        res.json({ success: true, operations: results });
    });
};