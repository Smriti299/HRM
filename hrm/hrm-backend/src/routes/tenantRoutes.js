import express from 'express';
const router  = express.Router();
import { registerTenant, getMyTenant, updateTenant } from '../controllers/tenantController.js';
import { protect, authorize } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';

// Public — company self-registration
router.post('/register', registerTenant);

// Protected — tenant management
router.get('/me',  protect, resolveTenant, getMyTenant);
router.put('/me',  protect, resolveTenant, authorize('Admin'), updateTenant);

export default router;
