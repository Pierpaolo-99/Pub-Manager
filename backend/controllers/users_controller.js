const connection = require('../database/db');
const bcrypt = require('bcrypt');
const passport = require('passport');

// GET tutti gli utenti
function getUsers(req, res) {
    const sql = 'SELECT id, name, email, role, created_at FROM users';
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
}

// POST registra nuovo utente (usando Passport)
function registerUser(req, res, next) {
    passport.authenticate('register', (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Registration error', error: err });
        }
        if (!user) {
            return res.status(400).json({ success: false, message: info.message || 'Registration failed' });
        }
        
        // Login automatico dopo registrazione
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Auto-login failed', error: err });
            }
            res.status(201).json({ 
                success: true, 
                user: user,
                message: 'Registration successful' 
            });
        });
    })(req, res, next);
}

// POST login utente (usando Passport)
function loginUser(req, res, next) {
    passport.authenticate('login', (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Login error', error: err });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: info.message || 'Invalid credentials' });
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Login failed', error: err });
            }
            res.json({ 
                success: true, 
                user: user,
                message: 'Login successful' 
            });
        });
    })(req, res, next);
}

// PATCH aggiornamento utente
function updateUser(req, res) {
    const { id } = req.params;
    const { name, email, password, role, active } = req.body;
    
    // Verifica che l'utente sia autorizzato a modificare
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Solo admin o il proprio profilo
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
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
        if (err) return res.status(500).json({ success: false, error: err });
        if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, id, name, email, role, active });
    });
}

// DELETE utente
function deleteUser(req, res) {
    const { id } = req.params;
    
    // Solo admin può eliminare utenti
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    const sql = 'DELETE FROM users WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err });
        if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'Utente eliminato' });
    });
}

// Verifica status autenticazione
const checkAuthStatus = (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            success: true, 
            user: req.user 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }
};

// Logout
const logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Logout failed' 
            });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Session destroy failed' 
                });
            }
            res.clearCookie('connect.sid');
            res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        });
    });
};

// Middleware per verificare autenticazione
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Authentication required' });
};

// Middleware per verificare ruolo admin
const requireAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ success: false, message: 'Admin access required' });
};

module.exports = {
    getUsers,
    registerUser,
    loginUser,
    updateUser,
    deleteUser,
    checkAuthStatus,
    logout,
    requireAuth,
    requireAdmin
};
