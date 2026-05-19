import express from 'express';
const router = express.Router();
import { getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment, } from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import scopeToTenant from '../middleware/scopeToTenant.js';
import { createDepartmentValidator,
  updateDepartmentValidator, } from '../validators/departmentValidators.js';

router.use(protect);
router.use(scopeToTenant); 
router.get('/', getAllDepartments);
router.get('/:id', getDepartment);
router.post('/', authorize('Admin'), createDepartmentValidator, validate, createDepartment);
router.put('/:id', authorize('Admin'), updateDepartmentValidator, validate, updateDepartment);
router.delete('/:id', authorize('Admin'), deleteDepartment);

export default router;
