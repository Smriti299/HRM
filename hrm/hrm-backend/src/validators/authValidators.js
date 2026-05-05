const { body } = require('express-validator');

exports.registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['Admin', 'Manager', 'Employee', 'HR'])
    .withMessage('Role must be Admin, Manager, or Employee'),
];

exports.loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('slug')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company portal slug cannot be empty'),
  body('companyId')
    .optional()
    .isMongoId()
    .withMessage('Company ID must be valid'),
  body('companyEmail')
    .optional()
    .isEmail()
    .withMessage('Company email must be valid')
    .normalizeEmail(),
];

exports.changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];
