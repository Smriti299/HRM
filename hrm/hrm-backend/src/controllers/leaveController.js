const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { successResponse } = require('../utils/apiResponse');
const { createNotification } = require('../utils/notify');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Protected (Employee)
exports.applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason, isHalfDay } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
    }

    // Check for overlapping leave requests
    const overlap = await Leave.findOne({
      employee: req.user._id,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
      ...req.tenantFilter,
    });

    if (overlap) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave request overlapping these dates',
      });
    }

    // Calculate days
    const totalDays = isHalfDay
      ? 0.5
      : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    const employee = await Employee.findOne({ _id: req.user._id, ...req.tenantFilter });
    const balanceKey = leaveType.toLowerCase();

    if (leaveType !== 'Unpaid' && employee.leaveBalance[balanceKey] !== undefined) {
      if (employee.leaveBalance[balanceKey] < totalDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${leaveType} leave balance. Available: ${employee.leaveBalance[balanceKey]} days`,
        });
      }
    }

    const leave = await Leave.create({
      ...req.scopeFields,
      employee: req.user._id,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      isHalfDay: isHalfDay || false,
    });

    return successResponse(res, 201, 'Leave application submitted', leave);
  } catch (err) {
    next(err);
  }
};

// @desc    Get leaves (own for Employee, all for Admin/HR)
// @route   GET /api/leaves
// @access  Protected
exports.getLeaves = async (req, res, next) => {
  try {
    const { status, leaveType, employeeId, page = 1, limit = 10 } = req.query;

    const query = {};

    if (req.user.role === 'Employee') {
      query.employee = req.user._id;
    } else if (employeeId) {
      query.employee = employeeId;
    }

    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;

    const scopedQuery = { ...query, ...req.tenantFilter };
    const total = await Leave.countDocuments(scopedQuery);
    const leaves = await Leave.find(scopedQuery)
  .populate('employee', 'firstName lastName employeeId department')
  .populate('reviewedBy', 'firstName lastName')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(Number(limit));

// Filter out leaves where employee no longer exists
const filteredLeaves = leaves.filter((l) => l.employee !== null);

    return successResponse(res, 200, 'Leaves fetched', filteredLeaves, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single leave
// @route   GET /api/leaves/:id
// @access  Protected
exports.getLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, ...req.tenantFilter })
      .populate('employee', 'firstName lastName employeeId email department')
      .populate('reviewedBy', 'firstName lastName');

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (
      req.user.role === 'Employee' &&
      leave.employee._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return successResponse(res, 200, 'Leave fetched', leave);
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or reject leave
// @route   PUT /api/leaves/:id/review
// @access  Admin, HR
exports.reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewRemarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const leave = await Leave.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Leave is already ${leave.status}`,
      });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewRemarks = reviewRemarks || '';
    await leave.save();

    if (status === 'Approved') {
      // Deduct leave balance
      const employee = await Employee.findOne({ _id: leave.employee, ...req.tenantFilter });
      const balanceKey = leave.leaveType.toLowerCase();

      if (leave.leaveType !== 'Unpaid' && employee.leaveBalance[balanceKey] !== undefined) {
        employee.leaveBalance[balanceKey] = Math.max(
          0,
          employee.leaveBalance[balanceKey] - leave.totalDays
        );
        await employee.save();
      }

      // Mark attendance as On-Leave for each day
      const current = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      while (current <= end) {
        const dateOnly = new Date(current);
        dateOnly.setHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate(
          { employee: leave.employee, date: dateOnly, ...req.tenantFilter },
          { ...req.scopeFields, employee: leave.employee, date: dateOnly, status: 'On-Leave', markedBy: req.user._id },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        current.setDate(current.getDate() + 1);
      }
    }

    // Notify the employee about leave decision
    await createNotification({
      ...req.scopeFields,
      recipient:   leave.employee,
      type:        'LEAVE_REVIEWED',
      title:       `Leave ${status}`,
      message:     `Your ${leave.leaveType} leave request (${leave.totalDays} day(s)) has been ${status.toLowerCase()}${reviewRemarks ? ': ' + reviewRemarks : '.'}`,
      triggeredBy: req.user._id,
      meta:        { leaveType: leave.leaveType, status, totalDays: leave.totalDays },
    });

    return successResponse(res, 200, `Leave ${status.toLowerCase()} successfully`, leave);
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel leave (by employee, only if Pending)
// @route   PUT /api/leaves/:id/cancel
// @access  Protected (Employee)
exports.cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, employee: req.user._id, ...req.tenantFilter });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a leave that is already ${leave.status}`,
      });
    }

    leave.status = 'Cancelled';
    await leave.save();

    return successResponse(res, 200, 'Leave cancelled successfully', leave);
  } catch (err) {
    next(err);
  }
};

// @desc    Get leave balance for an employee
// @route   GET /api/leaves/balance/:employeeId
// @access  Protected
exports.getLeaveBalance = async (req, res, next) => {
  try {
    const targetId =
      req.params.employeeId === 'me' ? req.user._id : req.params.employeeId;

    if (req.user.role === 'Employee' && req.user._id.toString() !== targetId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const employee = await Employee.findOne({ _id: targetId, ...req.tenantFilter }).select('firstName lastName employeeId leaveBalance');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return successResponse(res, 200, 'Leave balance fetched', {
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
      },
      leaveBalance: employee.leaveBalance,
    });
  } catch (err) {
    next(err);
  }
};
