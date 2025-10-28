const connection = require('../database/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// GET tutti gli utenti
function getUsers(req, res) {
    const sql = 'SELECT id, name, email, role, created_at FROM users';
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// POST registra nuovo utente
function registerUser(req, res) {
    const { name, email, password, role, active } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = 'INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [name, email, hashedPassword, role || 'cameriere', active !== undefined ? active : 1], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ id: results.insertId, name, email, role: role || 'cameriere', active: active !== undefined ? active : 1 });
    });
}

// POST login utente
function loginUser(req, res) {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    connection.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Utente non trovato' });

        const user = results[0];
        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ message: 'Password errata' });
        }

        if (user.active === 0) {
            return res.status(403).json({ message: 'Utente non attivo' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
    });
}

// PATCH aggiornamento utente
function updateUser(req, res) {
    const { id } = req.params;
    const { name, email, password, role, active } = req.body;
    const hashedPassword = password ? bcrypt.hashSync(password, 10) : undefined;

    let sql, params;
    if (hashedPassword) {
        sql = 'UPDATE users SET name = ?, email = ?, password_hash = ?, role = ?, active = ? WHERE id = ?';
        params = [name, email, hashedPassword, role, active, id];
    } else {
        sql = 'UPDATE users SET name = ?, email = ?, role = ?, active = ? WHERE id = ?';
        params = [name, email, role, active, id];
    }

    connection.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Utente non trovato' });
        res.json({ id, name, email, role, active });
    });
}


// DELETE utente
function deleteUser(req, res) {
    const { id } = req.params;
    const sql = 'DELETE FROM users WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Utente non trovato' });
        res.json({ message: 'Utente eliminato' });
    });
}

module.exports = {
    getUsers,
    registerUser,
    loginUser,
    updateUser,
    deleteUser
};
