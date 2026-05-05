const express = require('express');
const router  = express.Router();
const { registerTenant, getMyTenant, updateTenant } = require('../controllers/tenantController');
const { protect, authorize } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');

// Public — company self-registration
router.post('/register', registerTenant);

// Protected — tenant management
router.get('/me',  protect, resolveTenant, getMyTenant);
router.put('/me',  protect, resolveTenant, authorize('Admin'), updateTenant);

module.exports = router;
