const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const initializePassport = require('./auth/passport-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Inizializza Passport
initializePassport(passport);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurazione CORS
app.use(cors({
    origin: 'http://localhost:5173', // URL del frontend Vite
    credentials: true,
    optionsSuccessStatus: 200
}));

// Configurazione sessioni (DEVE essere prima di passport.initialize())
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true solo in produzione con HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 ore
    }
}));

// Inizializzazione Passport (DOPO le sessioni)
app.use(passport.initialize());
app.use(passport.session());

// Routes
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const allergensRoutes = require('./routes/allergens');
const promotionsRoutes = require('./routes/promotions');
const stockRoutes = require('./routes/stock');
const variantsRoutes = require('./routes/variants');
const financialRoutes = require('./routes/financial');

app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/allergens', allergensRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/variants', variantsRoutes);
app.use('/api/financial', financialRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Pub Manager API is running!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
