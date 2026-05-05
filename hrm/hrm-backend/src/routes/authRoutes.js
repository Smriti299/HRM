const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const scopeToTenant = require('../middleware/scopeToTenant');
const { resolveTenant } = require('../middleware/tenant');
const Company = require('../models/Company');
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} = require('../validators/authValidators');

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

module.exports = router;
