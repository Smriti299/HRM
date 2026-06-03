import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import scopeToCompany from '../middleware/scopeToCompany.js';
import {
  getAttendanceAnalytics,
  getLeaveAnalytics,
  getDepartmentAnalytics,
} from '../controllers/analyticsController.js';

const router = express.Router();

router.use(protect);
router.use(scopeToCompany);

router.get('/attendance', authorize('Admin', 'Manager', 'HR'), getAttendanceAnalytics);
router.get('/leave', authorize('Admin', 'Manager', 'HR'), getLeaveAnalytics);
router.get('/departments', authorize('Admin', 'Manager', 'HR'), getDepartmentAnalytics);

export default router;
