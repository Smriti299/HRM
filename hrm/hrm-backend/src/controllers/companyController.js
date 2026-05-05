const Company = require('../models/Company');
const Employee = require('../models/Employee');
const { generateCompanyToken } = require('../utils/generateToken');
const { successResponse } = require('../utils/apiResponse');

exports.registerCompany = async (req, res, next) => {
  let company = null;

  try {
    const { name, email, password, slug, admin = {} } = req.body;

    const existingCompany = await Company.findOne({ email });
    if (existingCompany) {
      return res.status(400).json({ success: false, message: 'Company email already registered' });
    }

    const existingSlug = await Company.findOne({ slug });
    if (existingSlug) {
      return res.status(400).json({ success: false, message: 'Company portal URL already registered' });
    }

    const adminEmail = admin.email || email;
    company = await Company.create({ name, email, password, slug });

    const adminUser = await Employee.create({
      companyId: company._id,
      firstName: admin.firstName || 'Company',
      lastName: admin.lastName || 'Admin',
      email: adminEmail,
      password: admin.password || password,
      role: 'Admin',
      designation: 'Super User',
      employeeId: 'EMP0001',
    });

    const token = generateCompanyToken(company);

    return successResponse(res, 201, 'Company registered successfully', {
      token,
      company: {
        id: company._id,
        name: company.name,
        email: company.email,
        slug: company.slug,
      },
      admin: {
        id: adminUser._id,
        employeeId: adminUser.employeeId,
        fullName: adminUser.fullName,
        email: adminUser.email,
        role: adminUser.role,
        designation: adminUser.designation,
      },
    });
  } catch (err) {
    if (company?._id) {
      await Company.findByIdAndDelete(company._id);
      await Employee.deleteMany({ companyId: company._id });
    }
    next(err);
  }
};

exports.loginCompany = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const company = await Company.findOne({ email, isActive: true }).select('+password');
    if (!company) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await company.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateCompanyToken(company);

    return successResponse(res, 200, 'Company login successful', {
      token,
      company: {
        id: company._id,
        name: company.name,
        email: company.email,
        slug: company.slug,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getCurrentCompany = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'Current company fetched', {
      company: {
        id: req.company._id,
        name: req.company.name,
        email: req.company.email,
        slug: req.company.slug,
      },
      auth: {
        userId: req.auth.userId,
        role: req.auth.role,
        companyId: req.auth.companyId,
        type: req.auth.type,
      },
    });
  } catch (err) {
    next(err);
  }
};
