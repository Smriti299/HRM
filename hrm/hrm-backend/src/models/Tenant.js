const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
  },
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  domain:      { type: String, default: null },   // custom domain e.g. hr.company.com
  adminEmail:  { type: String, required: true },
  plan:        { type: String, enum: ['free','starter','pro','enterprise'], default: 'free' },
  isActive:    { type: Boolean, default: true },
  maxEmployees:{ type: Number, default: 10 },
  settings: {
    timezone:  { type: String, default: 'Asia/Kolkata' },
    currency:  { type: String, default: 'INR' },
    logo:      { type: String, default: null },
  },
}, { timestamps: true });

tenantSchema.index({ domain: 1 });
tenantSchema.index(
  { companyId: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true } } }
);

module.exports = mongoose.model('Tenant', tenantSchema);
