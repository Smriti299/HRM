import express from 'express';
const router = express.Router();
import { register, login, getMe, changePassword } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import scopeToTenant from '../middleware/scopeToTenant.js';
import { resolveTenant } from '../middleware/tenant.js';
import Company from '../models/Company.js';
import { registerValidator,
  loginValidator,
  changePasswordValidator, } from '../validators/authValidators.js';

const optionalResolveTenant = async (req, res, next) => {
  const slug = req.body?.slug || req.query?.slug || req.headers['x-tenant-slug'];
  if (slug) {
    const company = await Company.findOne({ slug: slug.toLowerCase().trim(), isActive: true });
    if (company) return next();
    return resolveTenant(req, res, next);
  }
  return next();
};

// POST /api/auth/register  — Admin can create employees/managers
router.post(
  '/register',
  protect,
  scopeToTenant,
  authorize('Admin'),
  registerValidator,
  validate,
  register
);

// POST /api/auth/login
router.post('/login', optionalResolveTenant, loginValidator, validate, login);

// GET /api/auth/me
router.get('/me', protect, scopeToTenant, getMe);

// PUT /api/auth/change-password
router.put('/change-password', protect, scopeToTenant, changePasswordValidator, validate, changePassword);

export default router;
