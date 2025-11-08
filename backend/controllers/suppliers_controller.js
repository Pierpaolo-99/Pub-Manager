const connection = require('../database/db');

// GET tutti i fornitori
function getAllSuppliers(req, res) {
    const { search, active, payment_terms } = req.query;
    
    console.log('🚚 Fetching suppliers with filters:', { search, active, payment_terms });
    
    let sql = `
        SELECT 
            id, name, contact_person, email, phone, address, city, 
            postal_code, country, website, notes, payment_terms, 
            active, created_at, updated_at
        FROM suppliers
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (search) {
        sql += ` AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR notes LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (active === 'true') {
        sql += ` AND active = 1`;
    } else if (active === 'false') {
        sql += ` AND active = 0`;
    }
    
    if (payment_terms) {
        sql += ` AND payment_terms = ?`;
        params.push(payment_terms);
    }
    
    sql += ` ORDER BY active DESC, name ASC`;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching suppliers:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento fornitori',
                details: err.message 
            });
        }
        
        // Converti active in boolean e aggiungi statistiche
        const suppliers = results.map(supplier => ({
            ...supplier,
            active: Boolean(supplier.active)
        }));
        
        console.log(`✅ Found ${suppliers.length} suppliers`);
        res.json({
            success: true,
            suppliers,
            summary: calculateSuppliersSummary(suppliers),
            filters: {
                search: search || null,
                active: active || 'all',
                payment_terms: payment_terms || null
            }
        });
    });
}

// GET solo fornitori attivi (per dropdown)
function getActiveSuppliers(req, res) {
    console.log('🚚 Fetching active suppliers for dropdown');
    
    const sql = `
        SELECT id, name, contact_person, email, phone
        FROM suppliers 
        WHERE active = 1 
        ORDER BY name ASC
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching active suppliers:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento fornitori attivi',
                details: err.message 
            });
        }
        
        console.log(`✅ Found ${results.length} active suppliers`);
        res.json({
            success: true,
            suppliers: results
        });
    });
}

// GET singolo fornitore
function getSupplierById(req, res) {
    const { id } = req.params;
    
    console.log('🚚 Getting supplier by ID:', id);
    
    const sql = `
        SELECT 
            id, name, contact_person, email, phone, address, city, 
            postal_code, country, website, notes, payment_terms, 
            active, created_at, updated_at
        FROM suppliers 
        WHERE id = ?
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching supplier:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento fornitore',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Fornitore non trovato' 
            });
        }
        
        const supplier = {
            ...results[0],
            active: Boolean(results[0].active)
        };
        
        console.log('✅ Supplier found:', supplier.name);
        res.json({
            success: true,
            supplier: supplier
        });
    });
}

// GET prodotti forniti da un supplier (da tabella stock)
function getSupplierProducts(req, res) {
    const { id } = req.params;
    
    console.log('🚚 Getting products for supplier:', id);
    
    // Prendi nome supplier prima
    const supplierSql = 'SELECT name FROM suppliers WHERE id = ?';
    
    connection.query(supplierSql, [id], (supplierErr, supplierResults) => {
        if (supplierErr) {
            console.error('❌ Error fetching supplier:', supplierErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento fornitore',
                details: supplierErr.message 
            });
        }
        
        if (supplierResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Fornitore non trovato' 
            });
        }
        
        const supplierName = supplierResults[0].name;
        
        // Cerca prodotti nel stock con questo fornitore
        const productsSql = `
            SELECT 
                s.id as stock_id,
                s.quantity,
                s.unit,
                s.cost_per_unit,
                s.last_restock_date,
                s.expiry_date,
                pv.id as variant_id,
                pv.name as variant_name,
                pv.sku as variant_sku,
                p.id as product_id,
                p.name as product_name,
                p.image_url as product_image,
                c.name as category_name,
                (s.quantity * s.cost_per_unit) as total_value
            FROM stock s
            INNER JOIN product_variants pv ON s.product_variant_id = pv.id
            INNER JOIN products p ON pv.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE s.supplier = ?
            ORDER BY p.name, pv.name
        `;
        
        connection.query(productsSql, [supplierName], (productsErr, products) => {
            if (productsErr) {
                console.error('❌ Error fetching supplier products:', productsErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nel caricamento prodotti fornitore',
                    details: productsErr.message 
                });
            }
            
            // Calcola statistiche
            const totalProducts = products.length;
            const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.total_value) || 0), 0);
            const lowStock = products.filter(p => parseFloat(p.quantity) <= 5).length;
            
            console.log(`✅ Found ${totalProducts} products for supplier ${supplierName}`);
            res.json({
                success: true,
                supplier: {
                    id: parseInt(id),
                    name: supplierName
                },
                products: products.map(p => ({
                    ...p,
                    quantity: parseFloat(p.quantity) || 0,
                    cost_per_unit: parseFloat(p.cost_per_unit) || 0,
                    total_value: parseFloat(p.total_value) || 0
                })),
                stats: {
                    total_products: totalProducts,
                    total_value: parseFloat(totalValue.toFixed(2)),
                    low_stock_products: lowStock
                }
            });
        });
    });
}

// POST nuovo fornitore
function createSupplier(req, res) {
    const {
        name, 
        contact_person, 
        email, 
        phone, 
        address, 
        city, 
        postal_code,
        country, 
        website, 
        payment_terms, 
        notes, 
        active
    } = req.body;
    
    console.log('➕ Creating new supplier:', { name, contact_person, email });
    
    // Validazione
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Nome fornitore è obbligatorio' 
        });
    }
    
    if (name.length > 255) {
        return res.status(400).json({ 
            success: false,
            error: 'Il nome non può superare i 255 caratteri' 
        });
    }
    
    // Validazione email se fornita
    if (email && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                error: 'Formato email non valido' 
            });
        }
    }
    
    // Verifica nome duplicato
    const checkSql = 'SELECT id FROM suppliers WHERE name = ?';
    connection.query(checkSql, [name.trim()], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking duplicate supplier:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica fornitore esistente',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length > 0) {
            return res.status(409).json({ 
                success: false,
                error: 'Un fornitore con questo nome esiste già' 
            });
        }
        
        // Inserimento
        const insertSql = `
            INSERT INTO suppliers (
                name, contact_person, email, phone, address, city, 
                postal_code, country, website, payment_terms, notes, 
                active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const params = [
            name.trim(),
            contact_person?.trim() || null,
            email?.trim() || null,
            phone?.trim() || null,
            address?.trim() || null,
            city?.trim() || null,
            postal_code?.trim() || null,
            country?.trim() || 'Italia',
            website?.trim() || null,
            payment_terms?.trim() || null,
            notes?.trim() || null,
            active !== undefined ? (active ? 1 : 0) : 1
        ];
        
        connection.query(insertSql, params, (insertErr, result) => {
            if (insertErr) {
                console.error('❌ Error creating supplier:', insertErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nella creazione fornitore',
                    details: insertErr.message 
                });
            }
            
            console.log('✅ Supplier created successfully with ID:', result.insertId);
            res.status(201).json({ 
                success: true,
                message: 'Fornitore creato con successo',
                supplier: {
                    id: result.insertId,
                    name: name.trim(),
                    contact_person,
                    email,
                    phone,
                    active: Boolean(active !== false)
                }
            });
        });
    });
}

// PATCH aggiornamento fornitore
function updateSupplier(req, res) {
    const { id } = req.params;
    const { 
        name, contact_person, email, phone, address, city, 
        postal_code, country, website, payment_terms, notes, active 
    } = req.body;
    
    console.log('✏️ Updating supplier:', id, req.body);
    
    // Verifica fornitore esistente
    const checkSql = 'SELECT * FROM suppliers WHERE id = ?';
    connection.query(checkSql, [id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Error checking supplier:', checkErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica fornitore',
                details: checkErr.message 
            });
        }
        
        if (checkResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Fornitore non trovato' 
            });
        }
        
        // Costruisci query di aggiornamento dinamica
        const updates = [];
        const values = [];
        
        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Il nome del fornitore non può essere vuoto' 
                });
            }
            updates.push('name = ?');
            values.push(name.trim());
        }
        
        if (contact_person !== undefined) {
            updates.push('contact_person = ?');
            values.push(contact_person?.trim() || null);
        }
        
        if (email !== undefined) {
            if (email && email.trim() !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'Formato email non valido' 
                    });
                }
            }
            updates.push('email = ?');
            values.push(email?.trim() || null);
        }
        
        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone?.trim() || null);
        }
        
        if (address !== undefined) {
            updates.push('address = ?');
            values.push(address?.trim() || null);
        }
        
        if (city !== undefined) {
            updates.push('city = ?');
            values.push(city?.trim() || null);
        }
        
        if (postal_code !== undefined) {
            updates.push('postal_code = ?');
            values.push(postal_code?.trim() || null);
        }
        
        if (country !== undefined) {
            updates.push('country = ?');
            values.push(country?.trim() || null);
        }
        
        if (website !== undefined) {
            updates.push('website = ?');
            values.push(website?.trim() || null);
        }
        
        if (payment_terms !== undefined) {
            updates.push('payment_terms = ?');
            values.push(payment_terms?.trim() || null);
        }
        
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes?.trim() || null);
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
        
        const updateSql = `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`;
        
        connection.query(updateSql, values, (updateErr, result) => {
            if (updateErr) {
                console.error('❌ Error updating supplier:', updateErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nell\'aggiornamento fornitore',
                    details: updateErr.message 
                });
            }
            
            console.log('✅ Supplier updated successfully');
            res.json({ 
                success: true,
                message: 'Fornitore aggiornato con successo',
                affectedRows: result.affectedRows
            });
        });
    });
}

// DELETE fornitore
function deleteSupplier(req, res) {
    const { id } = req.params;
    
    console.log('🗑️ Deleting supplier:', id);
    
    // Controlla se ci sono prodotti in stock associati a questo fornitore
    const getSupplierNameSql = 'SELECT name FROM suppliers WHERE id = ?';
    
    connection.query(getSupplierNameSql, [id], (nameErr, nameResults) => {
        if (nameErr) {
            console.error('❌ Error getting supplier name:', nameErr);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella verifica fornitore',
                details: nameErr.message 
            });
        }
        
        if (nameResults.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Fornitore non trovato' 
            });
        }
        
        const supplierName = nameResults[0].name;
        
        // Controlla se ci sono prodotti in stock
        const checkStockSql = 'SELECT COUNT(*) as count FROM stock WHERE supplier = ?';
        
        connection.query(checkStockSql, [supplierName], (stockErr, stockResults) => {
            if (stockErr) {
                console.error('❌ Error checking stock:', stockErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nella verifica stock',
                    details: stockErr.message 
                });
            }
            
            const stockCount = stockResults[0].count;
            
            if (stockCount > 0) {
                // Se ci sono prodotti in stock, disattiva invece di eliminare
                const deactivateSql = 'UPDATE suppliers SET active = 0, updated_at = NOW() WHERE id = ?';
                connection.query(deactivateSql, [id], (deactivateErr, result) => {
                    if (deactivateErr) {
                        console.error('❌ Error deactivating supplier:', deactivateErr);
                        return res.status(500).json({ 
                            success: false,
                            error: 'Errore nella disattivazione fornitore',
                            details: deactivateErr.message 
                        });
                    }
                    
                    console.log('✅ Supplier deactivated due to stock dependencies');
                    res.json({ 
                        success: true,
                        message: `Fornitore disattivato (${stockCount} prodotti in stock associati)`,
                        deactivated: true,
                        stockProducts: stockCount
                    });
                });
            } else {
                // Elimina definitivamente se non ci sono prodotti in stock
                const deleteSql = 'DELETE FROM suppliers WHERE id = ?';
                connection.query(deleteSql, [id], (deleteErr, result) => {
                    if (deleteErr) {
                        console.error('❌ Error deleting supplier:', deleteErr);
                        return res.status(500).json({ 
                            success: false,
                            error: 'Errore nell\'eliminazione fornitore',
                            details: deleteErr.message 
                        });
                    }
                    
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ 
                            success: false,
                            error: 'Fornitore non trovato' 
                        });
                    }
                    
                    console.log('✅ Supplier deleted successfully');
                    res.json({ 
                        success: true,
                        message: 'Fornitore eliminato con successo',
                        deleted: true
                    });
                });
            }
        });
    });
}

// GET statistiche fornitori
function getSuppliersStats(req, res) {
    console.log('📊 Getting suppliers statistics');
    
    const sql = `
        SELECT 
            COUNT(*) as total_suppliers,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active_suppliers,
            COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_suppliers,
            COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as suppliers_with_email,
            COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as suppliers_with_phone,
            COUNT(CASE WHEN website IS NOT NULL AND website != '' THEN 1 END) as suppliers_with_website,
            COUNT(DISTINCT payment_terms) as payment_terms_count,
            COUNT(DISTINCT country) as countries_count
        FROM suppliers
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching suppliers stats:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento statistiche',
                details: err.message 
            });
        }
        
        const stats = results[0];
        console.log('✅ Suppliers stats calculated:', stats);
        
        res.json({
            success: true,
            stats: stats
        });
    });
}

// GET termini di pagamento disponibili
function getPaymentTerms(req, res) {
    console.log('💳 Getting available payment terms');
    
    const sql = `
        SELECT DISTINCT payment_terms 
        FROM suppliers 
        WHERE payment_terms IS NOT NULL AND payment_terms != ''
        ORDER BY payment_terms
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching payment terms:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento termini pagamento',
                details: err.message 
            });
        }
        
        const paymentTerms = results.map(row => row.payment_terms);
        
        console.log(`✅ Found ${paymentTerms.length} payment terms`);
        res.json({ 
            success: true,
            paymentTerms 
        });
    });
}

// Funzione helper per calcolare summary
function calculateSuppliersSummary(suppliers) {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.active).length;
    const inactive = total - active;
    const withEmail = suppliers.filter(s => s.email && s.email.trim() !== '').length;
    const withPhone = suppliers.filter(s => s.phone && s.phone.trim() !== '').length;
    const withWebsite = suppliers.filter(s => s.website && s.website.trim() !== '').length;
    
    return {
        total,
        active,
        inactive,
        withEmail,
        withPhone,
        withWebsite,
        contactCompleteness: total > 0 ? Math.round((withEmail + withPhone) / total * 100) : 0
    };
}

module.exports = {
    getAllSuppliers,
    getActiveSuppliers,
    getSupplierById,
    getSupplierProducts,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSuppliersStats,
    getPaymentTerms
};