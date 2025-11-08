const connection = require('../database/db');

/////////////////////////
// PROMOZIONI CRUD CORRETTO
/////////////////////////

// GET tutte le promozioni
function getPromotions(req, res) {
    const { active_only, type, valid_now } = req.query;
    
    console.log('🎯 Getting promotions:', { active_only, type, valid_now });
    
    let sql = `
        SELECT 
            *,
            CASE 
                WHEN end_date < CURDATE() THEN 'expired'
                WHEN start_date > CURDATE() THEN 'scheduled'
                WHEN active = 1 THEN 'active'
                ELSE 'inactive'
            END as status,
            CASE 
                WHEN max_uses IS NOT NULL AND current_uses >= max_uses THEN 'max_reached'
                ELSE 'available'
            END as usage_status
        FROM promotions
        WHERE 1=1
    `;
    
    const params = [];
    
    if (active_only === 'true') {
        sql += ` AND active = 1`;
    }
    
    if (type) {
        sql += ` AND type = ?`;
        params.push(type);
    }
    
    if (valid_now === 'true') {
        sql += ` AND active = 1 
                 AND start_date <= CURDATE() 
                 AND end_date >= CURDATE()
                 AND (max_uses IS NULL OR current_uses < max_uses)`;
        
        // Controllo ore se specificati
        sql += ` AND (start_time IS NULL OR CURTIME() >= start_time)
                 AND (end_time IS NULL OR CURTIME() <= end_time)`;
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching promotions:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento promozioni',
                details: err.message 
            });
        }
        
        const promotions = results.map(promo => ({
            ...promo,
            value: parseFloat(promo.value) || 0,
            min_amount: parseFloat(promo.min_amount) || 0,
            max_discount: promo.max_discount ? parseFloat(promo.max_discount) : null,
            current_uses: parseInt(promo.current_uses) || 0,
            max_uses: promo.max_uses ? parseInt(promo.max_uses) : null,
            days_of_week: promo.days_of_week ? JSON.parse(promo.days_of_week) : null,
            active: Boolean(promo.active)
        }));
        
        console.log(`✅ Found ${promotions.length} promotions`);
        res.json({
            success: true,
            promotions: promotions
        });
    });
}

// GET promozione per ID
function getPromotionById(req, res) {
    const { id } = req.params;
    
    console.log('🔍 Getting promotion by ID:', id);
    
    const sql = `
        SELECT 
            *,
            CASE 
                WHEN end_date < CURDATE() THEN 'expired'
                WHEN start_date > CURDATE() THEN 'scheduled'
                WHEN active = 1 THEN 'active'
                ELSE 'inactive'
            END as status,
            CASE 
                WHEN max_uses IS NOT NULL AND current_uses >= max_uses THEN 'max_reached'
                ELSE 'available'
            END as usage_status
        FROM promotions 
        WHERE id = ?
    `;
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('❌ Error fetching promotion:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento promozione',
                details: err.message 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Promozione non trovata' 
            });
        }
        
        const promotion = {
            ...results[0],
            value: parseFloat(results[0].value) || 0,
            min_amount: parseFloat(results[0].min_amount) || 0,
            max_discount: results[0].max_discount ? parseFloat(results[0].max_discount) : null,
            current_uses: parseInt(results[0].current_uses) || 0,
            max_uses: results[0].max_uses ? parseInt(results[0].max_uses) : null,
            days_of_week: results[0].days_of_week ? JSON.parse(results[0].days_of_week) : null,
            active: Boolean(results[0].active)
        };
        
        console.log('✅ Promotion found');
        res.json({
            success: true,
            promotion: promotion
        });
    });
}

// POST nuova promozione
function createPromotion(req, res) {
    const {
        name,
        description,
        type,
        value,
        min_amount,
        max_discount,
        start_date,
        end_date,
        start_time,
        end_time,
        days_of_week,
        max_uses,
        active
    } = req.body;
    
    console.log('➕ Creating promotion:', { name, type, value });
    
    // Validazione campi obbligatori
    if (!name || !type || value === undefined) {
        return res.status(400).json({ 
            success: false,
            error: 'Nome, tipo e valore sono obbligatori' 
        });
    }
    
    // Validazione tipo promozione
    const validTypes = ['percentage', 'fixed_amount', 'buy_x_get_y'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            error: `Tipo promozione non valido. Validi: ${validTypes.join(', ')}`
        });
    }
    
    // Validazione valore
    if (type === 'percentage' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
        return res.status(400).json({
            success: false,
            error: 'Per promozioni percentage, il valore deve essere tra 0 e 100'
        });
    }
    
    if (type === 'fixed_amount' && parseFloat(value) <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Per promozioni fixed_amount, il valore deve essere maggiore di 0'
        });
    }
    
    // Validazione date
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({
            success: false,
            error: 'La data di inizio deve essere antecedente a quella di fine'
        });
    }
    
    const sql = `
        INSERT INTO promotions (
            name, description, type, value, min_amount, max_discount,
            start_date, end_date, start_time, end_time, days_of_week,
            max_uses, current_uses, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `;
    
    const params = [
        name,
        description || null,
        type,
        value,
        min_amount || 0,
        max_discount || null,
        start_date,
        end_date,
        start_time || null,
        end_time || null,
        days_of_week ? JSON.stringify(days_of_week) : null,
        max_uses || null,
        active !== undefined ? active : 1
    ];
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error creating promotion:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    error: 'Promozione con questo nome già esistente'
                });
            }
            return res.status(500).json({ 
                success: false,
                error: 'Errore nella creazione promozione',
                details: err.message 
            });
        }
        
        console.log('✅ Promotion created:', results.insertId);
        res.status(201).json({
            success: true,
            id: results.insertId,
            message: 'Promozione creata con successo'
        });
    });
}

// PUT aggiornamento promozione
function updatePromotion(req, res) {
    const { id } = req.params;
    const {
        name,
        description,
        type,
        value,
        min_amount,
        max_discount,
        start_date,
        end_date,
        start_time,
        end_time,
        days_of_week,
        max_uses,
        active
    } = req.body;
    
    console.log('📝 Updating promotion:', id);
    
    // Validazione tipo se fornito
    if (type) {
        const validTypes = ['percentage', 'fixed_amount', 'buy_x_get_y'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: `Tipo promozione non valido. Validi: ${validTypes.join(', ')}`
            });
        }
    }
    
    // Validazione valore se fornito
    if (value !== undefined && type) {
        if (type === 'percentage' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
            return res.status(400).json({
                success: false,
                error: 'Per promozioni percentage, il valore deve essere tra 0 e 100'
            });
        }
        
        if (type === 'fixed_amount' && parseFloat(value) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Per promozioni fixed_amount, il valore deve essere maggiore di 0'
            });
        }
    }
    
    const sql = `
        UPDATE promotions 
        SET name = ?, description = ?, type = ?, value = ?, min_amount = ?,
            max_discount = ?, start_date = ?, end_date = ?, start_time = ?,
            end_time = ?, days_of_week = ?, max_uses = ?, active = ?
        WHERE id = ?
    `;
    
    const params = [
        name,
        description,
        type,
        value,
        min_amount || 0,
        max_discount || null,
        start_date,
        end_date,
        start_time || null,
        end_time || null,
        days_of_week ? JSON.stringify(days_of_week) : null,
        max_uses || null,
        active !== undefined ? active : 1,
        id
    ];
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error updating promotion:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nell\'aggiornamento promozione',
                details: err.message 
            });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Promozione non trovata' 
            });
        }
        
        console.log('✅ Promotion updated');
        res.json({
            success: true,
            message: 'Promozione aggiornata con successo'
        });
    });
}

// DELETE promozione
function deletePromotion(req, res) {
    const { id } = req.params;
    
    console.log('🗑️ Deleting promotion:', id);
    
    // Controlla se la promozione è utilizzata in ordini
    const checkUsageQuery = 'SELECT COUNT(*) as usage_count FROM orders WHERE promotion_id = ?';
    
    connection.query(checkUsageQuery, [id], (err, results) => {
        if (err) {
            console.error('❌ Error checking promotion usage:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel controllo utilizzo promozione',
                details: err.message 
            });
        }
        
        const usageCount = results[0].usage_count;
        
        if (usageCount > 0) {
            return res.status(400).json({
                success: false,
                error: `Non è possibile eliminare la promozione. È utilizzata in ${usageCount} ordini.`,
                suggestion: 'Disattiva la promozione invece di eliminarla'
            });
        }
        
        // Elimina se non utilizzata
        const deleteQuery = 'DELETE FROM promotions WHERE id = ?';
        
        connection.query(deleteQuery, [id], (deleteErr, deleteResults) => {
            if (deleteErr) {
                console.error('❌ Error deleting promotion:', deleteErr);
                return res.status(500).json({ 
                    success: false,
                    error: 'Errore nell\'eliminazione promozione',
                    details: deleteErr.message 
                });
            }
            
            if (deleteResults.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Promozione non trovata' 
                });
            }
            
            console.log('✅ Promotion deleted');
            res.json({
                success: true,
                message: 'Promozione eliminata con successo'
            });
        });
    });
}

/////////////////////////
// UTILITIES PROMOZIONI
/////////////////////////

// GET ordini che hanno usato una promozione
function getPromotionUsage(req, res) {
    const { id } = req.params;
    const { limit = 20 } = req.query;
    
    console.log('📊 Getting promotion usage:', id);
    
    const sql = `
        SELECT 
            o.id,
            o.total,
            o.discount_amount,
            o.customer_name,
            o.created_at,
            t.number as table_number
        FROM orders o
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE o.promotion_id = ?
        ORDER BY o.created_at DESC
        LIMIT ?
    `;
    
    connection.query(sql, [id, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('❌ Error fetching promotion usage:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento utilizzi promozione',
                details: err.message 
            });
        }
        
        const usage = results.map(order => ({
            ...order,
            total: parseFloat(order.total) || 0,
            discount_amount: parseFloat(order.discount_amount) || 0
        }));
        
        console.log(`✅ Found ${usage.length} promotion usages`);
        res.json({
            success: true,
            usage: usage,
            summary: {
                total_uses: usage.length,
                total_discount_given: usage.reduce((sum, order) => sum + order.discount_amount, 0),
                total_revenue_affected: usage.reduce((sum, order) => sum + order.total, 0)
            }
        });
    });
}

// POST incrementa utilizzo promozione (chiamato dagli ordini)
function incrementPromotionUsage(req, res) {
    const { id } = req.params;
    
    console.log('📈 Incrementing promotion usage:', id);
    
    const sql = 'UPDATE promotions SET current_uses = current_uses + 1 WHERE id = ?';
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('❌ Error incrementing usage:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nell\'incremento utilizzi',
                details: err.message 
            });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Promozione non trovata' 
            });
        }
        
        console.log('✅ Promotion usage incremented');
        res.json({
            success: true,
            message: 'Utilizzi promozione incrementati'
        });
    });
}

// GET promozioni valide per un ordine
function getValidPromotions(req, res) {
    const { order_total, customer_type } = req.query;
    
    console.log('🎯 Getting valid promotions for order:', { order_total, customer_type });
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = domenica, 1 = lunedì, ecc.
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
    const orderTotal = parseFloat(order_total) || 0;
    
    let sql = `
        SELECT 
            *,
            CASE type
                WHEN 'percentage' THEN LEAST(value * ? / 100, COALESCE(max_discount, 999999))
                WHEN 'fixed_amount' THEN LEAST(value, ?)
                ELSE 0
            END as calculated_discount
        FROM promotions 
        WHERE active = 1
            AND start_date <= CURDATE()
            AND end_date >= CURDATE()
            AND (max_uses IS NULL OR current_uses < max_uses)
            AND (min_amount IS NULL OR min_amount <= ?)
            AND (start_time IS NULL OR ? >= start_time)
            AND (end_time IS NULL OR ? <= end_time)
    `;
    
    const params = [orderTotal, orderTotal, orderTotal, currentTime, currentTime];
    
    // Filtro per giorni della settimana se specificato
    sql += ` AND (days_of_week IS NULL OR JSON_CONTAINS(days_of_week, CAST(? AS JSON)))`;
    params.push(currentDay.toString());
    
    sql += ` ORDER BY calculated_discount DESC`;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching valid promotions:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Errore nel caricamento promozioni valide',
                details: err.message 
            });
        }
        
        const validPromotions = results.map(promo => ({
            ...promo,
            value: parseFloat(promo.value) || 0,
            calculated_discount: parseFloat(promo.calculated_discount) || 0,
            min_amount: parseFloat(promo.min_amount) || 0,
            max_discount: promo.max_discount ? parseFloat(promo.max_discount) : null,
            days_of_week: promo.days_of_week ? JSON.parse(promo.days_of_week) : null
        }));
        
        console.log(`✅ Found ${validPromotions.length} valid promotions`);
        res.json({
            success: true,
            promotions: validPromotions,
            order_total: orderTotal,
            best_discount: validPromotions.length > 0 ? validPromotions[0].calculated_discount : 0
        });
    });
}

module.exports = {
    getPromotions,
    getPromotionById,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getPromotionUsage,
    incrementPromotionUsage,
    getValidPromotions
};
