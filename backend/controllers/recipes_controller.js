const connection = require('../database/db');

// GET tutte le ricette
function getAllRecipes(req, res) {
    const { search, difficulty, active, product_variant } = req.query;
    
    let sql = `
        SELECT 
            r.id, r.product_variant_id, r.name, r.description, r.portion_size,
            r.preparation_time, r.cooking_time, r.difficulty, r.instructions,
            r.chef_notes, r.total_cost, r.active, r.version, r.created_by,
            r.created_at, r.updated_at,
            pv.name as product_name,
            pv.price as product_price,
            COUNT(ri.id) as ingredient_count,
            u.username as created_by_name
        FROM recipes r
        LEFT JOIN product_variants pv ON r.product_variant_id = pv.id
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtri
    if (search) {
        sql += ` AND (r.name LIKE ? OR r.description LIKE ? OR pv.name LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (difficulty) {
        sql += ` AND r.difficulty = ?`;
        params.push(difficulty);
    }
    
    if (active === 'true') {
        sql += ` AND r.active = 1`;
    } else if (active === 'false') {
        sql += ` AND r.active = 0`;
    }
    
    if (product_variant) {
        sql += ` AND r.product_variant_id = ?`;
        params.push(product_variant);
    }
    
    sql += ` GROUP BY r.id ORDER BY r.active DESC, r.name ASC`;
    
    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching recipes:', err);
            return res.status(500).json({ error: 'Errore nel caricamento ricette' });
        }
        
        const recipes = results.map(recipe => ({
            ...recipe,
            active: Boolean(recipe.active),
            total_cost: parseFloat(recipe.total_cost) || 0,
            portion_size: parseFloat(recipe.portion_size) || 0,
            ingredient_count: parseInt(recipe.ingredient_count) || 0
        }));
        
        res.json({
            recipes,
            summary: calculateRecipesSummary(recipes)
        });
    });
}

// GET singola ricetta con ingredienti
function getRecipeById(req, res) {
    const { id } = req.params;
    
    // Query per ricetta base
    const recipeSql = `
        SELECT 
            r.*, 
            pv.name as product_name,
            pv.price as product_price,
            u.username as created_by_name
        FROM recipes r
        LEFT JOIN product_variants pv ON r.product_variant_id = pv.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
    `;
    
    // Query per ingredienti
    const ingredientsSql = `
        SELECT 
            ri.*,
            i.name as ingredient_name,
            i.unit as ingredient_default_unit,
            i.cost_per_unit as ingredient_cost
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
        ORDER BY ri.preparation_step ASC, ri.id ASC
    `;
    
    connection.query(recipeSql, [id], (err, recipeResults) => {
        if (err) {
            console.error('Error fetching recipe:', err);
            return res.status(500).json({ error: 'Errore nel caricamento ricetta' });
        }
        
        if (recipeResults.length === 0) {
            return res.status(404).json({ error: 'Ricetta non trovata' });
        }
        
        const recipe = {
            ...recipeResults[0],
            active: Boolean(recipeResults[0].active),
            total_cost: parseFloat(recipeResults[0].total_cost) || 0,
            portion_size: parseFloat(recipeResults[0].portion_size) || 0
        };
        
        connection.query(ingredientsSql, [id], (err, ingredientsResults) => {
            if (err) {
                console.error('Error fetching recipe ingredients:', err);
                return res.status(500).json({ error: 'Errore nel caricamento ingredienti' });
            }
            
            const ingredients = ingredientsResults.map(ingredient => ({
                ...ingredient,
                is_optional: Boolean(ingredient.is_optional),
                quantity: parseFloat(ingredient.quantity) || 0,
                cost_per_unit: parseFloat(ingredient.cost_per_unit) || 0,
                total_cost: parseFloat(ingredient.total_cost) || 0
            }));
            
            res.json({
                ...recipe,
                ingredients
            });
        });
    });
}

// POST nuova ricetta
function createRecipe(req, res) {
    const {
        product_variant_id, name, description, portion_size,
        preparation_time, cooking_time, difficulty, instructions,
        chef_notes, active, ingredients
    } = req.body;
    
    // Validazione
    if (!product_variant_id || !name) {
        return res.status(400).json({ 
            error: 'ID prodotto e nome ricetta sono obbligatori' 
        });
    }
    
    if (!ingredients || ingredients.length === 0) {
        return res.status(400).json({ 
            error: 'Almeno un ingrediente è richiesto' 
        });
    }
    
    const created_by = req.user?.id || 1; // Fallback per testing
    
    connection.beginTransaction((err) => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ error: 'Errore nel sistema' });
        }
        
        // Inserisci ricetta
        const recipeSql = `
            INSERT INTO recipes (
                product_variant_id, name, description, portion_size,
                preparation_time, cooking_time, difficulty, instructions,
                chef_notes, active, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const recipeParams = [
            product_variant_id,
            name.trim(),
            description?.trim() || null,
            parseFloat(portion_size) || 1.00,
            parseInt(preparation_time) || 0,
            parseInt(cooking_time) || 0,
            difficulty || 'medium',
            instructions?.trim() || null,
            chef_notes?.trim() || null,
            active !== undefined ? (active ? 1 : 0) : 1,
            created_by
        ];
        
        connection.query(recipeSql, recipeParams, (err, recipeResult) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error creating recipe:', err);
                    res.status(500).json({ error: 'Errore nella creazione ricetta' });
                });
            }
            
            const recipeId = recipeResult.insertId;
            
            // Inserisci ingredienti
            const ingredientPromises = ingredients.map((ingredient, index) => {
                return new Promise((resolve, reject) => {
                    const ingredientSql = `
                        INSERT INTO recipe_ingredients (
                            recipe_id, ingredient_id, quantity, unit, notes,
                            is_optional, preparation_step, cost_per_unit
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    const ingredientParams = [
                        recipeId,
                        ingredient.ingredient_id,
                        parseFloat(ingredient.quantity) || 0,
                        ingredient.unit?.trim() || 'g',
                        ingredient.notes?.trim() || null,
                        ingredient.is_optional ? 1 : 0,
                        ingredient.preparation_step || (index + 1),
                        parseFloat(ingredient.cost_per_unit) || 0
                    ];
                    
                    connection.query(ingredientSql, ingredientParams, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
            });
            
            Promise.all(ingredientPromises)
                .then(() => {
                    // Calcola costo totale
                    updateRecipeTotalCost(recipeId, () => {
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    res.status(500).json({ error: 'Errore nel commit' });
                                });
                            }
                            
                            res.status(201).json({
                                id: recipeId,
                                message: 'Ricetta creata con successo',
                                recipe: { id: recipeId, name }
                            });
                        });
                    });
                })
                .catch((err) => {
                    connection.rollback(() => {
                        console.error('Error creating recipe ingredients:', err);
                        res.status(500).json({ error: 'Errore nella creazione ingredienti' });
                    });
                });
        });
    });
}

// PUT aggiornamento ricetta
function updateRecipe(req, res) {
    const { id } = req.params;
    const {
        product_variant_id, name, description, portion_size,
        preparation_time, cooking_time, difficulty, instructions,
        chef_notes, active, ingredients
    } = req.body;
    
    connection.beginTransaction((err) => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ error: 'Errore nel sistema' });
        }
        
        // Aggiorna ricetta
        const recipeSql = `
            UPDATE recipes SET
                product_variant_id = ?, name = ?, description = ?, portion_size = ?,
                preparation_time = ?, cooking_time = ?, difficulty = ?,
                instructions = ?, chef_notes = ?, active = ?,
                version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const recipeParams = [
            product_variant_id,
            name?.trim(),
            description?.trim() || null,
            parseFloat(portion_size) || 1.00,
            parseInt(preparation_time) || 0,
            parseInt(cooking_time) || 0,
            difficulty || 'medium',
            instructions?.trim() || null,
            chef_notes?.trim() || null,
            active !== undefined ? (active ? 1 : 0) : 1,
            id
        ];
        
        connection.query(recipeSql, recipeParams, (err, recipeResult) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error updating recipe:', err);
                    res.status(500).json({ error: 'Errore nell\'aggiornamento ricetta' });
                });
            }
            
            if (recipeResult.affectedRows === 0) {
                return connection.rollback(() => {
                    res.status(404).json({ error: 'Ricetta non trovata' });
                });
            }
            
            // Se ci sono ingredienti, aggiornali
            if (ingredients) {
                // Elimina ingredienti esistenti
                const deleteIngredientsSql = 'DELETE FROM recipe_ingredients WHERE recipe_id = ?';
                
                connection.query(deleteIngredientsSql, [id], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error deleting old ingredients:', err);
                            res.status(500).json({ error: 'Errore nell\'aggiornamento ingredienti' });
                        });
                    }
                    
                    // Inserisci nuovi ingredienti
                    const ingredientPromises = ingredients.map((ingredient, index) => {
                        return new Promise((resolve, reject) => {
                            const ingredientSql = `
                                INSERT INTO recipe_ingredients (
                                    recipe_id, ingredient_id, quantity, unit, notes,
                                    is_optional, preparation_step, cost_per_unit
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            
                            const ingredientParams = [
                                id,
                                ingredient.ingredient_id,
                                parseFloat(ingredient.quantity) || 0,
                                ingredient.unit?.trim() || 'g',
                                ingredient.notes?.trim() || null,
                                ingredient.is_optional ? 1 : 0,
                                ingredient.preparation_step || (index + 1),
                                parseFloat(ingredient.cost_per_unit) || 0
                            ];
                            
                            connection.query(ingredientSql, ingredientParams, (err, result) => {
                                if (err) reject(err);
                                else resolve(result);
                            });
                        });
                    });
                    
                    Promise.all(ingredientPromises)
                        .then(() => {
                            // Calcola costo totale
                            updateRecipeTotalCost(id, () => {
                                connection.commit((err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            res.status(500).json({ error: 'Errore nel commit' });
                                        });
                                    }
                                    
                                    res.json({ message: 'Ricetta aggiornata con successo' });
                                });
                            });
                        })
                        .catch((err) => {
                            connection.rollback(() => {
                                console.error('Error updating recipe ingredients:', err);
                                res.status(500).json({ error: 'Errore nell\'aggiornamento ingredienti' });
                            });
                        });
                });
            } else {
                // Solo aggiornamento ricetta senza ingredienti
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            res.status(500).json({ error: 'Errore nel commit' });
                        });
                    }
                    
                    res.json({ message: 'Ricetta aggiornata con successo' });
                });
            }
        });
    });
}

// DELETE ricetta
function deleteRecipe(req, res) {
    const { id } = req.params;
    
    connection.beginTransaction((err) => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ error: 'Errore nel sistema' });
        }
        
        // Elimina prima gli ingredienti
        const deleteIngredientsSql = 'DELETE FROM recipe_ingredients WHERE recipe_id = ?';
        
        connection.query(deleteIngredientsSql, [id], (err) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error deleting recipe ingredients:', err);
                    res.status(500).json({ error: 'Errore nell\'eliminazione ingredienti' });
                });
            }
            
            // Poi elimina la ricetta
            const deleteRecipeSql = 'DELETE FROM recipes WHERE id = ?';
            
            connection.query(deleteRecipeSql, [id], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error('Error deleting recipe:', err);
                        res.status(500).json({ error: 'Errore nell\'eliminazione ricetta' });
                    });
                }
                
                if (result.affectedRows === 0) {
                    return connection.rollback(() => {
                        res.status(404).json({ error: 'Ricetta non trovata' });
                    });
                }
                
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            res.status(500).json({ error: 'Errore nel commit' });
                        });
                    }
                    
                    res.json({ message: 'Ricetta eliminata con successo' });
                });
            });
        });
    });
}

// GET prodotti disponibili per ricette
function getAvailableProducts(req, res) {
    const sql = `
        SELECT 
            pv.id, pv.name, pv.price,
            p.name as product_name,
            COUNT(r.id) as recipe_count
        FROM product_variants pv
        LEFT JOIN products p ON pv.product_id = p.id
        LEFT JOIN recipes r ON pv.id = r.product_variant_id AND r.active = 1
        WHERE pv.active = 1 AND p.active = 1
        GROUP BY pv.id
        ORDER BY p.name ASC, pv.name ASC
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ error: 'Errore nel caricamento prodotti' });
        }
        
        const products = results.map(product => ({
            ...product,
            price: parseFloat(product.price) || 0,
            recipe_count: parseInt(product.recipe_count) || 0
        }));
        
        res.json({ products });
    });
}

// GET statistiche ricette
function getRecipesStats(req, res) {
    const sql = `
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN active = 1 THEN 1 END) as active,
            COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy,
            COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium,
            COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard,
            AVG(total_cost) as avg_cost,
            AVG(preparation_time + cooking_time) as avg_time
        FROM recipes
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching recipes stats:', err);
            return res.status(500).json({ error: 'Errore nel caricamento statistiche' });
        }
        
        const stats = {
            ...results[0],
            avg_cost: parseFloat(results[0].avg_cost) || 0,
            avg_time: Math.round(parseFloat(results[0].avg_time) || 0)
        };
        
        res.json(stats);
    });
}

// Funzione helper per aggiornare il costo totale della ricetta
function updateRecipeTotalCost(recipeId, callback) {
    const sql = `
        UPDATE recipes 
        SET total_cost = (
            SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
            FROM recipe_ingredients ri
            WHERE ri.recipe_id = ?
        )
        WHERE id = ?
    `;
    
    connection.query(sql, [recipeId, recipeId], (err, result) => {
        if (err) {
            console.error('Error updating recipe total cost:', err);
        }
        if (callback) callback(err, result);
    });
}

// Funzione helper per calcolare summary
function calculateRecipesSummary(recipes) {
    const total = recipes.length;
    const active = recipes.filter(r => r.active).length;
    const inactive = total - active;
    
    const byDifficulty = recipes.reduce((acc, recipe) => {
        acc[recipe.difficulty] = (acc[recipe.difficulty] || 0) + 1;
        return acc;
    }, {});
    
    const avgCost = recipes.length > 0 
        ? recipes.reduce((sum, r) => sum + r.total_cost, 0) / recipes.length 
        : 0;
    
    return {
        total,
        active,
        inactive,
        easy: byDifficulty.easy || 0,
        medium: byDifficulty.medium || 0,
        hard: byDifficulty.hard || 0,
        avgCost: Math.round(avgCost * 100) / 100
    };
}

module.exports = {
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    getAvailableProducts,
    getRecipesStats
};