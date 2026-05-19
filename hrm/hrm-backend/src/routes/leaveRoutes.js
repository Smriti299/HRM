import express from 'express';
const router = express.Router();
import { applyLeave,
  getLeaves,
  getLeave,
  reviewLeave,
  cancelLeave,
  getLeaveBalance, } from '../controllers/leaveController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import scopeToTenant from '../middleware/scopeToTenant.js';
import { applyLeaveValidator,
  reviewLeaveValidator, } from '../validators/leaveValidators.js';

router.use(protect);
router.use(scopeToTenant); 
router.post('/', applyLeaveValidator, validate, applyLeave);
router.get('/', getLeaves);
router.get('/balance/:employeeId', getLeaveBalance);   // 'me' or a real ID
router.get('/:id', getLeave);
router.put('/:id/review', authorize('Admin', 'Manager', 'HR'), reviewLeaveValidator, validate, reviewLeave);
router.put('/:id/cancel', cancelLeave);

export default router;
