const express = require('express');
const router = express.Router();
const tablesController = require('../controllers/tables_controller');

// Routes per tavoli

// Rotta principale: se include_status=true chiama getTablesWithStatus, altrimenti getAllTables
router.get('/', (req, res) => {
    if (req.query.include_status === 'true') {
        return tablesController.getTablesWithStatus(req, res);
    }
    return tablesController.getAllTables(req, res);
});

router.get('/stats', tablesController.getTablesStats);
router.get('/locations', tablesController.getLocations);
router.get('/:id', tablesController.getTableById);

router.post('/', tablesController.createTable);
router.put('/:id', tablesController.updateTable);
router.patch('/:id/status', tablesController.updateTableStatus);
router.delete('/:id', tablesController.deleteTable);

module.exports = router;