import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },
    employeeId: {
      type: String,
      
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{7,15}$/, 'Please enter a valid phone number'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'Employee', 'HR'],
      default: 'Employee',
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    salary: {
      basic: { type: Number, default: 0, min: 0 },
      hra: { type: Number, default: 0, min: 0 },        // House Rent Allowance
      da: { type: Number, default: 0, min: 0 },         // Dearness Allowance
      ta: { type: Number, default: 0, min: 0 },         // Travel Allowance
      pf: { type: Number, default: 0, min: 0 },         // Provident Fund deduction
      tax: { type: Number, default: 0, min: 0 },        // Tax deduction
    },
    leaveBalance: {
      annual: { type: Number, default: 18, min: 0 },
      sick: { type: Number, default: 12, min: 0 },
      casual: { type: Number, default: 6, min: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },
  },
  { timestamps: true }
);

// Auto-generate employeeId before saving
employeeSchema.pre('save', async function (next) {
  if (!this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments({ companyId: this.companyId });
    this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});
// Compare password method
employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.set('toJSON', { virtuals: true });
// Company-scoped indexes. Each company owns its own employee namespace.
employeeSchema.index(
  { companyId: 1, email: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true } } }
);
employeeSchema.index(
  { companyId: 1, employeeId: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true } } }
);

export default mongoose.model('Employee', employeeSchema);
