const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index(
  { companyId: 1, name: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true } } }
);
departmentSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true, partialFilterExpression: { tenantId: { $exists: true } } }
);

module.exports = mongoose.model('Department', departmentSchema);
