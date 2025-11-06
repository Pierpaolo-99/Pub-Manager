const connection = require('../database/db');

// GET tutti i fornitori
function getAllSuppliers(req, res) {
    const { search, active, payment_terms } = req.query;
    
    let sql = `
        SELECT 
            id, name, company_name, vat_number, tax_code, contact_person,
            email, phone, mobile, website, address, city, postal_code,
            country, payment_terms, discount_percentage, delivery_days,
            min_order_amount, notes, active, created_at, updated_at
        FROM suppliers
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (search) {
        sql += ` AND (name LIKE ? OR company_name LIKE ? OR contact_person LIKE ? OR email LIKE ?)`;
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
            console.error('Error fetching suppliers:', err);
            return res.status(500).json({ error: 'Errore nel caricamento fornitori' });
        }
        
        // Converti active in boolean
        const suppliers = results.map(supplier => ({
            ...supplier,
            active: Boolean(supplier.active),
            discount_percentage: parseFloat(supplier.discount_percentage) || 0,
            min_order_amount: parseFloat(supplier.min_order_amount) || 0
        }));
        
        res.json({
            suppliers,
            summary: calculateSuppliersSummary(suppliers)
        });
    });
}

// GET singolo fornitore
function getSupplierById(req, res) {
    const { id } = req.params;
    
    const sql = `SELECT * FROM suppliers WHERE id = ?`;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching supplier:', err);
            return res.status(500).json({ error: 'Errore nel caricamento fornitore' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Fornitore non trovato' });
        }
        
        const supplier = {
            ...results[0],
            active: Boolean(results[0].active),
            discount_percentage: parseFloat(results[0].discount_percentage) || 0,
            min_order_amount: parseFloat(results[0].min_order_amount) || 0
        };
        
        res.json(supplier);
    });
}

// POST nuovo fornitore
function createSupplier(req, res) {
    const {
        name, company_name, vat_number, tax_code, contact_person,
        email, phone, mobile, website, address, city, postal_code,
        country, payment_terms, discount_percentage, delivery_days,
        min_order_amount, notes, active
    } = req.body;
    
    // Validazione
    if (!name) {
        return res.status(400).json({ 
            error: 'Nome fornitore è obbligatorio' 
        });
    }
    
    const sql = `
        INSERT INTO suppliers (
            name, company_name, vat_number, tax_code, contact_person,
            email, phone, mobile, website, address, city, postal_code,
            country, payment_terms, discount_percentage, delivery_days,
            min_order_amount, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        name.trim(),
        company_name?.trim() || null,
        vat_number?.trim() || null,
        tax_code?.trim() || null,
        contact_person?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        mobile?.trim() || null,
        website?.trim() || null,
        address?.trim() || null,
        city?.trim() || null,
        postal_code?.trim() || null,
        country?.trim() || 'Italia',
        payment_terms?.trim() || null,
        parseFloat(discount_percentage) || 0.00,
        delivery_days?.trim() || null,
        parseFloat(min_order_amount) || 0.00,
        notes?.trim() || null,
        active !== undefined ? (active ? 1 : 0) : 1
    ];
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error creating supplier:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Fornitore già esistente' });
            }
            return res.status(500).json({ error: 'Errore nella creazione del fornitore' });
        }
        
        res.status(201).json({
            id: result.insertId,
            message: 'Fornitore creato con successo',
            supplier: { id: result.insertId, name, active: Boolean(active !== false) }
        });
    });
}

// PUT aggiornamento fornitore
function updateSupplier(req, res) {
    const { id } = req.params;
    const {
        name, company_name, vat_number, tax_code, contact_person,
        email, phone, mobile, website, address, city, postal_code,
        country, payment_terms, discount_percentage, delivery_days,
        min_order_amount, notes, active
    } = req.body;
    
    const sql = `
        UPDATE suppliers SET
            name = ?, company_name = ?, vat_number = ?, tax_code = ?,
            contact_person = ?, email = ?, phone = ?, mobile = ?,
            website = ?, address = ?, city = ?, postal_code = ?,
            country = ?, payment_terms = ?, discount_percentage = ?,
            delivery_days = ?, min_order_amount = ?, notes = ?, active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        name?.trim(),
        company_name?.trim() || null,
        vat_number?.trim() || null,
        tax_code?.trim() || null,
        contact_person?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        mobile?.trim() || null,
        website?.trim() || null,
        address?.trim() || null,
        city?.trim() || null,
        postal_code?.trim() || null,
        country?.trim() || 'Italia',
        payment_terms?.trim() || null,
        parseFloat(discount_percentage) || 0.00,
        delivery_days?.trim() || null,
        parseFloat(min_order_amount) || 0.00,
        notes?.trim() || null,
        active !== undefined ? (active ? 1 : 0) : 1,
        id
    ];
    
    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error updating supplier:', err);
            return res.status(500).json({ error: 'Errore nell\'aggiornamento fornitore' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Fornitore non trovato' });
        }
        
        res.json({ message: 'Fornitore aggiornato con successo' });
    });
}

// DELETE fornitore
function deleteSupplier(req, res) {
    const { id } = req.params;
    
    // Prima controlla se ci sono ordini di acquisto associati
    const checkOrdersSql = 'SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?';
    
    connection.query(checkOrdersSql, [id], (err, results) => {
        if (err) {
            console.error('Error checking orders:', err);
            return res.status(500).json({ error: 'Errore nella verifica ordini' });
        }
        
        const orderCount = results[0].count;
        
        if (orderCount > 0) {
            // Se ci sono ordini, disattiva invece di eliminare
            const deactivateSql = 'UPDATE suppliers SET active = 0 WHERE id = ?';
            connection.query(deactivateSql, [id], (err, result) => {
                if (err) {
                    console.error('Error deactivating supplier:', err);
                    return res.status(500).json({ error: 'Errore nella disattivazione fornitore' });
                }
                
                res.json({ 
                    message: 'Fornitore disattivato (ha ordini associati)',
                    deactivated: true 
                });
            });
        } else {
            // Elimina definitivamente se non ci sono ordini
            const deleteSql = 'DELETE FROM suppliers WHERE id = ?';
            connection.query(deleteSql, [id], (err, result) => {
                if (err) {
                    console.error('Error deleting supplier:', err);
                    return res.status(500).json({ error: 'Errore nell\'eliminazione fornitore' });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Fornitore non trovato' });
                }
                
                res.json({ 
                    message: 'Fornitore eliminato con successo',
                    deleted: true 
                });
            });
        }
    });
}

// GET statistiche fornitori
function getSuppliersStats(req, res) {
    const sql = `
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active,
            COUNT(CASE WHEN active = 0 THEN 1 END) as inactive,
            COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
            AVG(discount_percentage) as avg_discount,
            COUNT(DISTINCT country) as countries_count
        FROM suppliers
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching suppliers stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        const stats = {
            ...results[0],
            avg_discount: parseFloat(results[0].avg_discount) || 0
        };
        
        res.json(stats);
    });
}

// GET termini di pagamento disponibili
function getPaymentTerms(req, res) {
    const sql = `
        SELECT DISTINCT payment_terms 
        FROM suppliers 
        WHERE payment_terms IS NOT NULL AND payment_terms != ''
        ORDER BY payment_terms
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching payment terms:', err);
            return res.status(500).json({ error: 'Errore nel caricamento termini pagamento' });
        }
        
        const paymentTerms = results.map(row => row.payment_terms);
        res.json({ paymentTerms });
    });
}

// Funzione helper per calcolare summary
function calculateSuppliersSummary(suppliers) {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.active).length;
    const inactive = total - active;
    const withEmail = suppliers.filter(s => s.email && s.email.trim() !== '').length;
    const avgDiscount = suppliers.length > 0 
        ? suppliers.reduce((sum, s) => sum + s.discount_percentage, 0) / suppliers.length 
        : 0;
    
    return {
        total,
        active,
        inactive,
        withEmail,
        avgDiscount: Math.round(avgDiscount * 100) / 100
    };
}

module.exports = {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSuppliersStats,
    getPaymentTerms
};