const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');

// CORS Middleware
app.use(cors());

// JSON Middleware
app.use(express.json());

// Static Assets Middleware
app.use(express.static('public'));

// Importing Routes
const productsRoutes = require('./routes/products');
const variantsRoutes = require('./routes/variants');
const stockRoutes = require('./routes/stock');
const ordersRoutes = require('./routes/orders');
const allergensRoutes = require('./routes/allergens');
const promotionsRoutes = require('./routes/promotions');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');

// Routes Middleware
app.use('/api/products', productsRoutes);
app.use('/api/variants', variantsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/allergens', allergensRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);

// Rotta placeholder
app.get('/', (req, res) => {
  res.send('Pub Manager API 🚀');
});

// Avvio server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
