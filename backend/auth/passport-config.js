const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const connection = require('../database/db')

function initializePassport(passport) {

    // Login Strategy (con ruoli)
    passport.use('login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
    },
        function (email, password, done) {

            // Query che include anche il ruolo e active
            const sql = 'SELECT id, name, email, password, role, active FROM users WHERE email = ?';
            connection.query(sql, [email], (err, results) => {
                if (err) return done(err)

                if (results.length === 0) return done(null, false, { message: 'no user with that email' })

                const user = results[0]

                // Controlla se l'utente è attivo
                if (!user.active) {
                    return done(null, false, { message: 'account deactivated' })
                }

                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) return done(err)

                    if (!isMatch) return done(null, false, { message: 'password incorrect' })

                    // Rimuovi la password dall'oggetto user prima di restituirlo
                    delete user.password
                    return done(null, user)
                })
            })
        }));

    // Register strategy - Correggi i campi
    passport.use('register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true,
    }, function (req, email, password, done) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        connection.query(sql, [email], (err, results) => {
            if (err) return done(err);
            if (results.length > 0) return done(null, false, { message: 'Email already exists' });

            bcrypt.hash(password, 10, function (err, hashedPassword) {
                if (err) return done(err);

                const newUser = {
                    name: req.body.name,
                    email: email,
                    password: hashedPassword,
                    role: req.body.role || 'cameriere', // Cambia default da 'user' a 'cameriere'
                    active: 1 // Aggiungi campo active
                }

                const insertSql = 'INSERT INTO users SET ?'
                connection.query(insertSql, newUser, function (err, result) {
                    if (err) return done(err);

                    newUser.id = result.insertId;
                    delete newUser.password; // Rimuovi la password
                    newUser.active = Boolean(newUser.active); // Converti a boolean
                    return done(null, newUser);
                })
            })
        })
    }));

    // Serialize user (invariato)
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // Deserialize user - Correggi la query
    passport.deserializeUser(function (id, done) {
        // Correggi: usa 'name' invece di 'username'
        const sql = 'SELECT id, name, email, role, active FROM users WHERE id = ?';
        connection.query(sql, [id], function (err, results) {
            if (err) return done(err);
            if (results.length === 0) return done(null, false, { message: 'No user found' });

            const user = results[0];
            user.active = Boolean(user.active); // Converti a boolean
            done(null, user);
        })
    })
}

module.exports = initializePassport