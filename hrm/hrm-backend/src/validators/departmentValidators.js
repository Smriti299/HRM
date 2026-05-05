const { body } = require('express-validator');

exports.createDepartmentValidator = [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('description').optional().trim(),
  body('head').optional().isMongoId().withMessage('Invalid department head ID'),
];

exports.updateDepartmentValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim(),
  body('head').optional().isMongoId().withMessage('Invalid department head ID'),
];
