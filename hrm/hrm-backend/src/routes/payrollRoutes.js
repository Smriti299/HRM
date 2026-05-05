const express = require('express');
const router = express.Router();
const {
  generatePayroll,
  getPayslip,
  getAllPayrolls,
  markAsPaid,
  getPayrollSummary,
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { generatePayrollValidator } = require('../validators/payrollValidators');
const scopeToTenant = require('../middleware/scopeToTenant');
router.use(protect);
router.use(scopeToTenant); 
// Admin/HR only
router.post('/generate', authorize('Admin', 'Manager', 'HR'), generatePayrollValidator, validate, generatePayroll);
router.get('/', authorize('Admin', 'Manager', 'HR'), getAllPayrolls);
router.get('/summary', authorize('Admin', 'Manager', 'HR'), getPayrollSummary);
router.put('/:id/mark-paid', authorize('Admin'), markAsPaid);

// Employee: /api/payroll/me  or  Admin/HR: /api/payroll/:employeeId
router.get('/:employeeId', getPayslip);

module.exports = router;
