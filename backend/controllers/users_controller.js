const connection = require('../database/db');
const bcrypt = require('bcrypt'); // CORRETTO: usa 'bcrypt' non 'bcryptjs'

// GET current user (per autenticazione) - COMPATIBILE CON PASSPORT
function getCurrentUser(req, res) {
    console.log('🔍 getCurrentUser called');
    console.log('Session data:', req.session);
    console.log('User in session:', req.session?.user);
    console.log('Passport user:', req.user);
    
    // Controlla sia req.user (Passport) che req.session.user
    const user = req.user || req.session?.user;
    
    if (user) {
        // Rimuovi la password dalla risposta per sicurezza
        const { password, ...userWithoutPassword } = user;
        res.json({
            success: true,
            user: userWithoutPassword
        });
    } else {
        console.log('❌ No user in session or passport');
        res.status(401).json({
            success: false,
            message: 'Non autenticato'
        });
    }
}

// GET all users
function getAllUsers(req, res) {
    console.log('👥 Getting all users');
    
    const query = `
        SELECT id, username, email, role, first_name, last_name, phone, active, last_login, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC
    `;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching users:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento utenti',
                details: err.message 
            });
        }
        
        // Converti il campo active da tinyint a boolean
        const users = results.map(user => ({
            ...user,
            active: Boolean(user.active)
        }));
        
        console.log(`✅ Found ${users.length} users`);
        res.json(users);
    });
}

// GET user by ID
function getUserById(req, res) {
    const userId = req.params.id;
    
    console.log('👤 Getting user by ID:', userId);
    
    const query = `
        SELECT id, username, email, role, first_name, last_name, phone, active, last_login, created_at, updated_at 
        FROM users 
        WHERE id = ?
    `;
    
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error fetching user:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento utente',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                error: 'Utente non trovato' 
            });
        }
        
        const user = {
            ...results[0],
            active: Boolean(results[0].active)
        };
        
        console.log('✅ User found:', user);
        res.json(user);
    });
}

// POST create new user
function createUser(req, res) {
    const { 
        username, 
        email, 
        password, 
        role = 'waiter', 
        first_name = null, 
        last_name = null, 
        phone = null, 
        active = true 
    } = req.body;
    
    console.log('➕ Creating new user:', { username, email, role, first_name, last_name, phone, active });
    
    // Validazione input
    if (!username || !email || !password) {
        return res.status(400).json({ 
            error: 'Username, email e password sono obbligatori' 
        });
    }
    
    // Verifica se l'utente esiste già
    const checkQuery = 'SELECT id FROM users WHERE email = ? OR username = ?';
    connection.query(checkQuery, [email, username], (err, results) => {
        if (err) {
            console.error('❌ Error checking existing user:', err);
            return res.status(500).json({ 
                error: 'Errore nella verifica utente esistente',
                details: err.message 
            });
        }
        
        if (results.length > 0) {
            return res.status(409).json({ 
                error: 'Username o email già esistente' 
            });
        }
        
        // Hash password (USA BCRYPT come Passport con 10 rounds)
        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                console.error('❌ Error hashing password:', hashErr);
                return res.status(500).json({ 
                    error: 'Errore nella crittografia password' 
                });
            }
            
            const insertQuery = `
                INSERT INTO users (username, email, password, role, first_name, last_name, phone, active, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            
            connection.query(insertQuery, [
                username, 
                email, 
                hashedPassword, 
                role, 
                first_name, 
                last_name, 
                phone, 
                active ? 1 : 0
            ], (insertErr, result) => {
                if (insertErr) {
                    console.error('❌ Error creating user:', insertErr);
                    return res.status(500).json({ 
                        error: 'Errore nella creazione utente',
                        details: insertErr.message 
                    });
                }
                
                console.log('✅ User created successfully with ID:', result.insertId);
                res.status(201).json({ 
                    message: 'Utente creato con successo',
                    user: {
                        id: result.insertId,
                        username,
                        email,
                        role,
                        first_name,
                        last_name,
                        phone,
                        active: Boolean(active)
                    }
                });
            });
        });
    });
}

// PUT update user
function updateUser(req, res) {
    const userId = req.params.id;
    const { username, email, role, first_name, last_name, phone, active, password } = req.body;
    
    console.log('✏️ Updating user:', userId, req.body);
    
    // Verifica se l'utente esiste
    const checkQuery = 'SELECT * FROM users WHERE id = ?';
    connection.query(checkQuery, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error checking user:', err);
            return res.status(500).json({ 
                error: 'Errore nella verifica utente',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                error: 'Utente non trovato' 
            });
        }
        
        // Costruisci la query di update dinamicamente
        const updates = [];
        const values = [];
        
        if (username !== undefined) {
            updates.push('username = ?');
            values.push(username);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email);
        }
        if (role !== undefined) {
            updates.push('role = ?');
            values.push(role);
        }
        if (first_name !== undefined) {
            updates.push('first_name = ?');
            values.push(first_name);
        }
        if (last_name !== undefined) {
            updates.push('last_name = ?');
            values.push(last_name);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone);
        }
        if (active !== undefined) {
            updates.push('active = ?');
            values.push(active ? 1 : 0);
        }
        
        // Se c'è una nuova password, hashala
        if (password) {
            bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                    console.error('❌ Error hashing password:', hashErr);
                    return res.status(500).json({ 
                        error: 'Errore nella crittografia password' 
                    });
                }
                
                updates.push('password = ?');
                values.push(hashedPassword);
                
                executeUpdate();
            });
        } else {
            executeUpdate();
        }
        
        function executeUpdate() {
            if (updates.length === 0) {
                return res.status(400).json({ 
                    error: 'Nessun campo da aggiornare' 
                });
            }
            
            updates.push('updated_at = NOW()');
            values.push(userId);
            
            const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            
            connection.query(updateQuery, values, (updateErr, result) => {
                if (updateErr) {
                    console.error('❌ Error updating user:', updateErr);
                    return res.status(500).json({ 
                        error: 'Errore nell\'aggiornamento utente',
                        details: updateErr.message 
                    });
                }
                
                console.log('✅ User updated successfully');
                res.json({ 
                    message: 'Utente aggiornato con successo',
                    affectedRows: result.affectedRows
                });
            });
        }
    });
}

// DELETE user
function deleteUser(req, res) {
    const userId = req.params.id;
    
    console.log('🗑️ Deleting user:', userId);
    
    // Verifica se l'utente esiste
    const checkQuery = 'SELECT username FROM users WHERE id = ?';
    connection.query(checkQuery, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error checking user:', err);
            return res.status(500).json({ 
                error: 'Errore nella verifica utente',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                error: 'Utente non trovato' 
            });
        }
        
        const deleteQuery = 'DELETE FROM users WHERE id = ?';
        connection.query(deleteQuery, [userId], (deleteErr, result) => {
            if (deleteErr) {
                console.error('❌ Error deleting user:', deleteErr);
                return res.status(500).json({ 
                    error: 'Errore nell\'eliminazione utente',
                    details: deleteErr.message 
                });
            }
            
            console.log('✅ User deleted successfully');
            res.json({ 
                message: 'Utente eliminato con successo',
                deletedUser: results[0].username
            });
        });
    });
}

// Esporta tutte le funzioni
module.exports = {
    getCurrentUser,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
