const express = require('express');
const router = express.Router();
const {
  getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const scopeToTenant = require('../middleware/scopeToTenant');
const {
  createDepartmentValidator,
  updateDepartmentValidator,
} = require('../validators/departmentValidators');

router.use(protect);
router.use(scopeToTenant); 
router.get('/', getAllDepartments);
router.get('/:id', getDepartment);
router.post('/', authorize('Admin'), createDepartmentValidator, validate, createDepartment);
router.put('/:id', authorize('Admin'), updateDepartmentValidator, validate, updateDepartment);
router.delete('/:id', authorize('Admin'), deleteDepartment);

module.exports = router;
