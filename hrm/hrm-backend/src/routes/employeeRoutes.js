import express from 'express';
const router  = express.Router();
import { getAllEmployees, getEmployee, createEmployee,
  updateEmployee, deleteEmployee, permanentDeleteEmployee,
  updateMyProfile, updateLeaveBalance, } from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { updateEmployeeValidator, paginationValidator } from '../validators/employeeValidators.js';
import scopeToCompany from '../middleware/scopeToCompany.js';
import { body } from 'express-validator';

router.use(protect);
router.use(scopeToCompany); 
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

export default router;


