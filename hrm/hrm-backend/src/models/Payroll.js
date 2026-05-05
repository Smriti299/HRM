const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: function () {
        return !this.companyId;
      },
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: function () {
        return !this.tenantId;
      },
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 2000,
    },
    workingDaysInMonth: {
      type: Number,
      required: true,
    },
    presentDays: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    halfDays: {
      type: Number,
      default: 0,
    },
    earnings: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      da: { type: Number, default: 0 },
      ta: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
    },
    deductions: {
      pf: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      lop: { type: Number, default: 0 },  // Loss of Pay (absent deduction)
      other: { type: Number, default: 0 },
    },
    grossSalary: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Generated', 'Paid'],
      default: 'Draft',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  { timestamps: true }
);

// One payslip per employee per month/year per company.
payrollSchema.index(
  { companyId: 1, employee: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true } } }
);

// Legacy tenant index retained until tenantId is fully migrated to companyId.
payrollSchema.index(
  { tenantId: 1, employee: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { tenantId: { $exists: true } } }
);

module.exports = mongoose.model('Payroll', payrollSchema);
