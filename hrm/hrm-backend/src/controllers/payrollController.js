import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { successResponse } from '../utils/apiResponse.js';

// Helper: count working days in a month (Mon–Sat, excluding Sun)
const getWorkingDaysInMonth = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) workingDays++; // exclude Sunday
  }
  return workingDays;
};

// @desc    Generate payroll for an employee for a given month
// @route   POST /api/payroll/generate
// @access  Admin, HR
export const generatePayroll = async (req, res, next) => {
  try {
    const { employeeId, month, year } = req.body;

    const employee = await Employee.findOne({ _id: employeeId, ...req.tenantFilter });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check if payroll already exists
    const existing = await Payroll.findOne({ employee: employeeId, month, year, ...req.tenantFilter });
    if (existing && existing.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: `Payroll for ${month}/${year} already ${existing.status}`,
      });
    }

    // Fetch attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
      ...req.tenantFilter,
    });

    const workingDaysInMonth = getWorkingDaysInMonth(year, month);

    const presentDays = attendanceRecords.filter((r) =>
      ['Present', 'Late'].includes(r.status)
    ).length;
    const halfDays = attendanceRecords.filter((r) => r.status === 'Half-Day').length;
    const leaveDays = attendanceRecords.filter((r) => r.status === 'On-Leave').length;
    const absentDays = workingDaysInMonth - presentDays - halfDays - leaveDays;

    // Effective days worked (half-days count as 0.5)
    const effectiveDays = presentDays + halfDays * 0.5 + leaveDays;
    const lopDays = Math.max(0, workingDaysInMonth - effectiveDays);

    const { basic, hra, da, ta, pf, tax } = employee.salary;

    // Per-day salary for LOP calculation
    const perDaySalary = basic / workingDaysInMonth;
    const lopDeduction = parseFloat((perDaySalary * lopDays).toFixed(2));

    const earnings = {
      basic,
      hra,
      da,
      ta,
      bonus: 0,
    };

    const grossSalary = basic + hra + da + ta;

    const deductions = {
      pf,
      tax,
      lop: lopDeduction,
      other: 0,
    };

    const totalDeductions = pf + tax + lopDeduction;
    const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));

    const payrollData = {
      ...req.scopeFields,
      employee: employeeId,
      month,
      year,
      workingDaysInMonth,
      presentDays,
      absentDays: Math.max(0, absentDays),
      leaveDays,
      halfDays,
      earnings,
      deductions,
      grossSalary,
      totalDeductions,
      netSalary,
      status: 'Generated',
      generatedBy: req.user._id,
    };

    let payroll;
    if (existing) {
      payroll = await Payroll.findByIdAndUpdate(existing._id, payrollData, { new: true });
    } else {
      payroll = await Payroll.create(payrollData);
    }

    const populated = await payroll.populate('employee', 'firstName lastName employeeId department');

    return successResponse(res, 201, 'Payroll generated successfully', populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Get payslip for an employee
// @route   GET /api/payroll/:employeeId?month=&year=
// @access  Admin, HR, or self
export const getPayslip = async (req, res, next) => {
  try {
    const targetId = req.params.employeeId === 'me' ? req.user._id : req.params.employeeId;

    if (req.user.role === 'Employee' && req.user._id.toString() !== targetId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const payroll = await Payroll.findOne({ employee: targetId, month, year, ...req.tenantFilter })
      .populate('employee', 'firstName lastName employeeId email designation department joiningDate')
      .populate('generatedBy', 'firstName lastName');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: `Payslip not found for ${month}/${year}`,
      });
    }

    return successResponse(res, 200, 'Payslip fetched', payroll);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all payrolls (with filters)
// @route   GET /api/payroll
// @access  Admin, HR
export const getAllPayrolls = async (req, res, next) => {
  try {
    const { month, year, status, employeeId, page = 1, limit = 10 } = req.query;
    const query = {};

    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status) query.status = status;
    if (employeeId) query.employee = employeeId;

    const scopedQuery = { ...query, ...req.tenantFilter };
    const total = await Payroll.countDocuments(scopedQuery);
    const payrolls = await Payroll.find(scopedQuery)
  .populate('employee', 'firstName lastName employeeId department')
  .sort({ year: -1, month: -1 })
  .skip((page - 1) * limit)
  .limit(Number(limit));

// Filter out payrolls where employee no longer exists
const filteredPayrolls = payrolls.filter((p) => p.employee !== null);

    return successResponse(res, 200, 'Payrolls fetched', filteredPayrolls, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark payroll as paid
// @route   PUT /api/payroll/:id/mark-paid
// @access  Admin
export const markAsPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    if (payroll.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'Payroll is already marked as paid' });
    }

    payroll.status = 'Paid';
    payroll.paidAt = new Date();
    await payroll.save();

    return successResponse(res, 200, 'Payroll marked as paid', payroll);
  } catch (err) {
    next(err);
  }
};

// @desc    Get payroll summary for a month (all employees)
// @route   GET /api/payroll/summary?month=&year=
// @access  Admin, HR
export const getPayrollSummary = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const payrolls = await Payroll.find({ month, year, ...req.tenantFilter });

    const summary = {
      month,
      year,
      totalEmployees: payrolls.length,
      totalGross: payrolls.reduce((s, p) => s + p.grossSalary, 0),
      totalDeductions: payrolls.reduce((s, p) => s + p.totalDeductions, 0),
      totalNet: payrolls.reduce((s, p) => s + p.netSalary, 0),
      paid: payrolls.filter((p) => p.status === 'Paid').length,
      pending: payrolls.filter((p) => p.status !== 'Paid').length,
    };

    return successResponse(res, 200, 'Payroll summary fetched', summary);
  } catch (err) {
    next(err);
  }
};
