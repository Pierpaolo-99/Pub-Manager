const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const connection = require('../database/db')

function initializePassport(passport) {

    // Login Strategy
    passport.use('login', new LocalStrategy({
        usernameField: 'email', // Il frontend invierà sempre 'email'
        passwordField: 'password',
    },
        function (email, password, done) {
            console.log('🔍 Login attempt for email:', email);

            // Query con i campi della tua tabella
            const sql = `SELECT 
                id, username, email, password, role, first_name, last_name, 
                phone, active, last_login 
                FROM users 
                WHERE email = ? AND active = 1`;
                
            connection.query(sql, [email], (err, results) => {
                if (err) {
                    console.error('❌ Database error in login:', err);
                    return done(err);
                }

                if (results.length === 0) {
                    console.log('❌ No active user found with email:', email);
                    return done(null, false, { message: 'Credenziali non valide o account disattivato' });
                }

                const user = results[0];
                console.log('🔍 User found:', { id: user.id, email: user.email, role: user.role });

                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) {
                        console.error('❌ Bcrypt error:', err);
                        return done(err);
                    }

                    if (!isMatch) {
                        console.log('❌ Password incorrect for user:', user.id);
                        return done(null, false, { message: 'Credenziali non valide' });
                    }

                    // Aggiorna last_login
                    const updateLoginSql = 'UPDATE users SET last_login = NOW() WHERE id = ?';
                    connection.query(updateLoginSql, [user.id], (updateErr) => {
                        if (updateErr) {
                            console.error('⚠️ Warning: Could not update last_login:', updateErr);
                        }
                    });

                    // Prepara l'oggetto user (rimuovi password)
                    delete user.password;
                    user.active = Boolean(user.active);
                    
                    console.log('✅ Login successful for user:', user.id, 'Role:', user.role);
                    return done(null, user);
                });
            });
        }));

    // Register strategy
    passport.use('register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true,
    }, function (req, email, password, done) {
        console.log('📝 Registration attempt for email:', email);
        console.log('📝 Request body:', { ...req.body, password: '[HIDDEN]' });

        // Verifica se email o username esistono già
        const checkSql = `SELECT id FROM users WHERE email = ? OR username = ?`;
        const username = req.body.username || email.split('@')[0];
        
        connection.query(checkSql, [email, username], (err, results) => {
            if (err) {
                console.error('❌ Database error checking existing user:', err);
                return done(err);
            }
            
            if (results.length > 0) {
                console.log('❌ Email or username already exists');
                return done(null, false, { message: 'Email o username già registrati' });
            }

            // Hash della password
            bcrypt.hash(password, 10, function (err, hashedPassword) {
                if (err) {
                    console.error('❌ Bcrypt hash error:', err);
                    return done(err);
                }

                // Prepara i dati del nuovo utente usando ESATTAMENTE i campi della tua tabella
                const userData = {
                    username: username,
                    email: email,
                    password: hashedPassword,
                    role: req.body.role || 'waiter', // Default waiter
                    first_name: req.body.first_name || req.body.firstName || null,
                    last_name: req.body.last_name || req.body.lastName || null,
                    phone: req.body.phone || null,
                    active: 1 // true -> 1 per tinyint
                };

                console.log('📝 Creating user with data:', { ...userData, password: '[HIDDEN]' });

                // Query INSERT usando i campi esatti
                const insertSql = `INSERT INTO users 
                    (username, email, password, role, first_name, last_name, phone, active) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    
                connection.query(insertSql, [
                    userData.username,
                    userData.email,
                    userData.password,
                    userData.role,
                    userData.first_name,
                    userData.last_name,
                    userData.phone,
                    userData.active
                ], function (err, result) {
                    if (err) {
                        console.error('❌ Database error creating user:', err);
                        
                        // Gestisci errori specifici del database
                        if (err.code === 'ER_DUP_ENTRY') {
                            if (err.message.includes('email')) {
                                return done(null, false, { message: 'Email già registrata' });
                            } else if (err.message.includes('username')) {
                                return done(null, false, { message: 'Username già esistente' });
                            }
                            return done(null, false, { message: 'Email o username già registrati' });
                        }
                        
                        return done(null, false, { message: 'Errore durante la registrazione' });
                    }

                    // Prepara l'oggetto utente da restituire
                    const createdUser = {
                        id: result.insertId,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role,
                        first_name: userData.first_name,
                        last_name: userData.last_name,
                        phone: userData.phone,
                        active: true,
                        last_login: null,
                        created_at: new Date()
                    };
                    
                    console.log('✅ User created successfully:', createdUser.id);
                    return done(null, createdUser);
                });
            });
        });
    }));

    // Serialize user
    passport.serializeUser(function (user, done) {
        console.log('🔄 Serializing user:', user.id);
        done(null, user.id);
    });

    // Deserialize user
    passport.deserializeUser(function (id, done) {
        console.log('🔄 Deserializing user ID:', id);
        
        const sql = `SELECT 
            id, username, email, role, first_name, last_name, 
            phone, active, last_login, created_at, updated_at 
            FROM users 
            WHERE id = ? AND active = 1`;
            
        connection.query(sql, [id], function (err, results) {
            if (err) {
                console.error('❌ Database error deserializing user:', err);
                return done(err);
            }
            
            if (results.length === 0) {
                console.log('❌ No active user found for ID:', id);
                return done(null, false, { message: 'Utente non trovato o disattivato' });
            }

            const user = results[0];
            user.active = Boolean(user.active);
            
            console.log('✅ User deserialized:', user.id, 'Role:', user.role);
            done(null, user);
        });
    });
}

module.exports = initializePassport