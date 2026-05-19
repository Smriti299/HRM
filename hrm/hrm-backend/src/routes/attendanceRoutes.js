import express from 'express';
const router  = express.Router();
import { checkIn, checkOut, getAttendance, getAllAttendance,
  markAttendance, editAttendance, getTodaySummary, } from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { markAttendanceValidator } from '../validators/attendanceValidators.js';
import scopeToTenant from '../middleware/scopeToTenant.js';
router.use(protect);
router.use(scopeToTenant); 
// Employee self-service
router.post('/check-in',  checkIn);
router.post('/check-out', checkOut);

// ⚠️  Named routes MUST come before /:employeeId to avoid param conflict
router.get('/all',           authorize('Admin', 'Manager', 'HR'), getAllAttendance);
router.get('/today/summary', authorize('Admin', 'Manager', 'HR'), getTodaySummary);
router.post('/mark',         authorize('Admin', 'Manager', 'HR'), markAttendanceValidator, validate, markAttendance);
router.put('/:id',           authorize('Admin', 'Manager', 'HR'), editAttendance);

// Dynamic param — must be LAST
router.get('/:employeeId', getAttendance);

export default router;
