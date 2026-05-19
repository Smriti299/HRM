import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Half-Day', 'Late', 'On-Leave'],
      default: 'Absent',
    },
    workingHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [200, 'Remarks cannot exceed 200 characters'],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes: one record per employee per day per company.
attendanceSchema.index(
  { companyId: 1, employee: 1, date: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true } } }
);

// Legacy tenant index retained until tenantId is fully migrated to companyId.
attendanceSchema.index(
  { tenantId: 1, employee: 1, date: 1 },
  { unique: true, partialFilterExpression: { tenantId: { $exists: true } } }
);

// Pre-save: calculate working hours only — do NOT override manually-set status
attendanceSchema.pre('save', function (next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut - this.checkIn
    this.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2))

    // Only auto-set status if it hasn't been manually assigned
    if (!this.isModified('status')) {
      if (this.workingHours >= 8)      this.status = 'Present'
      else if (this.workingHours >= 4) this.status = 'Half-Day'
      else                             this.status = 'Late'
    }
  }
  next()
});

export default mongoose.model('Attendance', attendanceSchema);
