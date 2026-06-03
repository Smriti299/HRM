import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { successResponse } from '../utils/apiResponse.js';
import { createNotification } from '../utils/notify.js';
import { formatDateTime, getCompanyName, streamPdf, streamExcel, fitWorksheetColumns } from '../utils/exportHelpers.js';

const getDateOnly = (d) => { const dt = new Date(d || Date.now()); dt.setHours(0,0,0,0); return dt; };

const buildAttendanceQuery = (req) => {
  const { month, year, from, to } = req.query;
  if (from && to) {
    return {
      date: {
        $gte: new Date(from),
        $lte: new Date(`${to}T23:59:59`),
      },
    };
  }

  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year)  || new Date().getFullYear();
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 0, 23, 59, 59);
  return { date: { $gte: start, $lte: end } };
};

const buildAttendanceSummary = (records) => {
  const total = records.length;
  const present = records.filter((r) => r.status === 'Present').length;
  const absent = records.filter((r) => r.status === 'Absent').length;
  return {
    total,
    present,
    absent,
    late: records.filter((r) => r.status === 'Late').length,
    halfDay: records.filter((r) => r.status === 'Half-Day').length,
    onLeave: records.filter((r) => r.status === 'On-Leave').length,
    totalHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
    attendancePercentage: total ? Math.round((present / total) * 100) : 0,
  };
};

const buildAttendancePdf = (doc, records, summary, companyName) => {
  doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' })
  doc.moveDown(0.25)
  doc.fontSize(12).font('Helvetica').text('Attendance Report', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(9).fillColor('gray').text(`Generated: ${formatDateTime()}`, { align: 'center' })
  doc.moveDown(1)

  const summaryRows = [
    ['Total Present', summary.present],
    ['Total Absent', summary.absent],
    ['Attendance %', `${summary.attendancePercentage}%`],
    ['Total Hours', `${summary.totalHours.toFixed(2)}h`],
  ];

  summaryRows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('black').text(`${label}:`, { continued: true })
    doc.font('Helvetica').text(` ${value}`)
  })
  doc.moveDown(0.5)

  const columns = [80, 160, 85, 85, 75, 90]
  const headers = ['Emp ID', 'Employee Name', 'Date', 'Check In', 'Check Out', 'Status']
  let y = doc.y
  const margin = doc.page.margins.left

  headers.forEach((header, index) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('black').text(header, margin + columns.slice(0, index).reduce((a,b)=>a+b,0), y, {
      width: columns[index], align: 'left'
    })
  })
  y += 20
  doc.moveTo(margin, y - 6).lineTo(doc.page.width - margin, y - 6).stroke('#E2E8F0')

  records.forEach((rec) => {
    if (y > doc.page.height - doc.page.margins.bottom - 50) {
      doc.addPage()
      y = doc.y
    }
    const values = [
      rec.employee?.employeeId || '—',
      `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.trim(),
      rec.date ? new Date(rec.date).toLocaleDateString('en-IN') : '—',
      rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
      rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
      rec.status || '—',
    ]
    values.forEach((value, index) => {
      doc.font('Helvetica').fontSize(8).fillColor('black').text(value, margin + columns.slice(0, index).reduce((a,b)=>a+b,0), y, {
        width: columns[index], align: 'left'
      })
    })
    y += 20
  })
};

// POST /api/attendance/check-in
export const checkIn = async (req, res, next) => {
  try {
    const today = getDateOnly();
    const existing = await Attendance.findOne({ employee: req.user._id, date: today, ...req.companyFilter });
    if (existing && existing.checkIn)
      return res.status(400).json({ success: false, message: 'Already checked in today' });

    const record = existing
      ? await Attendance.findByIdAndUpdate(existing._id, { checkIn: new Date(), status: 'Present' }, { new: true })
      : await Attendance.create({ ...req.scopeFields, employee: req.user._id, date: today, checkIn: new Date(), status: 'Present' });

    return successResponse(res, 200, 'Checked in successfully', record);
  } catch (err) { next(err); }
};

// POST /api/attendance/check-out
export const checkOut = async (req, res, next) => {
  try {
    const today  = getDateOnly();
    const record = await Attendance.findOne({ employee: req.user._id, date: today, ...req.companyFilter });
    if (!record || !record.checkIn)
      return res.status(400).json({ success: false, message: 'No check-in found for today' });
    if (record.checkOut)
      return res.status(400).json({ success: false, message: 'Already checked out today' });

    record.checkOut = new Date();
    await record.save();
    return successResponse(res, 200, 'Checked out successfully', record);
  } catch (err) { next(err); }
};

// GET /api/attendance/:employeeId?month=&year=
export const getAttendance = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId === 'me' ? req.user._id : req.params.employeeId;
    if (!['Admin', 'Manager', 'HR'].includes(req.user.role) && req.user._id.toString() !== employeeId.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({ employee: employeeId, date: { $gte: start, $lte: end }, ...req.companyFilter })
      .populate('employee', 'firstName lastName employeeId')
      .sort({ date: 1 });

    const summary = {
      totalDays:  records.length,
      present:    records.filter((r) => r.status === 'Present').length,
      absent:     records.filter((r) => r.status === 'Absent').length,
      halfDay:    records.filter((r) => r.status === 'Half-Day').length,
      late:       records.filter((r) => r.status === 'Late').length,
      onLeave:    records.filter((r) => r.status === 'On-Leave').length,
      totalHours: records.reduce((s, r) => s + r.workingHours, 0).toFixed(2),
    };

    return successResponse(res, 200, 'Attendance fetched', { records, summary });
  } catch (err) { next(err); }
};

// GET /api/attendance/all?month=&year=  — Admin: all employees
export const getAllAttendance = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const { employeeId, status, page = 1, limit = 20 } = req.query;

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    const query = { date: { $gte: start, $lte: end } };
    if (employeeId) query.employee = employeeId;
    if (status)     query.status   = status;

    const scopedQuery = { ...query, ...req.companyFilter };
    const total   = await Attendance.countDocuments(scopedQuery);
    const records = await Attendance.find(scopedQuery)
  .populate('employee', 'firstName lastName employeeId department')
  .sort({ date: -1, createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(Number(limit));

// Filter out records where employee no longer exists
const filteredRecords = records.filter((r) => r.employee !== null);

    return successResponse(res, 200, 'All attendance fetched', filteredRecords, {
      total, page: Number(page), totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
};

export const exportAttendancePdf = async (req, res, next) => {
  try {
    const query = { ...req.companyFilter, ...buildAttendanceQuery(req) }
    const records = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .sort({ date: 1 })

    const summary = buildAttendanceSummary(records)
    const companyName = await getCompanyName(req.user.companyId)
    const fileName = `attendance-report-${new Date().toISOString().slice(0,10)}.pdf`
    return streamPdf(res, fileName, (doc) => buildAttendancePdf(doc, records, summary, companyName))
  } catch (err) { next(err); }
}

export const exportAttendanceExcel = async (req, res, next) => {
  try {
    const query = { ...req.companyFilter, ...buildAttendanceQuery(req) }
    const records = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .sort({ date: 1 })

    const summary = buildAttendanceSummary(records)
    const companyName = await getCompanyName(req.user.companyId)
    const fileName = `attendance-report-${new Date().toISOString().slice(0,10)}.xlsx`

    return streamExcel(res, fileName, async (workbook) => {
      const summarySheet = workbook.addWorksheet('Summary')
      summarySheet.addRow(['Company', companyName])
      summarySheet.addRow(['Generated', formatDateTime()])
      summarySheet.addRow([])
      summarySheet.addRow(['Metric', 'Value'])
      Object.entries({
        'Total Records': summary.total,
        'Present': summary.present,
        'Absent': summary.absent,
        'Late': summary.late,
        'Half Day': summary.halfDay,
        'On Leave': summary.onLeave,
        'Total Hours': `${summary.totalHours.toFixed(2)}h`,
        'Attendance %': `${summary.attendancePercentage}%`,
      }).forEach(([label, value]) => summarySheet.addRow([label, value]))
      fitWorksheetColumns(summarySheet)

      const dataSheet = workbook.addWorksheet('Attendance Data')
      dataSheet.addRow(['Employee ID', 'Employee Name', 'Date', 'Check In', 'Check Out', 'Working Hours', 'Status'])
      records.forEach((rec) => {
        dataSheet.addRow([
          rec.employee?.employeeId || '—',
          `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.trim(),
          rec.date ? new Date(rec.date).toLocaleDateString('en-IN') : '—',
          rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
          rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
          rec.workingHours || 0,
          rec.status || '—',
        ])
      })
      fitWorksheetColumns(dataSheet)
    })
  } catch (err) { next(err); }
}

// POST /api/attendance/mark  — Admin: create or update any record
export const markAttendance = async (req, res, next) => {
  try {
    const { employee, date, status, checkIn, checkOut, remarks } = req.body;
    const attendanceDate = getDateOnly(date);

    const targetEmployee = await Employee.findOne({ _id: employee, ...req.companyFilter });
    if (!targetEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found in this company' });
    }

    const record = await Attendance.findOneAndUpdate(
      { employee, date: attendanceDate, ...req.companyFilter },
      { ...req.scopeFields, employee, date: attendanceDate, status, checkIn, checkOut, remarks, markedBy: req.user._id },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // Notify the employee
    await createNotification({
      ...req.scopeFields,
      recipient:   employee,
      type:        'ATTENDANCE_UPDATED',
      title:       'Attendance Record Updated',
      message:     `Your attendance for ${attendanceDate.toDateString()} has been marked as "${status}" by Admin.`,
      triggeredBy: req.user._id,
      meta:        { date: attendanceDate, status },
    });

    return successResponse(res, 200, 'Attendance marked', record);
  } catch (err) { next(err); }
};

// PUT /api/attendance/:id  — Admin: edit existing record
export const editAttendance = async (req, res, next) => {
  try {
    const { status, checkIn, checkOut, remarks } = req.body

    const existing = await Attendance.findOne({ _id: req.params.id, ...req.companyFilter })
    if (!existing) return res.status(404).json({ success: false, message: 'Record not found' })

    const prevStatus = existing.status

    // Build update — calculate hours manually if both times provided
    const update = { markedBy: req.user._id }
    if (status  !== undefined && status !== '')  update.status   = status
    if (remarks !== undefined)                   update.remarks  = remarks
    if (checkIn  !== undefined) update.checkIn  = checkIn  ? new Date(checkIn)  : null
    if (checkOut !== undefined) update.checkOut = checkOut ? new Date(checkOut) : null

    // Recalculate hours if both times present
    const ci = update.checkIn  ?? existing.checkIn
    const co = update.checkOut ?? existing.checkOut
    if (ci && co) {
      update.workingHours = parseFloat(((new Date(co) - new Date(ci)) / (1000 * 60 * 60)).toFixed(2))
    }

    // Use findByIdAndUpdate to bypass pre-save hook (so status is never overridden)
    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, ...req.companyFilter },
      { $set: update },
      { new: true, runValidators: false }
    ).populate('employee', 'firstName lastName employeeId')

    await createNotification({
      ...req.scopeFields,
      recipient:   record.employee._id,
      type:        'ATTENDANCE_UPDATED',
      title:       'Attendance Updated by Admin',
      message:     `Your attendance for ${record.date.toDateString()} was updated from "${prevStatus}" to "${record.status}".`,
      triggeredBy: req.user._id,
      meta:        { date: record.date, oldStatus: prevStatus, newStatus: record.status },
    })

    return successResponse(res, 200, 'Attendance updated', record)
  } catch (err) { next(err) }
};

// GET /api/attendance/today/summary  — Admin
export const getTodaySummary = async (req, res, next) => {
  try {
    const today   = getDateOnly();
    const records = await Attendance.find({ date: today, ...req.companyFilter })
      .populate('employee', 'firstName lastName employeeId department');
    const summary = {
      date:        today,
      totalMarked: records.length,
      present:     records.filter((r) => r.status === 'Present').length,
      absent:      records.filter((r) => r.status === 'Absent').length,
      late:        records.filter((r) => r.status === 'Late').length,
      halfDay:     records.filter((r) => r.status === 'Half-Day').length,
      onLeave:     records.filter((r) => r.status === 'On-Leave').length,
    };
    return successResponse(res, 200, "Today's summary", { summary, records });
  } catch (err) { next(err); }
};
