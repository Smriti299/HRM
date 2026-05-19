import jwt from 'jsonwebtoken';

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const generateToken = (userOrId, legacyTenantId = null) => {
  const isUserObject = typeof userOrId === 'object' && userOrId !== null;
  const userId = isUserObject ? userOrId._id : userOrId;
  const tenantId = isUserObject ? userOrId.tenantId : legacyTenantId;
  const companyId = isUserObject ? userOrId.companyId : null;
  const role = isUserObject ? userOrId.role : undefined;

  return signToken({
    userId,
    role,
    companyId,
    tenantId,
    type: 'user',
    id: userId,
  });
};

const generateCompanyToken = (company) => {
  return signToken({
    userId: company._id,
    role: 'Company',
    companyId: company._id,
    type: 'company',
  });
};

export { generateToken, generateCompanyToken };
