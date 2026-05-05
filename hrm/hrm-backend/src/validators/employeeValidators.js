const { body, query } = require('express-validator');

exports.updateEmployeeValidator = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-()]{7,15}$/)
    .withMessage('Invalid phone number'),
  body('role')
    .optional()
    .isIn(['Admin', 'Manager', 'Employee', 'HR'])
    .withMessage('Invalid role'),
  body('salary.basic').optional().isNumeric().withMessage('Basic salary must be a number'),
];

exports.paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
];
