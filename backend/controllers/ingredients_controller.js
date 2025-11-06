const db = require('../database/db');

// GET tutti gli ingredienti
const getAllIngredients = async (req, res) => {
  try {
    const { category, supplier, search, active, storage_type } = req.query;
    
    let query = `
      SELECT 
        id, name, description, category, unit, density, cost_per_unit, 
        supplier, supplier_code, barcode, shelf_life_days, storage_type,
        allergen_info, nutritional_info, active, created_at, updated_at
      FROM ingredients 
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Filtri
    if (category && category !== 'all') {
      query += ' AND category = ?';
      queryParams.push(category);
    }
    
    if (supplier && supplier !== 'all') {
      query += ' AND supplier = ?';
      queryParams.push(supplier);
    }
    
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR supplier_code LIKE ? OR barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (storage_type && storage_type !== 'all') {
      query += ' AND storage_type = ?';
      queryParams.push(storage_type);
    }
    
    if (active !== undefined) {
      query += ' AND active = ?';
      queryParams.push(active === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY name ASC';
    
    const getIngredients = () => {
      return new Promise((resolve, reject) => {
        db.query(query, queryParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const ingredients = await getIngredients();
    
    // Parse JSON fields
    const processedIngredients = ingredients.map(ingredient => ({
      ...ingredient,
      allergen_info: ingredient.allergen_info ? JSON.parse(ingredient.allergen_info) : null,
      nutritional_info: ingredient.nutritional_info ? JSON.parse(ingredient.nutritional_info) : null,
      active: Boolean(ingredient.active)
    }));
    
    console.log(`✅ Retrieved ${processedIngredients.length} ingredients`);
    
    res.json({
      ingredients: processedIngredients,
      total: processedIngredients.length,
      filters: { category, supplier, search, active, storage_type }
    });
    
  } catch (error) {
    console.error('❌ Error fetching ingredients:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento ingredienti',
      message: error.message 
    });
  }
};

// GET singolo ingrediente
const getIngredientById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const getIngredient = () => {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM ingredients WHERE id = ?', [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const ingredients = await getIngredient();
    
    if (ingredients.length === 0) {
      return res.status(404).json({ error: 'Ingrediente non trovato' });
    }
    
    const ingredient = {
      ...ingredients[0],
      allergen_info: ingredients[0].allergen_info ? JSON.parse(ingredients[0].allergen_info) : null,
      nutritional_info: ingredients[0].nutritional_info ? JSON.parse(ingredients[0].nutritional_info) : null,
      active: Boolean(ingredients[0].active)
    };
    
    console.log(`✅ Retrieved ingredient: ${ingredient.name}`);
    res.json(ingredient);
    
  } catch (error) {
    console.error('❌ Error fetching ingredient:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento ingrediente',
      message: error.message 
    });
  }
};

// POST nuovo ingrediente
const createIngredient = async (req, res) => {
  try {
    const {
      name, description, category, unit, density, cost_per_unit,
      supplier, supplier_code, barcode, shelf_life_days, storage_type,
      allergen_info, nutritional_info, active
    } = req.body;
    
    // Validazione
    if (!name || !category || !unit) {
      return res.status(400).json({ 
        error: 'Campi obbligatori mancanti',
        required: ['name', 'category', 'unit']
      });
    }
    
    const insertQuery = `
      INSERT INTO ingredients 
      (name, description, category, unit, density, cost_per_unit, supplier, 
       supplier_code, barcode, shelf_life_days, storage_type, allergen_info, 
       nutritional_info, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      name.trim(),
      description?.trim() || null,
      category || 'other',
      unit.trim() || 'g',
      parseFloat(density) || 1.000,
      parseFloat(cost_per_unit) || 0.0000,
      supplier?.trim() || null,
      supplier_code?.trim() || null,
      barcode?.trim() || null,
      parseInt(shelf_life_days) || 30,
      storage_type || 'ambient',
      allergen_info ? JSON.stringify(allergen_info) : null,
      nutritional_info ? JSON.stringify(nutritional_info) : null,
      active !== undefined ? (active ? 1 : 0) : 1
    ];
    
    const createIngredient = () => {
      return new Promise((resolve, reject) => {
        db.query(insertQuery, values, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const result = await createIngredient();
    
    console.log(`✅ Created ingredient: ${name} (ID: ${result.insertId})`);
    res.status(201).json({
      message: 'Ingrediente creato con successo',
      id: result.insertId,
      ingredient: { id: result.insertId, name, category, unit, cost_per_unit }
    });
    
  } catch (error) {
    console.error('❌ Error creating ingredient:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Ingrediente già esistente',
        message: 'Un ingrediente con questo nome esiste già'
      });
    }
    
    res.status(500).json({ 
      error: 'Errore nella creazione ingrediente',
      message: error.message 
    });
  }
};

// PUT aggiorna ingrediente
const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, category, unit, density, cost_per_unit,
      supplier, supplier_code, barcode, shelf_life_days, storage_type,
      allergen_info, nutritional_info, active
    } = req.body;
    
    // Verifica esistenza
    const checkExists = () => {
      return new Promise((resolve, reject) => {
        db.query('SELECT id FROM ingredients WHERE id = ?', [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const existing = await checkExists();
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Ingrediente non trovato' });
    }
    
    const updateQuery = `
      UPDATE ingredients SET
        name = ?, description = ?, category = ?, unit = ?, density = ?,
        cost_per_unit = ?, supplier = ?, supplier_code = ?, barcode = ?,
        shelf_life_days = ?, storage_type = ?, allergen_info = ?,
        nutritional_info = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const values = [
      name?.trim(),
      description?.trim() || null,
      category || 'other',
      unit?.trim() || 'g',
      parseFloat(density) || 1.000,
      parseFloat(cost_per_unit) || 0.0000,
      supplier?.trim() || null,
      supplier_code?.trim() || null,
      barcode?.trim() || null,
      parseInt(shelf_life_days) || 30,
      storage_type || 'ambient',
      allergen_info ? JSON.stringify(allergen_info) : null,
      nutritional_info ? JSON.stringify(nutritional_info) : null,
      active !== undefined ? (active ? 1 : 0) : 1,
      id
    ];
    
    const updateIngredient = () => {
      return new Promise((resolve, reject) => {
        db.query(updateQuery, values, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    await updateIngredient();
    
    console.log(`✅ Updated ingredient ID: ${id}`);
    res.json({ message: 'Ingrediente aggiornato con successo' });
    
  } catch (error) {
    console.error('❌ Error updating ingredient:', error);
    res.status(500).json({ 
      error: 'Errore nell\'aggiornamento ingrediente',
      message: error.message 
    });
  }
};

// DELETE ingrediente
const deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteIngredient = () => {
      return new Promise((resolve, reject) => {
        db.query('DELETE FROM ingredients WHERE id = ?', [id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const result = await deleteIngredient();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ingrediente non trovato' });
    }
    
    console.log(`✅ Deleted ingredient ID: ${id}`);
    res.json({ message: 'Ingrediente eliminato con successo' });
    
  } catch (error) {
    console.error('❌ Error deleting ingredient:', error);
    res.status(500).json({ 
      error: 'Errore nell\'eliminazione ingrediente',
      message: error.message 
    });
  }
};

// GET categorie ingredienti (usando ENUM)
const getIngredientCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'beverage', label: 'Bevande' },
      { value: 'meat', label: 'Carne' },
      { value: 'fish', label: 'Pesce' },
      { value: 'vegetable', label: 'Verdure' },
      { value: 'dairy', label: 'Latticini' },
      { value: 'grain', label: 'Cereali' },
      { value: 'spice', label: 'Spezie' },
      { value: 'sauce', label: 'Salse' },
      { value: 'other', label: 'Altro' }
    ];
    
    console.log(`✅ Retrieved ${categories.length} ingredient categories`);
    res.json({ categories });
    
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento categorie',
      message: error.message 
    });
  }
};

// GET fornitori
const getSuppliers = async (req, res) => {
  try {
    const getSuppliers = () => {
      return new Promise((resolve, reject) => {
        db.query('SELECT DISTINCT supplier FROM ingredients WHERE supplier IS NOT NULL ORDER BY supplier', (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };
    
    const suppliers = await getSuppliers();
    const supplierList = suppliers.map(row => row.supplier);
    
    console.log(`✅ Retrieved ${supplierList.length} suppliers`);
    res.json({ suppliers: supplierList });
    
  } catch (error) {
    console.error('❌ Error fetching suppliers:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento fornitori',
      message: error.message 
    });
  }
};

// GET tipi di storage
const getStorageTypes = async (req, res) => {
  try {
    const storageTypes = [
      { value: 'ambient', label: 'Ambiente' },
      { value: 'refrigerated', label: 'Refrigerato' },
      { value: 'frozen', label: 'Congelato' }
    ];
    
    console.log(`✅ Retrieved ${storageTypes.length} storage types`);
    res.json({ storageTypes });
    
  } catch (error) {
    console.error('❌ Error fetching storage types:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento tipi storage',
      message: error.message 
    });
  }
};

module.exports = {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientCategories,
  getSuppliers,
  getStorageTypes
};