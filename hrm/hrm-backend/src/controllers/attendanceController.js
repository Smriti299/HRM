const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { successResponse } = require('../utils/apiResponse');
const { createNotification } = require('../utils/notify');

const getDateOnly = (d) => { const dt = new Date(d || Date.now()); dt.setHours(0,0,0,0); return dt; };

// POST /api/attendance/check-in
exports.checkIn = async (req, res, next) => {
  try {
    const today = getDateOnly();
    const existing = await Attendance.findOne({ employee: req.user._id, date: today, ...req.tenantFilter });
    if (existing && existing.checkIn)
      return res.status(400).json({ success: false, message: 'Already checked in today' });

    const record = existing
      ? await Attendance.findByIdAndUpdate(existing._id, { checkIn: new Date(), status: 'Present' }, { new: true })
      : await Attendance.create({ ...req.scopeFields, employee: req.user._id, date: today, checkIn: new Date(), status: 'Present' });

    return successResponse(res, 200, 'Checked in successfully', record);
  } catch (err) { next(err); }
};

// POST /api/attendance/check-out
exports.checkOut = async (req, res, next) => {
  try {
    const today  = getDateOnly();
    const record = await Attendance.findOne({ employee: req.user._id, date: today, ...req.tenantFilter });
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
exports.getAttendance = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId === 'me' ? req.user._id : req.params.employeeId;
    if (!['Admin', 'Manager', 'HR'].includes(req.user.role) && req.user._id.toString() !== employeeId.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({ employee: employeeId, date: { $gte: start, $lte: end }, ...req.tenantFilter })
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
exports.getAllAttendance = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const { employeeId, status, page = 1, limit = 20 } = req.query;

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    const query = { date: { $gte: start, $lte: end } };
    if (employeeId) query.employee = employeeId;
    if (status)     query.status   = status;

    const scopedQuery = { ...query, ...req.tenantFilter };
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

// POST /api/attendance/mark  — Admin: create or update any record
exports.markAttendance = async (req, res, next) => {
  try {
    const { employee, date, status, checkIn, checkOut, remarks } = req.body;
    const attendanceDate = getDateOnly(date);

    const targetEmployee = await Employee.findOne({ _id: employee, ...req.tenantFilter });
    if (!targetEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found in this company' });
    }

    const record = await Attendance.findOneAndUpdate(
      { employee, date: attendanceDate, ...req.tenantFilter },
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
exports.editAttendance = async (req, res, next) => {
  try {
    const { status, checkIn, checkOut, remarks } = req.body

    const existing = await Attendance.findOne({ _id: req.params.id, ...req.tenantFilter })
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
      { _id: req.params.id, ...req.tenantFilter },
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
exports.getTodaySummary = async (req, res, next) => {
  try {
    const today   = getDateOnly();
    const records = await Attendance.find({ date: today, ...req.tenantFilter })
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
