import jwt from 'jsonwebtoken';

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const generateToken = (userOrId) => {
  const isUserObject = typeof userOrId === 'object' && userOrId !== null;
  const userId = isUserObject ? userOrId._id : userOrId;
  const companyId = isUserObject ? userOrId.companyId : null;
  const role = isUserObject ? userOrId.role : undefined;

  return signToken({
    userId,
    role,
    companyId,
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
