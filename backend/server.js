const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');

// Importing Routes
const productsRoutes = require('./routes/products');
const variantsRoutes = require('./routes/variants');

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Rotte placeholder
app.get('/', (req, res) => {
  res.send('Pub Manager API 🚀');
});

// Routes Middleware
app.use('/api/products', productsRoutes);
app.use('/api/variants', variantsRoutes);

// CORS Middleware
app.use(cors());

// JSON Middleware
app.use(express.json())

// Static Assets Middleware
app.use(express.static('public'));
