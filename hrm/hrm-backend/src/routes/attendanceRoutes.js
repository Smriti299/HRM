const express = require('express');
const router  = express.Router();
const {
  checkIn, checkOut, getAttendance, getAllAttendance,
  markAttendance, editAttendance, getTodaySummary,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { markAttendanceValidator } = require('../validators/attendanceValidators');
const scopeToTenant = require('../middleware/scopeToTenant');
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

module.exports = router;
