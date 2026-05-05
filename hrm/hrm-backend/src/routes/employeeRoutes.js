const express = require('express');
const router  = express.Router();
const {
  getAllEmployees, getEmployee, createEmployee,
  updateEmployee, deleteEmployee, permanentDeleteEmployee,
  updateMyProfile, updateLeaveBalance,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateEmployeeValidator, paginationValidator } = require('../validators/employeeValidators');
const scopeToTenant = require('../middleware/scopeToTenant');
const { body } = require('express-validator');

router.use(protect);
router.use(scopeToTenant); 
// Self
router.put('/me/profile', updateMyProfile);

// Admin only — CRUD
router.get('/',    authorize('Admin', 'Manager', 'HR'), paginationValidator, validate, getAllEmployees);
router.post('/',   authorize('Admin'), createEmployee);
router.get('/:id', getEmployee);                                          // Admin or self (enforced in controller)
router.put('/:id', authorize('Admin'), updateEmployeeValidator, validate, updateEmployee);
router.delete('/:id',           authorize('Admin'), deleteEmployee);           // soft delete (deactivate)
router.delete('/:id/permanent', authorize('Admin'), permanentDeleteEmployee);  // hard delete (inactive only)

// Admin — manual leave balance update
router.put('/:id/leave-balance', authorize('Admin'),
  [
    body('annual').optional().isInt({ min: 0 }).withMessage('Annual must be >= 0'),
    body('sick').optional().isInt({ min: 0 }).withMessage('Sick must be >= 0'),
    body('casual').optional().isInt({ min: 0 }).withMessage('Casual must be >= 0'),
  ],
  validate,
  updateLeaveBalance
);

module.exports = router;
