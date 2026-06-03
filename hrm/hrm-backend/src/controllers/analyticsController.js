import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import { successResponse } from '../utils/apiResponse.js';

const formatMonthLabel = (year, month) => {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
};

const getDateKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const buildLastNDays = (count, endDate = new Date()) => {
  const dates = [];
  const current = new Date(endDate);
  current.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(current);
    day.setDate(current.getDate() - i);
    dates.push(day.toISOString().split('T')[0]);
  }
  return dates;
};

const buildLast12Months = (endDate = new Date()) => {
  const labels = [];
  const current = new Date(endDate);
  current.setDate(1);
  current.setHours(0, 0, 0, 0);
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(current);
    d.setMonth(current.getMonth() - i);
    labels.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: formatMonthLabel(d.getFullYear(), d.getMonth() + 1),
    });
  }
  return labels;
};

const normalizeDepartmentKey = (id) => (id ? id.toString() : 'unassigned');

export const getAttendanceAnalytics = async (req, res, next) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start30 = new Date(end);
    start30.setDate(end.getDate() - 29);
    start30.setHours(0, 0, 0, 0);

    const trendRaw = await Attendance.aggregate([
      { $match: { ...req.companyFilter, date: { $gte: start30, $lte: end } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, status: '$status' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
        },
      },
      { $project: { _id: 0, date: '$_id', statuses: 1 } },
      { $sort: { date: 1 } },
    ]);

    const trendMap = Object.fromEntries(
      trendRaw.map((item) => [
        item.date,
        item.statuses.reduce((memo, statusItem) => {
          memo[statusItem.status] = statusItem.count;
          return memo;
        }, {}),
      ])
    );

    const attendanceTrend = buildLastNDays(30, end).map((date) => ({
      date,
      present: trendMap[date]?.Present || 0,
      absent: trendMap[date]?.Absent || 0,
      onLeave: trendMap[date]?.['On-Leave'] || 0,
    }));

    const distributionRaw = await Attendance.aggregate([
      {
        $match: {
          ...req.companyFilter,
          date: { $gte: start30, $lte: end },
          status: { $in: ['Present', 'Absent', 'Late', 'Half-Day'] },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusLabels = ['Present', 'Absent', 'Late', 'Half-Day'];
    const attendanceDistribution = statusLabels.map((status) => ({
      name: status,
      value: distributionRaw.find((item) => item._id === status)?.count || 0,
    }));

    const start12 = new Date(end);
    start12.setMonth(end.getMonth() - 11);
    start12.setDate(1);
    start12.setHours(0, 0, 0, 0);

    const monthlyRaw = await Attendance.aggregate([
      { $match: { ...req.companyFilter, date: { $gte: start12, $lte: end } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Present', 'Late', 'Half-Day']] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          total: 1,
          presentCount: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    const monthlyMap = Object.fromEntries(
      monthlyRaw.map((item) => [
        `${item.year}-${item.month}`,
        Math.round((item.presentCount / Math.max(item.total, 1)) * 100),
      ])
    );

    const monthlyAttendanceOverview = buildLast12Months(end).map(({ year, month, label }) => ({
      month: label,
      attendance: monthlyMap[`${year}-${month}`] ?? 0,
    }));

    return successResponse(res, 200, 'Attendance analytics fetched', {
      attendanceTrend,
      attendanceDistribution,
      monthlyAttendanceOverview,
    });
  } catch (err) {
    next(err);
  }
};

export const getLeaveAnalytics = async (req, res, next) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start12 = new Date(end);
    start12.setMonth(end.getMonth() - 11);
    start12.setDate(1);
    start12.setHours(0, 0, 0, 0);

    const leaveDistributionRaw = await Leave.aggregate([
      {
        $match: {
          ...req.companyFilter,
          startDate: { $gte: start12, $lte: end },
        },
      },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: '$totalDays' },
        },
      },
    ]);

    const leaveTypeMap = {
      Sick: 'Sick Leave',
      Casual: 'Casual Leave',
      Annual: 'Earned Leave',
      Unpaid: 'Unpaid Leave',
    };

    const leaveDistribution = Object.entries(leaveTypeMap).map(([key, label]) => ({
      name: label,
      value: leaveDistributionRaw.find((item) => item._id === key)?.totalDays || 0,
    }));

    const leaveTrendRaw = await Leave.aggregate([
      {
        $match: {
          ...req.companyFilter,
          createdAt: { $gte: start12, $lte: end },
          status: { $in: ['Approved', 'Rejected'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: { year: '$_id.year', month: '$_id.month' },
          statuses: { $push: { status: '$_id.status', count: '$count' } },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          statuses: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    const leaveTrendMap = Object.fromEntries(
      leaveTrendRaw.map((item) => [
        `${item.year}-${item.month}`,
        item.statuses.reduce(
          (memo, statusItem) => {
            memo[statusItem.status.toLowerCase()] = statusItem.count;
            return memo;
          },
          { approved: 0, rejected: 0 }
        ),
      ])
    );

    const leaveRequestsTrend = buildLast12Months(end).map(({ year, month, label }) => ({
      month: label,
      approved: leaveTrendMap[`${year}-${month}`]?.approved || 0,
      rejected: leaveTrendMap[`${year}-${month}`]?.rejected || 0,
    }));

    return successResponse(res, 200, 'Leave analytics fetched', {
      leaveDistribution,
      leaveRequestsTrend,
    });
  } catch (err) {
    next(err);
  }
};

export const getDepartmentAnalytics = async (req, res, next) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start30 = new Date(end);
    start30.setDate(end.getDate() - 29);
    start30.setHours(0, 0, 0, 0);

    const departments = await Department.find({ isActive: true, ...req.companyFilter }).select('name').lean();

    const employeeCounts = await Employee.aggregate([
      { $match: { ...req.companyFilter, isActive: true } },
      {
        $group: {
          _id: '$department',
          employeeCount: { $sum: 1 },
        },
      },
    ]);

    const attendanceCounts = await Attendance.aggregate([
      { $match: { ...req.companyFilter, date: { $gte: start30, $lte: end } } },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employee.department',
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Present'] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Late'] }, 1, 0],
            },
          },
          halfDay: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Half-Day'] }, 1, 0],
            },
          },
          onLeave: {
            $sum: {
              $cond: [{ $eq: ['$status', 'On-Leave'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const departmentNameById = new Map(departments.map((dept) => [dept._id.toString(), dept.name]));
    const employeeCountByDept = new Map(
      employeeCounts.map((item) => [normalizeDepartmentKey(item._id), item.employeeCount])
    );
    const attendanceByDept = new Map(
      attendanceCounts.map((item) => [normalizeDepartmentKey(item._id), item])
    );

    const departmentKeys = new Set([
      ...departmentNameById.keys(),
      ...employeeCountByDept.keys(),
      ...attendanceByDept.keys(),
    ]);

    const comparison = Array.from(departmentKeys).map((key) => {
      const attendance = attendanceByDept.get(key) || {};
      return {
        department: departmentNameById.get(key) || (key === 'unassigned' ? 'Unassigned' : 'Unknown'),
        employeeCount: employeeCountByDept.get(key) || 0,
        present: attendance.present || 0,
        absent: attendance.absent || 0,
        late: attendance.late || 0,
        halfDay: attendance.halfDay || 0,
        onLeave: attendance.onLeave || 0,
      };
    });

    const departmentComparison = comparison.sort((a, b) => b.employeeCount - a.employeeCount);

    return successResponse(res, 200, 'Department analytics fetched', {
      departmentComparison,
    });
  } catch (err) {
    next(err);
  }
};
