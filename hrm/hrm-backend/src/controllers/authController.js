import Employee from '../models/Employee.js';
import Company from '../models/Company.js';
import { generateToken } from '../utils/generateToken.js';
import { successResponse } from '../utils/apiResponse.js';

// @desc    Register employee (Admin only in production; open for seeding)
// @route   POST /api/auth/register
// @access  Admin / HR
export const register = async (req, res, next) => {
  try {
    const tenantFilter = req.tenantFilter || {};
    const {
      firstName, lastName, email, password, phone,
      department, role, designation, joiningDate, salary,
    } = req.body;

    const existing = await Employee.findOne({ email, ...tenantFilter });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const employee = await Employee.create({
      ...req.scopeFields,
      firstName, lastName, email, password, phone,
      department, role, designation, joiningDate, salary,
    });

    const token = generateToken(employee);

    return successResponse(res, 201, 'Employee registered successfully', {
      token,
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password, companyId, companyEmail, slug } = req.body;

    let scopeFilter = null;
    let company = null;

    if (companyId) {
      company = await Company.findOne({ _id: companyId, isActive: true });
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found or inactive' });
      }
      scopeFilter = { companyId: company._id };
    } else if (companyEmail) {
      company = await Company.findOne({ email: companyEmail, isActive: true });
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found or inactive' });
      }
      scopeFilter = { companyId: company._id };
    } else if (slug) {
      company = await Company.findOne({ slug: slug.toLowerCase().trim(), isActive: true });
      if (!company) {
        return res.status(404).json({ success: false, message: `Company "${slug}" not found` });
      }
      scopeFilter = { companyId: company._id };
    } else if (req.tenant) {
      scopeFilter = { tenantId: req.tenant._id };
    } else {
      return res.status(400).json({ success: false, message: 'Company is required to sign in' });
    }

    const employee = await Employee.findOne({ email, isActive: true, ...scopeFilter }).select('+password');
    if (!employee) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(employee);

    return successResponse(res, 200, 'Login successful', {
      token,
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        companyId: employee.companyId,
        tenantId: employee.tenantId,
        department: employee.department,
      },
      company: company ? {
        id: company._id,
        name: company.name,
        email: company.email,
        slug: company.slug,
      } : undefined,
      tenant: req.tenant ? {
        id: req.tenant._id,
        name: req.tenant.name,
        slug: req.tenant.slug,
      } : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Protected
export const getMe = async (req, res, next) => {
  try {
    const tenantFilter = req.tenantFilter || {};
    const employee = await Employee.findOne({ _id: req.user._id, ...tenantFilter }).populate('department', 'name');
    return successResponse(res, 200, 'Current user fetched', employee);
  } catch (err) {
    next(err);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Protected
export const changePassword = async (req, res, next) => {
  try {
    const tenantFilter = req.tenantFilter || {};
    const { currentPassword, newPassword } = req.body;

    const employee = await Employee.findOne({ _id: req.user._id, ...tenantFilter }).select('+password');
    const isMatch = await employee.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    employee.password = newPassword;
    await employee.save();

    return successResponse(res, 200, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};
