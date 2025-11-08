const connection = require('../database/db');

/////////////////////////
// ALLERGENI CRUD
/////////////////////////

// GET tutti gli allergeni con filtri
function getAllergens(req, res) {
    const { active, search, limit = 100, offset = 0 } = req.query;
    
    console.log('⚠️ Fetching allergens with filters:', { active, search });
    
    let sql = `
        SELECT 
            id, name, description, icon, color, active, created_at, updated_at
        FROM allergens 
        WHERE 1=1
    `;
    const params = [];
    
    // Filtro per stato attivo
    if (active !== undefined && active !== 'all') {
        sql += ` AND active = ?`;
        params.push(active === 'true' ? 1 : 0);
    }
    
    // Filtro ricerca
    if (search) {
        sql += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching allergens:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento allergeni',
                details: err.message 
            });
        }
        
        // Converti active da tinyint a boolean
        const allergens = results.map(allergen => ({
            ...allergen,
            active: Boolean(allergen.active)
        }));
        
        console.log(`✅ Found ${allergens.length} allergens`);
        res.json({
            success: true,
            allergens: allergens,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: allergens.length
            }
        });
    });
}

// GET solo allergeni attivi (per dropdown)
function getActiveAllergens(req, res) {
    console.log('⚠️ Fetching active allergens for dropdown');
    
    const sql = `
        SELECT id, name, description, icon, color
        FROM allergens 
        WHERE active = 1 
        ORDER BY name ASC
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching active allergens:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento allergeni attivi',
                details: err.message 
            });
        }
        
        console.log(`✅ Found ${results.length} active allergens`);
        res.json({
            success: true,
            allergens: results
        });
    });
}

// GET singolo allergene per ID
function getAllergenById(req, res) {
    const { id } = req.params;
    
    console.log('⚠️ Getting allergen by ID:', id);
    
    const sql = `
        SELECT 
            id, name, description, icon, color, active, created_at, updated_at
        FROM allergens 
        WHERE id = ?
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching allergen:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento allergene',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Allergene non trovato' 
            });
        }
        
        const allergen = {
            ...results[0],
            active: Boolean(results[0].active)
        };
        
        console.log('✅ Allergen found:', allergen.name);
        res.json({
            success: true,
            allergen: allergen
        });
    });
}

// GET statistiche allergeni
function getAllergenStats(req, res) {
    console.log('📊 Getting allergen statistics');
    
    const sql = `
        SELECT 
            COUNT(*) as total_allergens,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active_allergens,
            COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_allergens,
            (SELECT COUNT(DISTINCT product_id) FROM product_allergens) as products_with_allergens,
            (SELECT COUNT(*) FROM product_allergens) as total_product_allergen_associations
        FROM allergens
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching allergen stats:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }
        
        const stats = results[0];
        console.log('✅ Allergen stats calculated:', stats);
        
        res.json({
            success: true,
            stats: stats
        });
    });
}

// POST nuovo allergene
function createAllergen(req, res) {
    const { 
        name, 
        description = '', 
        icon = '⚠️', 
        color = '#EF4444',
        active = true 
    } = req.body;
    
    console.log('➕ Creating new allergen:', { name, description, icon, color });
    
    // Validazione
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Il nome dell\'allergene è obbligatorio' 
        });
    }
    
    if (name.length > 100) {
        return res.status(400).json({ 
            success: false,
            error: 'Il nome non può superare i 100 caratteri' 
        });
    }
    
    // Verifica nome duplicato
    const checkSql = 'SELECT id FROM allergens WHERE name = ?';
    connection.query(checkSql, [name], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking duplicate allergen:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica allergene esistente',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length > 0) {
            return res.status(409).json({ 
                success: false,
                error: 'Un allergene con questo nome esiste già' 
            });
        }
        
        // Inserimento
        const insertSql = `
            INSERT INTO allergens (name, description, icon, color, active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        connection.query(insertSql, [
            name.trim(), 
            description || '', 
            icon, 
            color, 
            active ? 1 : 0
        ], (insertErr, result) => {
            if (insertErr) {
                console.error('❌ Error creating allergen:', insertErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nella creazione allergene',
                    details: insertErr.message 
                });
            }
            
            console.log('✅ Allergen created successfully with ID:', result.insertId);
            res.status(201).json({ 
                success: true,
                message: 'Allergene creato con successo',
                allergen: {
                    id: result.insertId,
                    name,
                    description,
                    icon,
                    color,
                    active: Boolean(active)
                }
            });
        });
    });
}

// PATCH aggiornamento allergene
function updateAllergen(req, res) {
    const { id } = req.params;
    const { name, description, icon, color, active } = req.body;
    
    console.log('✏️ Updating allergen:', id, req.body);
    
    // Verifica allergene esistente
    const checkSql = 'SELECT * FROM allergens WHERE id = ?';
    connection.query(checkSql, [id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking allergen:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica allergene',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Allergene non trovato' 
            });
        }
        
        // Costruisci query di aggiornamento dinamica
        const updates = [];
        const values = [];
        
        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Il nome dell\'allergene non può essere vuoto' 
                });
            }
            updates.push('name = ?');
            values.push(name.trim());
        }
        
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description || '');
        }
        
        if (icon !== undefined) {
            updates.push('icon = ?');
            values.push(icon);
        }
        
        if (color !== undefined) {
            updates.push('color = ?');
            values.push(color);
        }
        
        if (active !== undefined) {
            updates.push('active = ?');
            values.push(active ? 1 : 0);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Nessun campo da aggiornare' 
            });
        }
        
        updates.push('updated_at = NOW()');
        values.push(id);
        
        const updateSql = `UPDATE allergens SET ${updates.join(', ')} WHERE id = ?`;
        
        connection.query(updateSql, values, (updateErr, result) => {
            if (updateErr) {
                console.error('❌ Error updating allergen:', updateErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nell\'aggiornamento allergene',
                    details: updateErr.message 
                });
            }
            
            console.log('✅ Allergen updated successfully');
            res.json({ 
                success: true,
                message: 'Allergene aggiornato con successo',
                affectedRows: result.affectedRows
            });
        });
    });
}

// DELETE allergene
function deleteAllergen(req, res) {
    const { id } = req.params;
    
    console.log('🗑️ Deleting allergen:', id);
    
    // Controlla se ci sono prodotti collegati
    const checkProductsSql = 'SELECT COUNT(*) as product_count FROM product_allergens WHERE allergen_id = ?';
    connection.query(checkProductsSql, [id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking allergen dependencies:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica dipendenze',
                details: checkErr.message 
            });
        }
        
        const productCount = checkResults[0].product_count;
        if (productCount > 0) {
            return res.status(409).json({ 
                success: false,
                error: `Impossibile eliminare: ${productCount} prodotti collegati a questo allergene`,
                details: 'Rimuovi l\'allergene dai prodotti prima di eliminarlo'
            });
        }
        
        // Verifica allergene esistente ed elimina
        const deleteSql = 'DELETE FROM allergens WHERE id = ?';
        connection.query(deleteSql, [id], (deleteErr, result) => {
            if (deleteErr) {
                console.error('❌ Error deleting allergen:', deleteErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nell\'eliminazione allergene',
                    details: deleteErr.message 
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Allergene non trovato' 
                });
            }
            
            console.log('✅ Allergen deleted successfully');
            res.json({ 
                success: true,
                message: 'Allergene eliminato con successo' 
            });
        });
    });
}

/////////////////////////
// ALLERGENI-PRODOTTO
/////////////////////////

// GET allergeni per prodotto specifico
function getProductAllergens(req, res) {
    const { productId } = req.params;
    
    console.log('⚠️ Getting allergens for product:', productId);
    
    const sql = `
        SELECT 
            a.id,
            a.name,
            a.description,
            a.icon,
            a.color,
            pa.created_at as assigned_at
        FROM allergens a
        INNER JOIN product_allergens pa ON a.id = pa.allergen_id
        WHERE pa.product_id = ? AND a.active = 1
        ORDER BY a.name
    `;
    
    connection.query(sql, [productId], (err, results) => {
        if (err) {
            console.error('❌ Error fetching product allergens:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento allergeni prodotto',
                details: err.message 
            });
        }
        
        console.log(`✅ Found ${results.length} allergens for product ${productId}`);
        res.json({
            success: true,
            allergens: results
        });
    });
}

// POST assegna allergene a prodotto
function addAllergenToProduct(req, res) {
    const { product_id, allergen_id } = req.body; // Usa snake_case per consistenza
    
    console.log('➕ Adding allergen to product:', { product_id, allergen_id });
    
    // Validazione
    if (!product_id || !allergen_id) {
        return res.status(400).json({ 
            success: false,
            error: 'Product ID e Allergen ID sono obbligatori' 
        });
    }
    
    // Verifica se l'associazione esiste già
    const checkSql = 'SELECT id FROM product_allergens WHERE product_id = ? AND allergen_id = ?';
    connection.query(checkSql, [product_id, allergen_id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking existing association:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica associazione esistente',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length > 0) {
            return res.status(409).json({ 
                success: false,
                error: 'Associazione già esistente tra prodotto e allergene' 
            });
        }
        
        // Verifica che prodotto e allergene esistano
        const verifyProductSql = 'SELECT id FROM products WHERE id = ?';
        const verifyAllergenSql = 'SELECT id FROM allergens WHERE id = ? AND active = 1';
        
        connection.query(verifyProductSql, [product_id], (prodErr, prodResults) => {
            if (prodErr || prodResults.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Prodotto non trovato' 
                });
            }
            
            connection.query(verifyAllergenSql, [allergen_id], (allergErr, allergResults) => {
                if (allergErr || allergResults.length === 0) {
                    return res.status(404).json({ 
                        success: false,
                        error: 'Allergene non trovato o non attivo' 
                    });
                }
                
                // Crea associazione
                const insertSql = 'INSERT INTO product_allergens (product_id, allergen_id, created_at) VALUES (?, ?, NOW())';
                connection.query(insertSql, [product_id, allergen_id], (insertErr, result) => {
                    if (insertErr) {
                        console.error('❌ Error creating product-allergen association:', insertErr);
                        return res.status(500).json({ 
                            success: false,
                            error: 'Errore nella creazione associazione',
                            details: insertErr.message 
                        });
                    }
                    
                    console.log('✅ Allergen assigned to product successfully');
                    res.status(201).json({ 
                        success: true,
                        message: 'Allergene assegnato al prodotto con successo',
                        association: {
                            id: result.insertId,
                            product_id,
                            allergen_id
                        }
                    });
                });
            });
        });
    });
}

// DELETE rimuovi allergene da prodotto
function removeAllergenFromProduct(req, res) {
    const { productId, allergenId } = req.params;
    
    console.log('➖ Removing allergen from product:', { productId, allergenId });
    
    const sql = 'DELETE FROM product_allergens WHERE product_id = ? AND allergen_id = ?';
    
    connection.query(sql, [productId, allergenId], (err, result) => {
        if (err) {
            console.error('❌ Error removing allergen from product:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella rimozione associazione',
                details: err.message 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Associazione non trovata' 
            });
        }
        
        console.log('✅ Allergen removed from product successfully');
        res.json({ 
            success: true,
            message: 'Allergene rimosso dal prodotto con successo' 
        });
    });
}

module.exports = {
    getAllergens,
    getActiveAllergens,
    getAllergenById,
    getAllergenStats,
    createAllergen,
    updateAllergen,
    deleteAllergen,
    getProductAllergens,
    addAllergenToProduct,
    removeAllergenFromProduct
};