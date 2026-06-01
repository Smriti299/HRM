import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    leaveType: {
      type: String,
      enum: ['Annual', 'Sick', 'Casual', 'Unpaid'],
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalDays: {
      type: Number,
      min: [0.5, 'Leave must be at least half a day'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewRemarks: {
      type: String,
      trim: true,
      maxlength: [300, 'Review remarks cannot exceed 300 characters'],
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

leaveSchema.index({ companyId: 1, employee: 1 });

// Pre-save: auto-calculate totalDays
leaveSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    if (this.isHalfDay) {
      this.totalDays = 0.5;
    } else {
      const diffMs = this.endDate - this.startDate;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
      this.totalDays = diffDays;
    }
  }
  next();
});

export default mongoose.model('Leave', leaveSchema);
