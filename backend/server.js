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

// IMPORTA IL CONTROLLER USERS - AGGIUNGI QUESTA LINEA
const usersController = require('./controllers/users_controller');

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
const ingredientsRoutes = require('./routes/ingredients');
const ingredientsStockRoutes = require('./routes/ingredients_stock');
const purchaseOrdersRoutes = require('./routes/purchase_orders');
const suppliersRoutes = require('./routes/suppliers');
const recipesRoutes = require('./routes/recipes');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const stockMovementsRoutes = require('./routes/stock_movements');
const tablesRoutes = require('./routes/tables');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/allergens', allergensRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/variants', variantsRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/ingredients-stock', ingredientsStockRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stock-movements', stockMovementsRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/analytics', analyticsRoutes);

// ROUTE DI AUTENTICAZIONE CON GESTIONE ERRORI MIGLIORATA

// Login route (usa Passport)
app.post('/api/auth/login', (req, res, next) => {
    console.log('🔑 Login attempt for:', req.body.email);
    
    passport.authenticate('login', (err, user, info) => {
        if (err) {
            console.error('❌ Passport authentication error:', err);
            return res.status(500).json({
                success: false,
                message: 'Errore del server durante l\'autenticazione'
            });
        }
        
        if (!user) {
            console.log('❌ Authentication failed:', info);
            return res.status(401).json({
                success: false,
                message: info?.message || 'Credenziali non valide'
            });
        }
        
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('❌ Login error:', loginErr);
                return res.status(500).json({
                    success: false,
                    message: 'Errore durante il login'
                });
            }
            
            console.log('✅ Login successful for user:', user.username);
            
            res.json({
                success: true,
                message: 'Login effettuato con successo',
                user: user
            });
        });
    })(req, res, next);
});

// Register route (usa Passport)
app.post('/api/auth/register', (req, res, next) => {
    console.log('📝 Registration attempt for:', req.body.email);
    
    passport.authenticate('register', (err, user, info) => {
        if (err) {
            console.error('❌ Passport registration error:', err);
            return res.status(500).json({
                success: false,
                message: 'Errore del server durante la registrazione'
            });
        }
        
        if (!user) {
            console.log('❌ Registration failed:', info);
            return res.status(400).json({
                success: false,
                message: info?.message || 'Registrazione fallita'
            });
        }
        
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('❌ Auto-login after registration failed:', loginErr);
                return res.status(500).json({
                    success: false,
                    message: 'Registrazione completata ma errore durante il login automatico'
                });
            }
            
            console.log('✅ Registration and auto-login successful for user:', user.username);
            
            res.json({
                success: true,
                message: 'Registrazione effettuata con successo',
                user: user
            });
        });
    })(req, res, next);
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
    console.log('👋 Logout request for user:', req.user?.username || 'unknown');
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error destroying session:', err);
            return res.status(500).json({
                success: false,
                message: 'Errore durante il logout'
            });
        }
        
        console.log('✅ Logout successful');
        res.json({
            success: true,
            message: 'Logout effettuato con successo'
        });
    });
});

// Check authentication route (usa il controller users)
app.get('/api/users/me', usersController.getCurrentUser);

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Pub Manager API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🚨 Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Errore interno del server'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 CORS enabled for: http://localhost:5173`);
});
