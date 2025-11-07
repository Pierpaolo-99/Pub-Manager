const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings_controller');

// Settings generali
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

// Profilo pub
router.get('/pub-profile', settingsController.getPubProfile);
router.put('/pub-profile', settingsController.updatePubProfile);

// Backup
router.get('/backup-logs', settingsController.getBackupLogs);
router.post('/backup/create', settingsController.createBackup);

// Notifiche
router.get('/notifications', settingsController.getNotificationSettings);

module.exports = router;