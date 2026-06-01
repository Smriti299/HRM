import express from 'express';
const router = express.Router();
import { register, login, getMe, changePassword } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import scopeToCompany from '../middleware/scopeToCompany.js';
import { registerValidator,
  loginValidator,
  changePasswordValidator, } from '../validators/authValidators.js';

// POST /api/auth/register  — Admin can create employees/managers
router.post(
  '/register',
  protect,
  scopeToCompany,
  authorize('Admin'),
  registerValidator,
  validate,
  register
);

// POST /api/auth/login
router.post('/login', loginValidator, validate, login);

// GET /api/auth/me
router.get('/me', protect, scopeToCompany, getMe);

// PUT /api/auth/change-password
router.put('/change-password', protect, scopeToCompany, changePasswordValidator, validate, changePassword);

export default router;


