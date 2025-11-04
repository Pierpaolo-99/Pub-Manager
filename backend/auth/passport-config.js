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

            // Query che include anche il ruolo
            const sql = 'SELECT id, email, password, role FROM users WHERE email = ?';
            connection.query(sql, [email], (err, results) => {
                if (err) return done(err)

                if (results.length === 0) return done(null, false, { message: 'no user with that email' })

                const user = results[0]

                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) return done(err)

                    if (!isMatch) return done(null, false, { message: 'password incorrect' })

                    // Rimuovi la password dall'oggetto user prima di restituirlo
                    delete user.password
                    return done(null, user)
                })
            })
        }));

    // Register strategy (con ruolo di default)
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
                    role: req.body.role || 'user' // Ruolo di default 'user'
                }

                const insertSql = 'INSERT INTO users SET ?'
                connection.query(insertSql, newUser, function (err, result) {
                    if (err) return done(err);

                    newUser.id = result.insertId;
                    delete newUser.password; // Rimuovi la password
                    return done(null, newUser);
                })
            })
        })
    }));

    // Serialize user (invariato)
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // Deserialize user (con ruoli)
    passport.deserializeUser(function (id, done) {
        // Include il ruolo nella query
        const sql = 'SELECT id, username, email, role FROM users WHERE id = ?';
        connection.query(sql, [id], function (err, results) {
            if (err) return done(err);
            if (results.length === 0) return done(null, false, { message: 'No user found' });

            done(null, results[0]);
        })
    })
}

module.exports = initializePassport