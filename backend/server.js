const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

// Configurazione Passport
require('./auth/passport-config')(passport);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE BASE =====
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== SESSIONI =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'pub-manager-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000, // 24 ore
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ===== MIDDLEWARE DI AUTENTICAZIONE =====
const authMiddleware = (req, res, next) => {
  // Route pubbliche che non richiedono autenticazione
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/logout',
    '/api/auth/status'
  ];
  
  // Permetti accesso alle route pubbliche
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  // Per development, permetti tutto (RIMUOVI IN PRODUZIONE)
  if (process.env.NODE_ENV === 'development') {
    req.user = req.user || { id: 1, username: 'admin', role: 'admin' };
    return next();
  }
  
  // Controllo autenticazione normale
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  console.log(`🚫 Unauthorized access attempt to: ${req.method} ${req.path}`);
  return res.status(401).json({ 
    success: false,
    error: 'Accesso non autorizzato',
    message: 'Devi essere autenticato per accedere a questa risorsa'
  });
};

// ===== ROUTE BASE =====
app.get('/', (req, res) => {
  res.json({ 
    message: 'Pub Manager API Server',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ===== ROUTE AUTENTICAZIONE (PUBBLICHE) =====
app.use('/api/auth', require('./routes/auth'));

// ===== APPLICA MIDDLEWARE AUTENTICAZIONE =====
app.use('/api', authMiddleware);

// ===== ROUTE API PROTETTE =====
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/variants', require('./routes/variants'));
app.use('/api/allergens', require('./routes/allergens'));
app.use('/api/ingredients', require('./routes/ingredients'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/stock-movements', require('./routes/stock_movements'));
app.use('/api/ingredients-stock', require('./routes/ingredients_stock'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/purchase-orders', require('./routes/purchase_orders'));
app.use('/api/financial', require('./routes/financial'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));

// ===== GESTIONE ERRORI GLOBALI =====
app.use((error, req, res, next) => {
  console.error('💥 Global Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({ 
    success: false,
    error: 'Errore interno del server',
    message: isDevelopment ? error.message : 'Qualcosa è andato storto',
    stack: isDevelopment ? error.stack : undefined
  });
});

// ===== AVVIO SERVER =====
app.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log(`🚀 Pub Manager Server ONLINE`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Frontend URL: http://localhost:5173`);
  console.log(`🚀 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🚀 Health Check: http://localhost:${PORT}/health`);
  console.log('🚀 ================================');
});

module.exports = app;
