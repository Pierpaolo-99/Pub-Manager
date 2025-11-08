const connection = require('../database/db');

// GET tutti i prodotti
function getAllProducts(req, res) {
    const { 
        category_id, 
        active, 
        featured,
        search,
        limit = 100,
        offset = 0,
        sort_by = 'sort_order',
        sort_direction = 'ASC'
    } = req.query;
    
    let sql = `
        SELECT 
            p.*,
            c.name as category_name,
            c.icon as category_icon,
            GROUP_CONCAT(
                JSON_OBJECT(
                    'id', pa.allergen_id,
                    'name', a.name,
                    'code', a.code
                )
            ) as allergens_json,
            COUNT(DISTINCT pv.id) as variants_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_allergens pa ON p.id = pa.product_id
        LEFT JOIN allergens a ON pa.allergen_id = a.id
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (category_id) {
        sql += ` AND p.category_id = ?`;
        params.push(category_id);
    }
    
    if (active !== undefined && active !== 'all') {
        sql += ` AND p.active = ?`;
        params.push(active === 'true' ? 1 : 0);
    }
    
    if (featured !== undefined && featured !== 'all') {
        sql += ` AND p.featured = ?`;
        params.push(featured === 'true' ? 1 : 0);
    }
    
    if (search) {
        sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    // Validazione sort_by
    const validSortFields = ['name', 'base_price', 'sort_order', 'created_at', 'preparation_time', 'calories'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'sort_order';
    const sortDir = sort_direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    sql += ` GROUP BY p.id ORDER BY p.${sortField} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ error: 'Errore nel caricamento prodotti' });
        }
        
        // Parse allergens JSON
        const productsWithAllergens = results.map(product => ({
            ...product,
            allergens: product.allergens_json 
                ? JSON.parse(`[${product.allergens_json}]`).filter(a => a.id !== null)
                : []
        }));
        
        res.json(productsWithAllergens);
    });
}

// GET singolo prodotto
function getProductById(req, res) {
    const { id } = req.params;
    
    const sql = `
        SELECT 
            p.*,
            c.name as category_name,
            c.icon as category_icon,
            GROUP_CONCAT(
                JSON_OBJECT(
                    'id', pa.allergen_id,
                    'name', a.name,
                    'code', a.code
                )
            ) as allergens_json,
            COUNT(DISTINCT pv.id) as variants_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_allergens pa ON p.id = pa.product_id
        LEFT JOIN allergens a ON pa.allergen_id = a.id
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        WHERE p.id = ?
        GROUP BY p.id
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).json({ error: 'Errore nel caricamento prodotto' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Prodotto non trovato' });
        }
        
        const product = {
            ...results[0],
            allergens: results[0].allergens_json 
                ? JSON.parse(`[${results[0].allergens_json}]`).filter(a => a.id !== null)
                : []
        };
        
        res.json(product);
    });
}

// POST nuovo prodotto
function createProduct(req, res) {
    const {
        name,
        description,
        category_id,
        base_price,
        image_url,
        active = true,
        featured = false,
        sort_order = 0,
        preparation_time = 0,
        calories,
        allergen_ids = []
    } = req.body;
    
    // Validazione
    if (!name || !category_id || !base_price) {
        return res.status(400).json({ 
            error: 'Nome, categoria e prezzo base sono obbligatori' 
        });
    }
    
    if (parseFloat(base_price) < 0) {
        return res.status(400).json({ 
            error: 'Il prezzo deve essere positivo' 
        });
    }
    
    // Verifica che la categoria esista
    const checkCategorySql = 'SELECT id FROM categories WHERE id = ?';
    
    connection.query(checkCategorySql, [category_id], (err, categoryResults) => {
        if (err) {
            console.error('Error checking category:', err);
            return res.status(500).json({ error: 'Errore nella verifica categoria' });
        }
        
        if (categoryResults.length === 0) {
            return res.status(400).json({ error: 'Categoria non trovata' });
        }
        
        // Inserisci il prodotto
        const insertProductSql = `
            INSERT INTO products (
                name, description, category_id, base_price, image_url, 
                active, featured, sort_order, preparation_time, calories
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const insertParams = [
            name.trim(),
            description?.trim() || null,
            category_id,
            parseFloat(base_price),
            image_url?.trim() || null,
            active ? 1 : 0,
            featured ? 1 : 0,
            parseInt(sort_order) || 0,
            parseInt(preparation_time) || 0,
            calories ? parseInt(calories) : null
        ];
        
        connection.query(insertProductSql, insertParams, (err, result) => {
            if (err) {
                console.error('Error creating product:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Prodotto con questo nome già esistente' });
                }
                return res.status(500).json({ error: 'Errore nella creazione prodotto' });
            }
            
            const productId = result.insertId;
            
            // Inserisci gli allergeni se presenti
            if (allergen_ids && allergen_ids.length > 0) {
                const allergenPromises = allergen_ids.map(allergenId => {
                    return new Promise((resolve, reject) => {
                        const sql = 'INSERT INTO product_allergens (product_id, allergen_id) VALUES (?, ?)';
                        connection.query(sql, [productId, allergenId], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                });
                
                Promise.all(allergenPromises)
                    .then(() => {
                        console.log(`✅ Product created: ${productId} - ${name} with ${allergen_ids.length} allergens`);
                        res.status(201).json({
                            id: productId,
                            message: 'Prodotto creato con successo'
                        });
                    })
                    .catch(err => {
                        console.error('Error adding allergens:', err);
                        res.status(500).json({ error: 'Prodotto creato ma errore nell\'aggiunta allergeni' });
                    });
            } else {
                console.log(`✅ Product created: ${productId} - ${name}`);
                res.status(201).json({
                    id: productId,
                    message: 'Prodotto creato con successo'
                });
            }
        });
    });
}

// PUT aggiornamento prodotto
function updateProduct(req, res) {
    const { id } = req.params;
    const {
        name,
        description,
        category_id,
        base_price,
        image_url,
        active,
        featured,
        sort_order,
        preparation_time,
        calories,
        allergen_ids = []
    } = req.body;
    
    // Validazione
    if (!name || !category_id || !base_price) {
        return res.status(400).json({ 
            error: 'Nome, categoria e prezzo base sono obbligatori' 
        });
    }
    
    if (parseFloat(base_price) < 0) {
        return res.status(400).json({ 
            error: 'Il prezzo deve essere positivo' 
        });
    }
    
    // Aggiorna il prodotto
    const updateProductSql = `
        UPDATE products 
        SET name = ?, description = ?, category_id = ?, base_price = ?, 
            image_url = ?, active = ?, featured = ?, sort_order = ?, 
            preparation_time = ?, calories = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const updateParams = [
        name.trim(),
        description?.trim() || null,
        category_id,
        parseFloat(base_price),
        image_url?.trim() || null,
        active ? 1 : 0,
        featured ? 1 : 0,
        parseInt(sort_order) || 0,
        parseInt(preparation_time) || 0,
        calories ? parseInt(calories) : null,
        id
    ];
    
    connection.query(updateProductSql, updateParams, (err, result) => {
        if (err) {
            console.error('Error updating product:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Prodotto con questo nome già esistente' });
            }
            return res.status(500).json({ error: 'Errore nell\'aggiornamento prodotto' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Prodotto non trovato' });
        }
        
        // Aggiorna gli allergeni
        updateProductAllergens(id, allergen_ids, (err) => {
            if (err) {
                console.error('Error updating allergens:', err);
                return res.status(500).json({ error: 'Prodotto aggiornato ma errore nell\'aggiornamento allergeni' });
            }
            
            console.log(`✅ Product updated: ${id} - ${name}`);
            res.json({ message: 'Prodotto aggiornato con successo' });
        });
    });
}

// PATCH toggle campo specifico (active, featured)
function toggleProductField(req, res) {
    const { id } = req.params;
    const { field, value } = req.body;
    
    const validFields = ['active', 'featured'];
    if (!validFields.includes(field)) {
        return res.status(400).json({ error: 'Campo non valido' });
    }
    
    const sql = `UPDATE products SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    connection.query(sql, [value ? 1 : 0, id], (err, result) => {
        if (err) {
            console.error(`Error toggling ${field}:`, err);
            return res.status(500).json({ error: `Errore nell'aggiornamento ${field}` });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Prodotto non trovato' });
        }
        
        console.log(`✅ Product ${field} toggled: ${id} = ${value}`);
        res.json({ message: `${field} aggiornato con successo` });
    });
}

// DELETE prodotto
function deleteProduct(req, res) {
    const { id } = req.params;
    const { force = false } = req.body;
    
    // Verifica dipendenze
    const checkDependenciesSql = `
        SELECT 
            (SELECT COUNT(*) FROM product_variants WHERE product_id = ?) as variants_count,
            (SELECT COUNT(*) FROM order_items oi 
             JOIN product_variants pv ON oi.product_variant_id = pv.id 
             WHERE pv.product_id = ?) as order_items_count,
            (SELECT COUNT(*) FROM stock s 
             JOIN product_variants pv ON s.product_variant_id = pv.id 
             WHERE pv.product_id = ?) as stock_records
    `;
    
    connection.query(checkDependenciesSql, [id, id, id], (err, depResults) => {
        if (err) {
            console.error('Error checking dependencies:', err);
            return res.status(500).json({ error: 'Errore nella verifica dipendenze' });
        }
        
        const deps = depResults[0];
        const hasDependencies = deps.variants_count > 0 || deps.order_items_count > 0 || deps.stock_records > 0;
        
        if (hasDependencies && !force) {
            return res.status(409).json({ 
                error: 'Impossibile eliminare: prodotto utilizzato in ordini, varianti o stock',
                dependencies: deps,
                suggestion: 'Disattiva il prodotto invece di eliminarlo, oppure forza la cancellazione'
            });
        }
        
        // Elimina allergeni associati
        const deleteAllergensSql = 'DELETE FROM product_allergens WHERE product_id = ?';
        connection.query(deleteAllergensSql, [id], (err) => {
            if (err) {
                console.error('Error deleting product allergens:', err);
                return res.status(500).json({ error: 'Errore nella cancellazione allergeni' });
            }
            
            // Elimina il prodotto
            const deleteProductSql = 'DELETE FROM products WHERE id = ?';
            connection.query(deleteProductSql, [id], (err, result) => {
                if (err) {
                    console.error('Error deleting product:', err);
                    return res.status(500).json({ error: 'Errore nella cancellazione prodotto' });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Prodotto non trovato' });
                }
                
                console.log(`✅ Product deleted: ${id} ${force ? '(forced)' : ''}`);
                res.json({ 
                    message: 'Prodotto eliminato con successo',
                    forced: force 
                });
            });
        });
    });
}

// GET statistiche prodotti
function getProductStats(req, res) {
    const sql = `
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active_products,
            COUNT(CASE WHEN featured = 1 THEN 1 END) as featured_products,
            AVG(base_price) as avg_price,
            MIN(base_price) as min_price,
            MAX(base_price) as max_price,
            AVG(preparation_time) as avg_prep_time,
            COUNT(DISTINCT category_id) as categories_count
        FROM products
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching product stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        res.json(results[0]);
    });
}

// Helper function per aggiornamento allergeni
function updateProductAllergens(productId, allergenIds, callback) {
    // Prima rimuovi tutti gli allergeni esistenti
    const deleteAllergensSql = 'DELETE FROM product_allergens WHERE product_id = ?';
    
    connection.query(deleteAllergensSql, [productId], (err) => {
        if (err) {
            return callback(err);
        }
        
        // Se non ci sono allergeni da aggiungere, fine
        if (!allergenIds || allergenIds.length === 0) {
            return callback(null);
        }
        
        // Inserisci i nuovi allergeni
        const insertPromises = allergenIds.map(allergenId => {
            return new Promise((resolve, reject) => {
                const sql = 'INSERT INTO product_allergens (product_id, allergen_id) VALUES (?, ?)';
                connection.query(sql, [productId, allergenId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
        
        Promise.all(insertPromises)
            .then(() => callback(null))
            .catch(callback);
    });
}

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    toggleProductField,
    deleteProduct,
    getProductStats
};