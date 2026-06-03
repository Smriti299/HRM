import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { successResponse } from '../utils/apiResponse.js';
import { formatDateTime, getCompanyName, streamExcel, streamPdf, fitWorksheetColumns } from '../utils/exportHelpers.js';

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

    const employee = await Employee.findOne({ _id: employeeId, ...req.companyFilter });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check if payroll already exists
    const existing = await Payroll.findOne({ employee: employeeId, month, year, ...req.companyFilter });
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
      ...req.companyFilter,
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

    const payroll = await Payroll.findOne({ employee: targetId, month, year, ...req.companyFilter })
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

    const scopedQuery = { ...query, ...req.companyFilter };
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

export const exportPayrollExcel = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const query = { ...req.companyFilter, month, year };
    const payrolls = await Payroll.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ year: -1, month: -1 });

    const filename = `payroll-${year}-${month}.xlsx`
    return streamExcel(res, filename, async (workbook) => {
      const sheet = workbook.addWorksheet(`Payroll ${month}-${year}`)
      sheet.addRow(['Company', await getCompanyName(req.user.companyId)])
      sheet.addRow(['Generated', formatDateTime()])
      sheet.addRow([])
      sheet.addRow(['Employee ID', 'Employee Name', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Payroll Month'])

      payrolls.forEach((pay) => {
        if (!pay.employee) return
        const allowances = (pay.earnings?.hra || 0) + (pay.earnings?.da || 0) + (pay.earnings?.ta || 0) + (pay.earnings?.bonus || 0)
        const deductions = (pay.deductions?.pf || 0) + (pay.deductions?.tax || 0) + (pay.deductions?.lop || 0) + (pay.deductions?.other || 0)
        sheet.addRow([
          pay.employee.employeeId || '',
          `${pay.employee.firstName} ${pay.employee.lastName}`,
          pay.earnings?.basic || 0,
          allowances,
          deductions,
          pay.netSalary || 0,
          `${pay.month}/${pay.year}`,
        ])
      })

      fitWorksheetColumns(sheet)
      sheet.getRow(4).font = { bold: true }
    })
  } catch (err) {
    next(err);
  }
};

export const downloadPayslipPdf = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, ...req.companyFilter })
      .populate('employee', 'firstName lastName employeeId email designation department joiningDate')

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payslip not found' })
    }

    if (req.user.role === 'Employee' && payroll.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const companyName = await getCompanyName(req.user.companyId)
    const fileName = `payslip-${payroll.employee.employeeId}-${payroll.month}-${payroll.year}.pdf`
    return streamPdf(res, fileName, (doc) => {
      doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' })
      doc.moveDown(0.25)
      doc.fontSize(11).font('Helvetica').text('Employee Payslip', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(9).fillColor('gray').text(`Generated: ${formatDateTime()}`, { align: 'center' })
      doc.moveDown(1)

      doc.fontSize(10).font('Helvetica-Bold').text('Employee Details')
      doc.fontSize(9).font('Helvetica').text(`Name: ${payroll.employee.firstName} ${payroll.employee.lastName}`)
      doc.text(`Employee ID: ${payroll.employee.employeeId}`)
      doc.text(`Designation: ${payroll.employee.designation || '—'}`)
      doc.text(`Email: ${payroll.employee.email || '—'}`)
      doc.text(`Payroll Month: ${payroll.month}/${payroll.year}`)
      doc.moveDown(0.7)

      doc.fontSize(10).font('Helvetica-Bold').text('Earnings')
      const earnings = [
        ['Basic Salary', payroll.earnings?.basic || 0],
        ['HRA', payroll.earnings?.hra || 0],
        ['DA', payroll.earnings?.da || 0],
        ['Travel Allowance', payroll.earnings?.ta || 0],
        ['Bonus', payroll.earnings?.bonus || 0],
      ]
      earnings.forEach(([label, value]) => {
        doc.font('Helvetica').text(`${label}: ₹${value.toFixed(2)}`)
      })
      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').text(`Gross Salary: ₹${(payroll.grossSalary || 0).toFixed(2)}`)
      doc.moveDown(0.8)

      doc.fontSize(10).font('Helvetica-Bold').text('Deductions')
      const deductions = [
        ['Provident Fund', payroll.deductions?.pf || 0],
        ['Tax', payroll.deductions?.tax || 0],
        ['Loss of Pay', payroll.deductions?.lop || 0],
        ['Other Deductions', payroll.deductions?.other || 0],
      ]
      deductions.forEach(([label, value]) => {
        doc.font('Helvetica').text(`${label}: ₹${value.toFixed(2)}`)
      })
      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').text(`Total Deductions: ₹${(payroll.totalDeductions || 0).toFixed(2)}`)
      doc.moveDown(1)

      doc.fontSize(11).font('Helvetica-Bold').text('Net Salary', { continued: true })
      doc.font('Helvetica').text(`: ₹${(payroll.netSalary || 0).toFixed(2)}`)
      doc.moveDown(1)
      doc.fontSize(8).fillColor('gray').text('Generated by HRMS', { align: 'left' })
      doc.text(`Generation Date: ${formatDateTime()}`, { align: 'left' })
    })
  } catch (err) {
    next(err);
  }
};

// @desc    Mark payroll as paid
// @route   PUT /api/payroll/:id/mark-paid
// @access  Admin
export const markAsPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, ...req.companyFilter });

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

    const payrolls = await Payroll.find({ month, year, ...req.companyFilter });

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
