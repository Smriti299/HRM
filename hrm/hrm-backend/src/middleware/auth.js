import jwt from 'jsonwebtoken';
import Employee from '../models/Employee.js';
import Company from '../models/Company.js';

const getTokenFromRequest = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

const buildAuthContext = (decoded) => ({
  userId: decoded.userId || decoded.id,
  role: decoded.role,
  companyId: decoded.companyId,
  tenantId: decoded.tenantId,
  type: decoded.type || 'user',
});

// Verify JWT token
export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const authContext = buildAuthContext(decoded);

    if (!authContext.userId) {
      return res.status(401).json({ success: false, message: 'Token is missing user id' });
    }

    const employee = await Employee.findById(authContext.userId).select('-password');

    if (!employee || !employee.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    if (
      authContext.companyId &&
      (!employee.companyId || employee.companyId.toString() !== authContext.companyId.toString())
    ) {
      return res.status(401).json({ success: false, message: 'Token company scope does not match user' });
    }

    if (
      !authContext.companyId &&
      authContext.tenantId &&
      (!employee.tenantId || employee.tenantId.toString() !== authContext.tenantId.toString())
    ) {
      return res.status(401).json({ success: false, message: 'Token tenant scope does not match user' });
    }

    req.user = employee;
    req.user.companyId = authContext.companyId || employee.companyId;
    req.user.tenantId = authContext.tenantId || employee.tenantId;
    req.user.role = authContext.role || employee.role;
    req.auth = {
      ...authContext,
      userId: employee._id,
      role: req.user.role,
      companyId: req.user.companyId,
      tenantId: req.user.tenantId,
      type: 'user',
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
};

// Verify JWT token for company account routes
export const protectCompany = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const authContext = buildAuthContext(decoded);

    if (authContext.type !== 'company' || !authContext.companyId) {
      return res.status(403).json({ success: false, message: 'Company token required' });
    }

    const company = await Company.findById(authContext.companyId).select('-password');
    if (!company || !company.isActive) {
      return res.status(401).json({ success: false, message: 'Company not found or deactivated' });
    }

    req.company = company;
    req.user = {
      _id: company._id,
      userId: company._id,
      role: 'Company',
      companyId: company._id,
      type: 'company',
    };
    req.auth = {
      userId: company._id,
      role: 'Company',
      companyId: company._id,
      type: 'company',
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
};

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.role || req.auth?.role;

    if (!roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${role}' is not authorized for this action`,
      });
    }
    next();
  };
};
