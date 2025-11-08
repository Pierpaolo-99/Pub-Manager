const connection = require('../database/db');

// GET prodotti per dropdown (CORRETTA)
function getProductsForVariants(req, res) {
    const sql = `
        SELECT 
            p.id,
            p.name,
            p.base_price,
            COALESCE(c.name, 'Nessuna categoria') as category_name,
            COUNT(pv.id) as variant_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        WHERE p.active = 1
        GROUP BY p.id, p.name, p.base_price, c.name
        ORDER BY c.name, p.name
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products for variants:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento prodotti',
                details: err.message 
            });
        }
        
        console.log(`✅ Fetched ${results.length} products for variants dropdown`);
        res.json({ products: results || [] });
    });
}

// GET tutte le varianti (CORRETTA)
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
            COALESCE(c.name, 'Nessuna categoria') as category_name,
            COALESCE(s.quantity, 0) as stock_quantity,
            COALESCE(s.unit, 'pcs') as stock_unit
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON pv.id = s.product_variant_id
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
            return res.status(500).json({ 
                error: 'Errore nel caricamento varianti',
                details: err.message 
            });
        }
        
        // Aggiungi movimento count con query separata per sicurezza
        const variantIds = results.map(v => v.id);
        
        if (variantIds.length > 0) {
            const movementCountSql = `
                SELECT product_variant_id, COUNT(*) as movement_count
                FROM stock_movements 
                WHERE product_variant_id IN (${variantIds.map(() => '?').join(',')})
                GROUP BY product_variant_id
            `;
            
            connection.query(movementCountSql, variantIds, (movErr, movResults) => {
                if (!movErr && movResults) {
                    const movementCounts = {};
                    movResults.forEach(row => {
                        movementCounts[row.product_variant_id] = row.movement_count;
                    });
                    
                    // Aggiungi movement count a ogni variante
                    results.forEach(variant => {
                        variant.movement_count = movementCounts[variant.id] || 0;
                    });
                }
                
                // Calcola statistiche
                const stats = calculateVariantStats(results);
                
                console.log(`✅ Fetched ${results.length} variants`);
                res.json({
                    variants: results || [],
                    stats,
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        total: results.length
                    }
                });
            });
        } else {
            const stats = calculateVariantStats(results);
            
            res.json({
                variants: results || [],
                stats,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: results.length
                }
            });
        }
    });
}

// GET statistiche varianti (CORRETTA)
function getVariantStats(req, res) {
    const { product_id, active } = req.query;
    
    let sql = `
        SELECT 
            COUNT(*) as total_variants,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active_variants,
            COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_variants,
            COUNT(DISTINCT product_id) as unique_products,
            AVG(COALESCE(price, 0)) as avg_price,
            MIN(COALESCE(price, 0)) as min_price,
            MAX(COALESCE(price, 0)) as max_price,
            COUNT(CASE WHEN sku IS NOT NULL AND sku != '' THEN 1 END) as variants_with_sku
        FROM product_variants pv
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
    
    // Query aggiuntiva per stock info
    let stockSql = `
        SELECT 
            COUNT(CASE WHEN s.quantity > 0 THEN 1 END) as with_stock,
            COUNT(CASE WHEN COALESCE(s.quantity, 0) = 0 THEN 1 END) as out_of_stock
        FROM product_variants pv
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE 1=1
    `;
    
    if (product_id) {
        stockSql += ` AND pv.product_id = ?`;
    }
    
    if (active !== undefined && active !== 'all') {
        stockSql += ` AND pv.active = ?`;
    }
    
    // Esegui prima query
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching variant stats:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }
        
        const basicStats = results[0];
        
        // Esegui seconda query per stock
        connection.query(stockSql, params, (stockErr, stockResults) => {
            if (stockErr) {
                console.error('Error fetching stock stats:', stockErr);
                // Continua senza stock info
                return res.json({
                    ...basicStats,
                    with_stock: 0,
                    out_of_stock: basicStats.total_variants,
                    price_range: basicStats.max_price > 0 ? {
                        min: basicStats.min_price,
                        max: basicStats.max_price
                    } : { min: 0, max: 0 }
                });
            }
            
            const stockStats = stockResults[0];
            
            res.json({
                total: basicStats.total_variants || 0,
                active: basicStats.active_variants || 0,
                inactive: basicStats.inactive_variants || 0,
                unique_products: basicStats.unique_products || 0,
                avg_price: basicStats.avg_price || 0,
                with_stock: stockStats.with_stock || 0,
                out_of_stock: stockStats.out_of_stock || 0,
                variants_with_sku: basicStats.variants_with_sku || 0,
                price_range: basicStats.max_price > 0 ? {
                    min: basicStats.min_price,
                    max: basicStats.max_price
                } : { min: 0, max: 0 }
            });
        });
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
            COALESCE(c.name, 'Nessuna categoria') as category_name,
            COALESCE(s.quantity, 0) as stock_quantity,
            COALESCE(s.unit, 'pcs') as stock_unit
        FROM product_variants pv
        INNER JOIN products p ON pv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE pv.id = ?
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching variant:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento variante',
                details: err.message 
            });
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
    const checkProductSql = 'SELECT id FROM products WHERE id = ? AND active = 1';
    
    connection.query(checkProductSql, [product_id], (err, productResults) => {
        if (err) {
            console.error('Error checking product:', err);
            return res.status(500).json({ 
                error: 'Errore nella verifica prodotto',
                details: err.message 
            });
        }
        
        if (productResults.length === 0) {
            return res.status(400).json({ error: 'Prodotto non trovato o non attivo' });
        }
        
        // Verifica unicità SKU se fornito
        if (sku) {
            const checkSkuSql = 'SELECT id FROM product_variants WHERE sku = ? AND product_id != ?';
            
            connection.query(checkSkuSql, [sku, product_id], (err, skuResults) => {
                if (err) {
                    console.error('Error checking SKU:', err);
                    return res.status(500).json({ 
                        error: 'Errore nella verifica SKU',
                        details: err.message 
                    });
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
                    return res.status(500).json({ 
                        error: 'Errore nella creazione variante',
                        details: err.message 
                    });
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
    if (!name || price === undefined || price === null) {
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
            return res.status(500).json({ 
                error: 'Errore nella verifica variante',
                details: err.message 
            });
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
                    return res.status(500).json({ 
                        error: 'Errore nella verifica SKU',
                        details: err.message 
                    });
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
                    return res.status(500).json({ 
                        error: 'Errore nell\'aggiornamento variante',
                        details: err.message 
                    });
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
            return res.status(500).json({ 
                error: 'Errore nella verifica dipendenze',
                details: err.message 
            });
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
                return res.status(500).json({ 
                    error: 'Errore nella cancellazione variante',
                    details: err.message 
                });
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

// GET varianti per prodotto specifico
function getVariantsByProduct(req, res) {
    const { productId } = req.params;
    
    const sql = `
        SELECT 
            pv.*,
            COALESCE(s.quantity, 0) as stock_quantity,
            COALESCE(s.unit, 'pcs') as stock_unit
        FROM product_variants pv
        LEFT JOIN stock s ON pv.id = s.product_variant_id
        WHERE pv.product_id = ?
        ORDER BY pv.sort_order, pv.name
    `;
    
    connection.query(sql, [productId], (err, results) => {
        if (err) {
            console.error('Error fetching product variants:', err);
            return res.status(500).json({ 
                error: 'Errore nel caricamento varianti prodotto',
                details: err.message 
            });
        }
        
        res.json({ variants: results || [] });
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
            res.status(500).json({ 
                error: 'Errore nell\'aggiornamento ordinamento',
                details: err.message 
            });
        });
}

// Funzione helper per statistiche
function calculateVariantStats(variants) {
    if (!variants || variants.length === 0) {
        return {
            total: 0,
            today: 0,
            this_week: 0,
            active: 0,
            inactive: 0,
            with_stock: 0,
            out_of_stock: 0,
            unique_products: 0,
            avg_price: 0,
            price_range: { min: 0, max: 0 }
        };
    }
    
    const today = new Date().toISOString().slice(0, 10);
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    const todayVariants = variants.filter(v => 
        v.created_at && new Date(v.created_at).toISOString().slice(0, 10) === today
    );
    const weekVariants = variants.filter(v => 
        v.created_at && new Date(v.created_at).toISOString().slice(0, 10) >= thisWeek
    );
    
    const prices = variants.map(v => parseFloat(v.price || 0)).filter(p => p > 0);
    
    return {
        total: variants.length,
        today: todayVariants.length,
        this_week: weekVariants.length,
        active: variants.filter(v => v.active === 1).length,
        inactive: variants.filter(v => v.active === 0).length,
        with_stock: variants.filter(v => parseFloat(v.stock_quantity || 0) > 0).length,
        out_of_stock: variants.filter(v => parseFloat(v.stock_quantity || 0) === 0).length,
        unique_products: new Set(variants.map(v => v.product_id)).size,
        avg_price: prices.length > 0 ? 
            (prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0,
        price_range: prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices)
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