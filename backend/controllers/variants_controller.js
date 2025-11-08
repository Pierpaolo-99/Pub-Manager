const connection = require('../database/db');

// GET tutte le varianti
function getAllVariants(req, res) {
    const { 
        product_id, 
        active, 
        search,
        limit = 100,
        offset = 0 
    } = req.query;
    
    let sql = `
        SELECT 
            pv.id,
            pv.product_id,
            pv.name,
            pv.price,
            pv.sku,
            pv.sort_order,
            pv.active,
            pv.created_at,
            pv.updated_at,
            p.name as product_name,
            p.base_price as product_base_price,
            c.name as category_name,
            COALESCE(s.quantity, 0) as stock_quantity,
            s.unit as stock_unit,
            COUNT(DISTINCT sm.id) as movement_count
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        LEFT JOIN stock_movements sm ON pv.id = sm.product_variant_id
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (product_id) {
        sql += ` AND pv.product_id = ?`;
        params.push(product_id);
    }
    
    if (active !== undefined && active !== 'all') {
        sql += ` AND pv.active = ?`;
        params.push(active === 'true' ? 1 : 0);
    }
    
    if (search) {
        sql += ` AND (pv.name LIKE ? OR pv.sku LIKE ? OR p.name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    sql += ` GROUP BY pv.id ORDER BY p.name, pv.sort_order, pv.name LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching variants:', err);
            return res.status(500).json({ error: 'Errore nel caricamento varianti' });
        }
        
        // Calcola statistiche per i risultati correnti
        const stats = calculateVariantStats(results);
        
        res.json({
            variants: results,
            stats,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: results.length
            }
        });
    });
}

// GET statistiche varianti
function getVariantStats(req, res) {
    const { product_id, active } = req.query;
    
    let sql = `
        SELECT 
            COUNT(*) as total_variants,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active_variants,
            COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_variants,
            COUNT(DISTINCT product_id) as products_with_variants,
            AVG(price) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price,
            COUNT(CASE WHEN sku IS NOT NULL AND sku != '' THEN 1 END) as variants_with_sku
        FROM product_variants
        WHERE 1=1
    `;
    
    const params = [];
    
    if (product_id) {
        sql += ` AND product_id = ?`;
        params.push(product_id);
    }
    
    if (active !== undefined && active !== 'all') {
        sql += ` AND active = ?`;
        params.push(active === 'true' ? 1 : 0);
    }
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching variant stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        res.json(results[0]);
    });
}

// GET singola variante
function getVariantById(req, res) {
    const { id } = req.params;
    
    const sql = `
        SELECT 
            pv.*,
            p.name as product_name,
            p.base_price as product_base_price,
            c.name as category_name,
            COALESCE(s.quantity, 0) as stock_quantity,
            s.unit as stock_unit
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE pv.id = ?
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching variant:', err);
            return res.status(500).json({ error: 'Errore nel caricamento variante' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Variante non trovata' });
        }
        
        res.json({ variant: results[0] });
    });
}

// POST nuova variante
function createVariant(req, res) {
    const {
        product_id,
        name,
        price,
        sku,
        sort_order = 0,
        active = true
    } = req.body;
    
    // Validazione
    if (!product_id || !name || !price) {
        return res.status(400).json({ 
            error: 'Prodotto, nome e prezzo sono obbligatori' 
        });
    }
    
    if (parseFloat(price) < 0) {
        return res.status(400).json({ 
            error: 'Il prezzo deve essere positivo' 
        });
    }
    
    // Verifica che il prodotto esista
    const checkProductSql = 'SELECT id FROM products WHERE id = ? AND is_available = 1';
    
    connection.query(checkProductSql, [product_id], (err, productResults) => {
        if (err) {
            console.error('Error checking product:', err);
            return res.status(500).json({ error: 'Errore nella verifica prodotto' });
        }
        
        if (productResults.length === 0) {
            return res.status(400).json({ error: 'Prodotto non trovato o non disponibile' });
        }
        
        // Verifica unicità SKU se fornito
        if (sku) {
            const checkSkuSql = 'SELECT id FROM product_variants WHERE sku = ? AND product_id != ?';
            
            connection.query(checkSkuSql, [sku, product_id], (err, skuResults) => {
                if (err) {
                    console.error('Error checking SKU:', err);
                    return res.status(500).json({ error: 'Errore nella verifica SKU' });
                }
                
                if (skuResults.length > 0) {
                    return res.status(400).json({ error: 'SKU già esistente per altro prodotto' });
                }
                
                createVariantRecord();
            });
        } else {
            createVariantRecord();
        }
        
        function createVariantRecord() {
            const insertSql = `
                INSERT INTO product_variants (product_id, name, price, sku, sort_order, active)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const insertParams = [
                product_id,
                name.trim(),
                parseFloat(price),
                sku ? sku.trim() : null,
                parseInt(sort_order),
                active ? 1 : 0
            ];
            
            connection.query(insertSql, insertParams, (err, result) => {
                if (err) {
                    console.error('Error creating variant:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ error: 'Variante con questo nome già esistente per il prodotto' });
                    }
                    return res.status(500).json({ error: 'Errore nella creazione variante' });
                }
                
                const variantId = result.insertId;
                console.log(`✅ Variant created: ${variantId} - ${name} for product ${product_id}`);
                
                res.status(201).json({
                    id: variantId,
                    message: 'Variante creata con successo',
                    variant: {
                        id: variantId,
                        product_id,
                        name,
                        price: parseFloat(price),
                        sku,
                        sort_order: parseInt(sort_order),
                        active: active ? 1 : 0
                    }
                });
            });
        }
    });
}

// PUT aggiornamento variante
function updateVariant(req, res) {
    const { id } = req.params;
    const {
        name,
        price,
        sku,
        sort_order,
        active
    } = req.body;
    
    // Validazione
    if (!name || !price) {
        return res.status(400).json({ 
            error: 'Nome e prezzo sono obbligatori' 
        });
    }
    
    if (parseFloat(price) < 0) {
        return res.status(400).json({ 
            error: 'Il prezzo deve essere positivo' 
        });
    }
    
    // Verifica che la variante esista
    const checkVariantSql = 'SELECT product_id FROM product_variants WHERE id = ?';
    
    connection.query(checkVariantSql, [id], (err, variantResults) => {
        if (err) {
            console.error('Error checking variant:', err);
            return res.status(500).json({ error: 'Errore nella verifica variante' });
        }
        
        if (variantResults.length === 0) {
            return res.status(404).json({ error: 'Variante non trovata' });
        }
        
        const productId = variantResults[0].product_id;
        
        // Verifica unicità SKU se fornito e diverso da quello attuale
        if (sku) {
            const checkSkuSql = 'SELECT id FROM product_variants WHERE sku = ? AND id != ? AND product_id != ?';
            
            connection.query(checkSkuSql, [sku, id, productId], (err, skuResults) => {
                if (err) {
                    console.error('Error checking SKU:', err);
                    return res.status(500).json({ error: 'Errore nella verifica SKU' });
                }
                
                if (skuResults.length > 0) {
                    return res.status(400).json({ error: 'SKU già esistente per altro prodotto' });
                }
                
                updateVariantRecord();
            });
        } else {
            updateVariantRecord();
        }
        
        function updateVariantRecord() {
            const updateSql = `
                UPDATE product_variants 
                SET name = ?, price = ?, sku = ?, sort_order = ?, active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            const updateParams = [
                name.trim(),
                parseFloat(price),
                sku ? sku.trim() : null,
                sort_order ? parseInt(sort_order) : 0,
                active ? 1 : 0,
                id
            ];
            
            connection.query(updateSql, updateParams, (err, result) => {
                if (err) {
                    console.error('Error updating variant:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ error: 'Variante con questo nome già esistente per il prodotto' });
                    }
                    return res.status(500).json({ error: 'Errore nell\'aggiornamento variante' });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Variante non trovata' });
                }
                
                console.log(`✅ Variant updated: ${id} - ${name}`);
                res.json({ message: 'Variante aggiornata con successo' });
            });
        }
    });
}

// DELETE variante
function deleteVariant(req, res) {
    const { id } = req.params;
    const { force = false } = req.body;
    
    // Verifica se la variante ha dipendenze (stock, movimenti, ordini)
    const checkDependenciesSql = `
        SELECT 
            (SELECT COUNT(*) FROM stock WHERE product_variant_id = ?) as stock_records,
            (SELECT COUNT(*) FROM stock_movements WHERE product_variant_id = ?) as movement_records,
            (SELECT COUNT(*) FROM order_items WHERE product_variant_id = ?) as order_records
    `;
    
    connection.query(checkDependenciesSql, [id, id, id], (err, depResults) => {
        if (err) {
            console.error('Error checking dependencies:', err);
            return res.status(500).json({ error: 'Errore nella verifica dipendenze' });
        }
        
        const deps = depResults[0];
        const hasDependencies = deps.stock_records > 0 || deps.movement_records > 0 || deps.order_records > 0;
        
        if (hasDependencies && !force) {
            return res.status(409).json({ 
                error: 'Impossibile eliminare: variante utilizzata in ordini, stock o movimenti',
                dependencies: deps,
                suggestion: 'Disattiva la variante invece di eliminarla, oppure forza la cancellazione'
            });
        }
        
        // Procedi con la cancellazione
        const deleteSql = 'DELETE FROM product_variants WHERE id = ?';
        
        connection.query(deleteSql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting variant:', err);
                return res.status(500).json({ error: 'Errore nella cancellazione variante' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Variante non trovata' });
            }
            
            console.log(`✅ Variant deleted: ${id} ${force ? '(forced)' : ''}`);
            res.json({ 
                message: 'Variante eliminata con successo',
                forced: force
            });
        });
    });
}

// GET prodotti per dropdown
function getProductsForVariants(req, res) {
    const sql = `
        SELECT 
            p.id,
            p.name,
            p.base_price,
            c.name as category_name,
            COUNT(pv.id) as variant_count,
            p.is_available
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        WHERE p.is_available = 1
        GROUP BY p.id, p.name, p.base_price, c.name, p.is_available
        ORDER BY c.name, p.name
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ error: 'Errore nel caricamento prodotti' });
        }
        
        res.json({ products: results });
    });
}

// GET varianti per prodotto specifico
function getVariantsByProduct(req, res) {
    const { productId } = req.params;
    
    const sql = `
        SELECT 
            pv.*,
            COALESCE(s.quantity, 0) as stock_quantity,
            s.unit as stock_unit
        FROM product_variants pv
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE pv.product_id = ?
        ORDER BY pv.sort_order, pv.name
    `;
    
    connection.query(sql, [productId], (err, results) => {
        if (err) {
            console.error('Error fetching product variants:', err);
            return res.status(500).json({ error: 'Errore nel caricamento varianti prodotto' });
        }
        
        res.json({ variants: results });
    });
}

// PUT aggiornamento ordinamento varianti
function updateVariantOrder(req, res) {
    const { variants } = req.body; // Array di { id, sort_order }
    
    if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ error: 'Array varianti richiesto' });
    }
    
    const updatePromises = variants.map(variant => {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE product_variants SET sort_order = ? WHERE id = ?';
            connection.query(sql, [variant.sort_order, variant.id], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    });
    
    Promise.all(updatePromises)
        .then(() => {
            console.log(`✅ Updated order for ${variants.length} variants`);
            res.json({ message: 'Ordinamento varianti aggiornato con successo' });
        })
        .catch(err => {
            console.error('Error updating variant order:', err);
            res.status(500).json({ error: 'Errore nell\'aggiornamento ordinamento' });
        });
}

// Funzione helper per statistiche
function calculateVariantStats(variants) {
    const today = new Date().toISOString().slice(0, 10);
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    const todayVariants = variants.filter(v => 
        new Date(v.created_at).toISOString().slice(0, 10) === today
    );
    const weekVariants = variants.filter(v => 
        new Date(v.created_at).toISOString().slice(0, 10) >= thisWeek
    );
    
    return {
        total: variants.length,
        today: todayVariants.length,
        this_week: weekVariants.length,
        active: variants.filter(v => v.active === 1).length,
        inactive: variants.filter(v => v.active === 0).length,
        with_stock: variants.filter(v => parseFloat(v.stock_quantity) > 0).length,
        out_of_stock: variants.filter(v => parseFloat(v.stock_quantity) === 0).length,
        unique_products: new Set(variants.map(v => v.product_id)).size,
        avg_price: variants.length > 0 ? 
            (variants.reduce((sum, v) => sum + parseFloat(v.price), 0) / variants.length) : 0,
        price_range: variants.length > 0 ? {
            min: Math.min(...variants.map(v => parseFloat(v.price))),
            max: Math.max(...variants.map(v => parseFloat(v.price)))
        } : { min: 0, max: 0 }
    };
}

module.exports = {
    getAllVariants,
    getVariantStats,
    getVariantById,
    createVariant,
    updateVariant,
    deleteVariant,
    getProductsForVariants,
    getVariantsByProduct,
    updateVariantOrder
};