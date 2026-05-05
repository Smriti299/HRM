require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');

const Employee = require('../src/models/Employee');
const Department = require('../src/models/Department');
const Attendance = require('../src/models/Attendance');
const Leave = require('../src/models/Leave');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  await Promise.all([
    Employee.deleteMany({}),
    Department.deleteMany({}),
    Attendance.deleteMany({}),
    Leave.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // ── Departments ──────────────────────────────────────────────────────────────
  const departments = await Department.insertMany([
    { name: 'Engineering', description: 'Software development and infrastructure' },
    { name: 'Human Resources', description: 'People operations and culture' },
    { name: 'Finance', description: 'Accounting, payroll, and financial planning' },
    { name: 'Marketing', description: 'Brand, growth, and communications' },
    { name: 'Operations', description: 'Business operations and logistics' },
  ]);
  console.log(`✅ Created ${departments.length} departments`);

  const [engDept, hrDept, finDept, mktDept, opsDept] = departments;

  // ── Employees ─────────────────────────────────────────────────────────────────
  const rawEmployees = [
    {
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'admin@hrm.com',
      password: 'Admin@123',
      phone: '+91-9000000001',
      department: hrDept._id,
      role: 'Admin',
      designation: 'System Administrator',
      joiningDate: new Date('2020-01-15'),
      salary: { basic: 80000, hra: 32000, da: 8000, ta: 5000, pf: 9600, tax: 5000 },
    },
    {
      firstName: 'Hari',
      lastName: 'HR',
      email: 'hr@hrm.com',
      password: 'Hr@12345',
      phone: '+91-9000000002',
      department: hrDept._id,
      role: 'HR',
      designation: 'HR Manager',
      joiningDate: new Date('2021-03-01'),
      salary: { basic: 60000, hra: 24000, da: 6000, ta: 4000, pf: 7200, tax: 3000 },
    },
    {
      firstName: 'Ravi',
      lastName: 'Kumar',
      email: 'ravi@hrm.com',
      password: 'Emp@12345',
      phone: '+91-9000000003',
      department: engDept._id,
      role: 'Employee',
      designation: 'Senior Software Engineer',
      joiningDate: new Date('2021-06-01'),
      salary: { basic: 70000, hra: 28000, da: 7000, ta: 4500, pf: 8400, tax: 4000 },
    },
    {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya@hrm.com',
      password: 'Emp@12345',
      phone: '+91-9000000004',
      department: mktDept._id,
      role: 'Employee',
      designation: 'Marketing Executive',
      joiningDate: new Date('2022-02-14'),
      salary: { basic: 45000, hra: 18000, da: 4500, ta: 3000, pf: 5400, tax: 2000 },
    },
    {
      firstName: 'Arjun',
      lastName: 'Patel',
      email: 'arjun@hrm.com',
      password: 'Emp@12345',
      phone: '+91-9000000005',
      department: finDept._id,
      role: 'Employee',
      designation: 'Financial Analyst',
      joiningDate: new Date('2022-07-20'),
      salary: { basic: 55000, hra: 22000, da: 5500, ta: 3500, pf: 6600, tax: 3000 },
    },
    {
      firstName: 'Neha',
      lastName: 'Singh',
      email: 'neha@hrm.com',
      password: 'Emp@12345',
      phone: '+91-9000000006',
      department: engDept._id,
      role: 'Employee',
      designation: 'Frontend Developer',
      joiningDate: new Date('2023-01-09'),
      salary: { basic: 50000, hra: 20000, da: 5000, ta: 3000, pf: 6000, tax: 2500 },
    },
    {
      firstName: 'Vikram',
      lastName: 'Reddy',
      email: 'vikram@hrm.com',
      password: 'Emp@12345',
      phone: '+91-9000000007',
      department: opsDept._id,
      role: 'Employee',
      designation: 'Operations Manager',
      joiningDate: new Date('2021-11-01'),
      salary: { basic: 65000, hra: 26000, da: 6500, ta: 4000, pf: 7800, tax: 3500 },
    },
  ];

  const createdEmployees = [];
  for (const emp of rawEmployees) {
    const e = await Employee.create(emp);
    createdEmployees.push(e);
  }
  console.log(`✅ Created ${createdEmployees.length} employees`);

  // Update department heads
  await Department.findByIdAndUpdate(hrDept._id, { head: createdEmployees[0]._id });
  await Department.findByIdAndUpdate(engDept._id, { head: createdEmployees[2]._id });
  await Department.findByIdAndUpdate(mktDept._id, { head: createdEmployees[3]._id });
  await Department.findByIdAndUpdate(finDept._id, { head: createdEmployees[4]._id });
  await Department.findByIdAndUpdate(opsDept._id, { head: createdEmployees[6]._id });
  console.log('✅ Updated department heads');

  // ── Attendance (last 5 days for all employees) ─────────────────────────────
  const attendanceRecords = [];
  const today = new Date();

  for (const emp of createdEmployees) {
    for (let d = 4; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      date.setHours(0, 0, 0, 0);

      const checkIn = new Date(date);
      checkIn.setHours(9, Math.floor(Math.random() * 30), 0);

      const checkOut = new Date(date);
      checkOut.setHours(18, Math.floor(Math.random() * 30), 0);

      attendanceRecords.push({
        employee: emp._id,
        date,
        checkIn,
        checkOut,
        status: 'Present',
        workingHours: parseFloat(((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2)),
        markedBy: createdEmployees[0]._id,
      });
    }
  }

  await Attendance.insertMany(attendanceRecords);
  console.log(`✅ Created ${attendanceRecords.length} attendance records`);

  // ── Sample leave requests ────────────────────────────────────────────────────
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  await Leave.create([
    {
      employee: createdEmployees[2]._id, // Ravi
      leaveType: 'Annual',
      startDate: tomorrow,
      endDate: dayAfter,
      reason: 'Family vacation',
      status: 'Pending',
    },
    {
      employee: createdEmployees[5]._id, // Neha
      leaveType: 'Sick',
      startDate: today,
      endDate: today,
      reason: 'Fever and cold',
      status: 'Approved',
      reviewedBy: createdEmployees[1]._id,
      reviewedAt: new Date(),
      reviewRemarks: 'Approved. Get well soon!',
    },
  ]);
  console.log('✅ Created sample leave requests');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed completed! Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin   → admin@hrm.com   / Admin@123');
  console.log('  HR      → hr@hrm.com      / Hr@12345');
  console.log('  Employee→ ravi@hrm.com    / Emp@12345');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
