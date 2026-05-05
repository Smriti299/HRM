const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { successResponse } = require('../utils/apiResponse');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Protected
exports.getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true, ...req.tenantFilter })
      .populate('head', 'firstName lastName email')
      .select('-__v')
      .sort({ name: 1 });

    return successResponse(res, 200, 'Departments fetched', departments);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Protected
exports.getDepartment = async (req, res, next) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, ...req.tenantFilter })
      .populate('head', 'firstName lastName email designation');

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Get employee count for this department
    const employeeCount = await Employee.countDocuments({
      department: req.params.id,
      isActive: true,
      ...req.tenantFilter,
    });

    return successResponse(res, 200, 'Department fetched', { ...department.toJSON(), employeeCount });
  } catch (err) {
    next(err);
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Admin
exports.createDepartment = async (req, res, next) => {
  try {
    if (req.body.head) {
      const head = await Employee.findOne({ _id: req.body.head, ...req.tenantFilter });
      if (!head) {
        return res.status(400).json({ success: false, message: 'Department head does not belong to this company' });
      }
    }

    const department = await Department.create(req.body);
    return successResponse(res, 201, 'Department created', department);
  } catch (err) {
    next(err);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Admin

exports.updateDepartment = async (req, res, next) => {
  try {
    const updateData = { ...req.body }

    // If head is empty string, explicitly set to null to clear it
    if (updateData.head === '' || updateData.head === undefined) {
      updateData.head = null
    }

    if (updateData.head) {
      const head = await Employee.findOne({ _id: updateData.head, ...req.tenantFilter })
      if (!head) {
        return res.status(400).json({ success: false, message: 'Department head does not belong to this company' })
      }
    }

    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      updateData,
      { new: true, runValidators: true }
    )

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' })
    }

    return successResponse(res, 200, 'Department updated', department)
  } catch (err) { next(err) }
}

// @desc    Delete department (soft delete)
// @route   DELETE /api/departments/:id
// @access  Admin
exports.deleteDepartment = async (req, res, next) => {
  try {
    const empCount = await Employee.countDocuments({ department: req.params.id, isActive: true, ...req.tenantFilter });
    if (empCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${empCount} active employee(s). Reassign them first.`,
      });
    }

    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      { isActive: false },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    return successResponse(res, 200, 'Department deleted successfully');
  } catch (err) {
    next(err);
  }
};
