import { body } from 'express-validator';

export const applyLeaveValidator = [
  body('leaveType')
    .isIn(['Annual', 'Sick', 'Casual', 'Unpaid'])
    .withMessage('leaveType must be Annual, Sick, Casual, or Unpaid'),
  body('startDate').isISO8601().withMessage('Valid startDate is required'),
  body('endDate').isISO8601().withMessage('Valid endDate is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
];

export const reviewLeaveValidator = [
  body('status')
    .isIn(['Approved', 'Rejected'])
    .withMessage('Status must be Approved or Rejected'),
  body('reviewRemarks').optional().trim(),
];
