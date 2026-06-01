/**
 * Injects companyId into req.body and makes req.companyFilter available
 * so controller queries automatically scope to the current company.
 *
 * Usage in routes:
 *   router.use(protect, scopeToCompany)
 *   // then in controller:
 *   const employees = await Employee.find({ ...req.companyFilter })
 */
const scopeToCompany = (req, res, next) => {
  if (!req.user?.companyId) {
    return res.status(403).json({ success: false, message: 'Company scope missing' });
  }

  req.companyFilter = { companyId: req.user.companyId };
  req.scopeFields = req.companyFilter;

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    delete req.body.companyId;
    req.body.companyId = req.user.companyId;
  }

  next();
};

export default scopeToCompany;
