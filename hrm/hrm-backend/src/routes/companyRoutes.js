const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { registerCompany, loginCompany, getCurrentCompany } = require('../controllers/companyController');
const { protectCompany } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Company name is required'),
    body('email').isEmail().withMessage('Valid company email is required').normalizeEmail(),
    body('slug')
      .trim()
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage('Company portal URL can contain lowercase letters, numbers, and hyphens'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('admin.firstName').optional().trim().notEmpty().withMessage('Admin first name cannot be empty'),
    body('admin.lastName').optional().trim().notEmpty().withMessage('Admin last name cannot be empty'),
    body('admin.email').optional().isEmail().withMessage('Valid admin email is required').normalizeEmail(),
    body('admin.password').optional().isLength({ min: 6 }).withMessage('Admin password must be at least 6 characters'),
  ],
  validate,
  registerCompany
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid company email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  loginCompany
);

router.get('/me', protectCompany, getCurrentCompany);

module.exports = router;
