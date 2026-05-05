const Employee = require('../models/Employee');
const Department = require('../models/Department');
const { successResponse } = require('../utils/apiResponse');

// GET /api/employees
exports.getAllEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', department, role, isActive } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { firstName:  { $regex: search, $options: 'i' } },
        { lastName:   { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) query.department = department;
    if (role)       query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const scopedQuery = { ...query, ...req.tenantFilter };
    const total     = await Employee.countDocuments(scopedQuery);
    const employees = await Employee.find(scopedQuery)
      .populate('department', 'name')
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return successResponse(res, 200, 'Employees fetched', employees, {
      total, page: Number(page), limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
};

// GET /api/employees/:id
exports.getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, ...req.tenantFilter })
      .populate('department', 'name description')
      .select('-password -__v');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (!['Admin', 'Manager', 'HR'].includes(req.user.role) && req.user._id.toString() !== req.params.id)
      return res.status(403).json({ success: false, message: 'Access denied' });
    return successResponse(res, 200, 'Employee fetched', employee);
  } catch (err) { next(err); }
};

// POST /api/employees
exports.createEmployee = async (req, res, next) => {
  try {
    const { employeeId, email } = req.body;
    if (await Employee.findOne({ email, ...req.tenantFilter }))
      return res.status(400).json({ success: false, message: 'Email already registered' });
    if (employeeId && await Employee.findOne({ employeeId, ...req.tenantFilter }))
      return res.status(400).json({ success: false, message: `Employee ID '${employeeId}' is already in use` });
    if (req.body.department) {
      const department = await Department.findOne({ _id: req.body.department, ...req.tenantFilter });
      if (!department) {
        return res.status(400).json({ success: false, message: 'Department does not belong to this company' });
      }
    }
    const employee = await Employee.create(req.body);
    const { password: _, ...safe } = employee.toObject();
    return successResponse(res, 201, 'Employee created', safe);
  } catch (err) { next(err); }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res, next) => {
  try {
    const { employeeId, email } = req.body;
    if (employeeId) {
      const clash = await Employee.findOne({ employeeId, _id: { $ne: req.params.id }, ...req.tenantFilter });
      if (clash) return res.status(400).json({ success: false, message: `Employee ID '${employeeId}' is already in use` });
    }
    if (email) {
      const clash = await Employee.findOne({ email, _id: { $ne: req.params.id }, ...req.tenantFilter });
      if (clash) return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    if (req.body.department) {
      const department = await Department.findOne({ _id: req.body.department, ...req.tenantFilter });
      if (!department) {
        return res.status(400).json({ success: false, message: 'Department does not belong to this company' });
      }
    }
    delete req.body.password;
    const employee = await Employee.findOneAndUpdate({ _id: req.params.id, ...req.tenantFilter }, req.body, {
      new: true, runValidators: true,
    }).populate('department', 'name').select('-password -__v');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    return successResponse(res, 200, 'Employee updated', employee);
  } catch (err) { next(err); }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOneAndUpdate({ _id: req.params.id, ...req.tenantFilter }, { isActive: false }, { new: true });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    return successResponse(res, 200, 'Employee deactivated');
  } catch (err) { next(err); }
};

// PUT /api/employees/me/profile
exports.updateMyProfile = async (req, res, next) => {
  try {
    const allowed = ['phone', 'address', 'profilePicture'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const employee = await Employee.findOneAndUpdate({ _id: req.user._id, ...req.tenantFilter }, updates, {
      new: true, runValidators: true,
    }).populate('department', 'name').select('-password');
    return successResponse(res, 200, 'Profile updated', employee);
  } catch (err) { next(err); }
};

// PUT /api/employees/:id/leave-balance  — Admin only
exports.updateLeaveBalance = async (req, res, next) => {
  try {
    const { createNotification } = require('../utils/notify');
    const { annual, sick, casual } = req.body;
    const employee = await Employee.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const changes = [];
    if (annual  !== undefined) { changes.push(`Annual: ${employee.leaveBalance.annual}→${annual}`);   employee.leaveBalance.annual  = annual;  }
    if (sick    !== undefined) { changes.push(`Sick: ${employee.leaveBalance.sick}→${sick}`);         employee.leaveBalance.sick    = sick;    }
    if (casual  !== undefined) { changes.push(`Casual: ${employee.leaveBalance.casual}→${casual}`);  employee.leaveBalance.casual  = casual;  }
    await employee.save();

    if (changes.length) {
      await createNotification({
        ...req.scopeFields,
        recipient:   employee._id,
        type:        'LEAVE_BALANCE_UPDATED',
        title:       'Leave Balance Updated by Admin',
        message:     `Your leave balance has been updated. ${changes.join(', ')}.`,
        triggeredBy: req.user._id,
        meta:        { annual, sick, casual },
      });
    }
    return successResponse(res, 200, 'Leave balance updated', { leaveBalance: employee.leaveBalance });
  } catch (err) { next(err); }
};
// DELETE /api/employees/:id/permanent  — Admin only: hard delete inactive employee
exports.permanentDeleteEmployee = async (req, res, next) => {
  try {
    const Attendance   = require('../models/Attendance')
    const Leave        = require('../models/Leave')
    const Payroll      = require('../models/Payroll')
    const Notification = require('../models/Notification')

    const employee = await Employee.findOne({ _id: req.params.id, ...req.tenantFilter })
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    if (employee.isActive) {
      return res.status(400).json({
        success: false,
        message: `Cannot permanently delete an active employee. Deactivate "${employee.firstName} ${employee.lastName}" first.`,
      })
    }

    // Delete all related records
    await Promise.all([
      Attendance.deleteMany({ employee: req.params.id, ...req.tenantFilter }),
      Leave.deleteMany({ employee: req.params.id, ...req.tenantFilter }),
      Payroll.deleteMany({ employee: req.params.id, ...req.tenantFilter }),
      Notification.deleteMany({ recipient: req.params.id, ...req.tenantFilter }),
    ])

    await Employee.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter })

    return successResponse(res, 200, 'Employee and all related data permanently deleted')
  } catch (err) { next(err) }
}
