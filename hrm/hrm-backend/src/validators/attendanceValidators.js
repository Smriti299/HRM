const { body } = require('express-validator');

exports.markAttendanceValidator = [
  body('employee').isMongoId().withMessage('Valid employee ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('status')
    .isIn(['Present', 'Absent', 'Half-Day', 'Late', 'On-Leave'])
    .withMessage('Invalid attendance status'),
  body('checkIn').optional().isISO8601().withMessage('Invalid checkIn time'),
  body('checkOut').optional().isISO8601().withMessage('Invalid checkOut time'),
];
