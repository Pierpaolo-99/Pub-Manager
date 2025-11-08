const connection = require('../database/db');
const bcrypt = require('bcrypt');

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

// GET utente corrente (/api/users/me)
function getCurrentUser(req, res) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Non autenticato' 
    });
  }

  const sql = `
    SELECT 
      id, username, email, role, first_name, last_name, 
      phone, active, last_login, created_at, updated_at
    FROM users 
    WHERE id = ?
  `;
  
  connection.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching current user:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Errore nel caricamento profilo utente',
        details: err.message 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Utente non trovato' 
      });
    }
    
    const user = results[0];
    console.log(`✅ Current user fetched: ${user.username}`);
    
    res.json({ 
      success: true,
      user: user
    });
  });
}

// GET statistiche utenti
function getUserStats(req, res) {
  console.log('📊 Getting user stats');
  
  const sql = `
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN active = 1 THEN 1 END) as active_users,
      COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
      COUNT(CASE WHEN role = 'waiter' THEN 1 END) as waiter_users,
      COUNT(CASE WHEN role = 'kitchen' THEN 1 END) as kitchen_users,
      COUNT(CASE WHEN role = 'cashier' THEN 1 END) as cashier_users,
      COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_today,
      COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_this_week,
      COUNT(CASE WHEN DATE(last_login) = CURDATE() THEN 1 END) as active_today,
      COUNT(CASE WHEN DATE(last_login) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as active_this_week
    FROM users
  `;
  
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching user stats:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Errore nel caricamento statistiche',
        details: err.message 
      });
    }
    
    const stats = results[0] || {};
    
    // Assicurati che tutti i valori siano numerici
    Object.keys(stats).forEach(key => {
      if (stats[key] === null || stats[key] === undefined) {
        stats[key] = 0;
      } else {
        stats[key] = parseInt(stats[key]) || 0;
      }
    });
    
    console.log('✅ User stats fetched:', stats);
    res.json({
      success: true,
      stats: stats
    });
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
    
    if (!username || !email || !password) {
        return res.status(400).json({ 
            error: 'Username, email e password sono obbligatori' 
        });
    }
    
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

// PUT cambio password
function changePassword(req, res) {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
    console.log('🔑 Changing password for user:', userId);
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            error: 'Password attuale e nuova password sono obbligatorie' 
        });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ 
            error: 'La nuova password deve essere di almeno 6 caratteri' 
        });
    }
    
    // Prima ottieni la password attuale dell'utente
    const getUserQuery = 'SELECT password FROM users WHERE id = ?';
    connection.query(getUserQuery, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error fetching user for password change:', err);
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
        
        const user = results[0];
        
        // Verifica la password attuale
        bcrypt.compare(currentPassword, user.password, (compareErr, isValid) => {
            if (compareErr) {
                console.error('❌ Error comparing passwords:', compareErr);
                return res.status(500).json({ 
                    error: 'Errore nella verifica password' 
                });
            }
            
            if (!isValid) {
                return res.status(400).json({ 
                    error: 'Password attuale non corretta' 
                });
            }
            
            // Hash della nuova password
            bcrypt.hash(newPassword, 10, (hashErr, hashedNewPassword) => {
                if (hashErr) {
                    console.error('❌ Error hashing new password:', hashErr);
                    return res.status(500).json({ 
                        error: 'Errore nella crittografia nuova password' 
                    });
                }
                
                // Aggiorna la password nel database
                const updateQuery = 'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?';
                connection.query(updateQuery, [hashedNewPassword, userId], (updateErr, result) => {
                    if (updateErr) {
                        console.error('❌ Error updating password:', updateErr);
                        return res.status(500).json({ 
                            error: 'Errore nell\'aggiornamento password',
                            details: updateErr.message 
                        });
                    }
                    
                    console.log('✅ Password updated successfully for user:', userId);
                    res.json({ 
                        message: 'Password cambiata con successo' 
                    });
                });
            });
        });
    });
}

module.exports = {
  getAllUsers,
  getUserById,
  getCurrentUser,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  changePassword  // ← QUESTA ERA LA FUNZIONE MANCANTE!
};
