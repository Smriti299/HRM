import express from 'express';
const router = express.Router();
import { generatePayroll,
  getPayslip,
  getAllPayrolls,
  markAsPaid,
  getPayrollSummary, } from '../controllers/payrollController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { generatePayrollValidator } from '../validators/payrollValidators.js';
import scopeToCompany from '../middleware/scopeToCompany.js';
router.use(protect);
router.use(scopeToCompany); 
// Admin/HR only
router.post('/generate', authorize('Admin', 'Manager', 'HR'), generatePayrollValidator, validate, generatePayroll);
router.get('/', authorize('Admin', 'Manager', 'HR'), getAllPayrolls);
router.get('/summary', authorize('Admin', 'Manager', 'HR'), getPayrollSummary);
router.put('/:id/mark-paid', authorize('Admin'), markAsPaid);

// Employee: /api/payroll/me  or  Admin/HR: /api/payroll/:employeeId
router.get('/:employeeId', getPayslip);

export default router;


