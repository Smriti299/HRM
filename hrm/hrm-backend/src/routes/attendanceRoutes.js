import express from 'express';
const router  = express.Router();
import { checkIn, checkOut, getAttendance, getAllAttendance,
  markAttendance, editAttendance, getTodaySummary,
  exportAttendancePdf, exportAttendanceExcel } from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { markAttendanceValidator } from '../validators/attendanceValidators.js';
import scopeToCompany from '../middleware/scopeToCompany.js';
router.use(protect);
router.use(scopeToCompany); 
// Employee self-service
router.post('/check-in',  checkIn);
router.post('/check-out', checkOut);

// Export endpoints
router.get('/export/pdf', authorize('Admin', 'Manager'), exportAttendancePdf);
router.get('/export/excel', authorize('Admin', 'Manager'), exportAttendanceExcel);

// ⚠️  Named routes MUST come before /:employeeId to avoid param conflict
router.get('/all',           authorize('Admin', 'Manager', 'HR'), getAllAttendance);
router.get('/today/summary', authorize('Admin', 'Manager', 'HR'), getTodaySummary);
router.post('/mark',         authorize('Admin', 'Manager', 'HR'), markAttendanceValidator, validate, markAttendance);
router.put('/:id',           authorize('Admin', 'Manager', 'HR'), editAttendance);

// Dynamic param — must be LAST
router.get('/:employeeId', getAttendance);

export default router;


