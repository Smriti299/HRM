import { body } from 'express-validator';

export const createDepartmentValidator = [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('description').optional().trim(),
  body('head').optional().isMongoId().withMessage('Invalid department head ID'),
];

export const updateDepartmentValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim(),
  body('head').optional().isMongoId().withMessage('Invalid department head ID'),
];
