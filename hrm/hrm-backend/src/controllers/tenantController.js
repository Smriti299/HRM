import Tenant from '../models/Tenant.js';
import Employee from '../models/Employee.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/generateToken.js';
import { successResponse } from '../utils/apiResponse.js';

// POST /api/tenants/register  — public: company signs up
export const registerTenant = async (req, res, next) => {
  try {
    const { companyName, slug, adminFirstName, adminLastName, adminEmail, password } = req.body;

    // Check slug is unique
    const existing = await Tenant.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: `"${slug}" is already taken. Choose another company URL.` });
    }

    // Create the tenant
    const tenant = await Tenant.create({
      name: companyName,
      slug,
      adminEmail,
    });

    // Create the first Admin employee for this tenant
    const admin = await Employee.create({
      tenantId:    tenant._id,
      firstName:   adminFirstName,
      lastName:    adminLastName,
      email:       adminEmail,
      password,
      role:        'Admin',
      designation: 'Administrator',
      employeeId:  'EMP0001',
    });

    const token = generateToken(admin);

    return successResponse(res, 201, 'Company registered successfully', {
      token,
      tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug },
      admin:  { id: admin._id, email: admin.email, role: admin.role },
    });
  } catch (err) { next(err); }
};

// GET /api/tenants/me  — get own tenant info (Admin)
export const getMyTenant = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'Tenant fetched', req.tenant);
  } catch (err) { next(err); }
};

// PUT /api/tenants/me  — update tenant settings (Admin)
export const updateTenant = async (req, res, next) => {
  try {
    const allowed = ['name', 'settings'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f]) updates[f] = req.body[f]; });

    const tenant = await Tenant.findByIdAndUpdate(req.tenant._id, updates, { new: true });
    return successResponse(res, 200, 'Tenant updated', tenant);
  } catch (err) { next(err); }
};
