const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getLeaves,
  getLeave,
  reviewLeave,
  cancelLeave,
  getLeaveBalance,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const scopeToTenant = require('../middleware/scopeToTenant');
const {
  applyLeaveValidator,
  reviewLeaveValidator,
} = require('../validators/leaveValidators');

router.use(protect);
router.use(scopeToTenant); 
router.post('/', applyLeaveValidator, validate, applyLeave);
router.get('/', getLeaves);
router.get('/balance/:employeeId', getLeaveBalance);   // 'me' or a real ID
router.get('/:id', getLeave);
router.put('/:id/review', authorize('Admin', 'Manager', 'HR'), reviewLeaveValidator, validate, reviewLeave);
router.put('/:id/cancel', cancelLeave);

module.exports = router;
