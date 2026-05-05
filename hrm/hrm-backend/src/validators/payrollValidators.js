const { body } = require('express-validator');

exports.generatePayrollValidator = [
  body('employeeId').isMongoId().withMessage('Valid employeeId is required'),
  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),
  body('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Invalid year'),
];
