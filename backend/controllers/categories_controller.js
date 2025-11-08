const connection = require('../database/db');

// GET tutte le categorie con filtri e ordinamento
function getCategories(req, res) {
    const { 
        active, 
        search, 
        sort_by = 'sort_order',
        sort_order = 'ASC',
        limit = 100,
        offset = 0 
    } = req.query;
    
    let sql = `
        SELECT 
            id, name, description, icon, color, sort_order, active, created_at, updated_at
        FROM categories 
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
    
    // Ordinamento
    const allowedSorts = ['id', 'name', 'sort_order', 'created_at'];
    const sortBy = allowedSorts.includes(sort_by) ? sort_by : 'sort_order';
    const order = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    sql += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('🏷️ Fetching categories with filters:', { active, search, sort_by, sort_order });
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching categories:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento categorie',
                details: err.message 
            });
        }
        
        // Converti active da tinyint a boolean
        const categories = results.map(cat => ({
            ...cat,
            active: Boolean(cat.active)
        }));
        
        console.log(`✅ Found ${categories.length} categories`);
        res.json({
            success: true,
            categories: categories,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: categories.length
            }
        });
    });
}

// GET solo categorie attive (per dropdown)
function getActiveCategories(req, res) {
    console.log('🏷️ Fetching active categories for dropdown');
    
    const sql = `
        SELECT id, name, description, icon, color, sort_order
        FROM categories 
        WHERE active = 1 
        ORDER BY sort_order ASC, name ASC
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching active categories:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento categorie attive',
                details: err.message 
            });
        }
        
        console.log(`✅ Found ${results.length} active categories`);
        res.json({
            success: true,
            categories: results
        });
    });
}

// GET singola categoria per ID
function getCategoryById(req, res) {
    const categoryId = req.params.id;
    
    console.log('🏷️ Getting category by ID:', categoryId);
    
    const sql = `
        SELECT 
            id, name, description, icon, color, sort_order, active, created_at, updated_at
        FROM categories 
        WHERE id = ?
    `;
    
    connection.query(sql, [categoryId], (err, results) => {
        if (err) {
            console.error('❌ Error fetching category:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento categoria',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Categoria non trovata' 
            });
        }
        
        const category = {
            ...results[0],
            active: Boolean(results[0].active)
        };
        
        console.log('✅ Category found:', category.name);
        res.json({
            success: true,
            category: category
        });
    });
}

// GET statistiche categorie
function getCategoryStats(req, res) {
    console.log('📊 Getting category statistics');
    
    const sql = `
        SELECT 
            COUNT(*) as total_categories,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active_categories,
            COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_categories,
            (SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL) as total_products_with_category,
            (SELECT COUNT(*) FROM products WHERE category_id IS NULL) as products_without_category
        FROM categories
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching category stats:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }
        
        const stats = results[0];
        console.log('✅ Category stats calculated:', stats);
        
        res.json({
            success: true,
            stats: stats
        });
    });
}

// POST nuova categoria
function createCategory(req, res) {
    const { 
        name, 
        description = '', 
        icon = '📁', 
        color = '#6B7280',
        sort_order = 0,
        active = true 
    } = req.body;
    
    console.log('➕ Creating new category:', { name, description, icon, color });
    
    // Validazione
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Il nome della categoria è obbligatorio' 
        });
    }
    
    if (name.length > 100) {
        return res.status(400).json({ 
            success: false,
            error: 'Il nome non può superare i 100 caratteri' 
        });
    }
    
    // Verifica nome duplicato
    const checkSql = 'SELECT id FROM categories WHERE name = ?';
    connection.query(checkSql, [name], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking duplicate category:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica categoria esistente',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length > 0) {
            return res.status(409).json({ 
                success: false,
                error: 'Una categoria con questo nome esiste già' 
            });
        }
        
        // Inserimento
        const insertSql = `
            INSERT INTO categories (name, description, icon, color, sort_order, active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        connection.query(insertSql, [
            name.trim(), 
            description || '', 
            icon, 
            color, 
            parseInt(sort_order) || 0,
            active ? 1 : 0
        ], (insertErr, result) => {
            if (insertErr) {
                console.error('❌ Error creating category:', insertErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nella creazione categoria',
                    details: insertErr.message 
                });
            }
            
            console.log('✅ Category created successfully with ID:', result.insertId);
            res.status(201).json({ 
                success: true,
                message: 'Categoria creata con successo',
                category: {
                    id: result.insertId,
                    name,
                    description,
                    icon,
                    color,
                    sort_order: parseInt(sort_order) || 0,
                    active: Boolean(active)
                }
            });
        });
    });
}

// PATCH aggiornamento categoria
function updateCategory(req, res) {
    const categoryId = req.params.id;
    const { name, description, icon, color, sort_order, active } = req.body;
    
    console.log('✏️ Updating category:', categoryId, req.body);
    
    // Verifica categoria esistente
    const checkSql = 'SELECT * FROM categories WHERE id = ?';
    connection.query(checkSql, [categoryId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking category:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica categoria',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Categoria non trovata' 
            });
        }
        
        // Costruisci query di aggiornamento dinamica
        const updates = [];
        const values = [];
        
        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Il nome della categoria non può essere vuoto' 
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
        
        if (sort_order !== undefined) {
            updates.push('sort_order = ?');
            values.push(parseInt(sort_order) || 0);
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
        values.push(categoryId);
        
        const updateSql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
        
        connection.query(updateSql, values, (updateErr, result) => {
            if (updateErr) {
                console.error('❌ Error updating category:', updateErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nell\'aggiornamento categoria',
                    details: updateErr.message 
                });
            }
            
            console.log('✅ Category updated successfully');
            res.json({ 
                success: true,
                message: 'Categoria aggiornata con successo',
                affectedRows: result.affectedRows
            });
        });
    });
}

// DELETE categoria
function deleteCategory(req, res) {
    const categoryId = req.params.id;
    
    console.log('🗑️ Deleting category:', categoryId);
    
    // Controlla se ci sono prodotti collegati
    const checkProductsSql = 'SELECT COUNT(*) as product_count FROM products WHERE category_id = ?';
    connection.query(checkProductsSql, [categoryId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking category dependencies:', checkErr);
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
                error: `Impossibile eliminare: ${productCount} prodotti collegati a questa categoria`,
                details: 'Rimuovi o riassegna i prodotti prima di eliminare la categoria'
            });
        }
        
        // Verifica categoria esistente ed elimina
        const deleteSql = 'DELETE FROM categories WHERE id = ?';
        connection.query(deleteSql, [categoryId], (deleteErr, result) => {
            if (deleteErr) {
                console.error('❌ Error deleting category:', deleteErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nell\'eliminazione categoria',
                    details: deleteErr.message 
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Categoria non trovata' 
                });
            }
            
            console.log('✅ Category deleted successfully');
            res.json({ 
                success: true,
                message: 'Categoria eliminata con successo' 
            });
        });
    });
}

module.exports = {
    getCategories,
    getActiveCategories,
    getCategoryById,
    getCategoryStats,
    createCategory,
    updateCategory,
    deleteCategory
};
