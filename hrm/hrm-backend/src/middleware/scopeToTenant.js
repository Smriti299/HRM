/**
 * Injects companyId/tenantId into req.body and makes req.tenantFilter available
 * so controller queries automatically scope to the current company.
 *
 * Usage in routes:
 *   router.use(protect, scopeToTenant)
 *   // then in controller:
 *   const employees = await Employee.find({ ...req.tenantFilter })
 */
const scopeToTenant = (req, res, next) => {
  if (!req.user?.companyId && !req.user?.tenantId) {
    return res.status(403).json({ success: false, message: 'Company scope missing' });
  }

  req.companyFilter = req.user.companyId ? { companyId: req.user.companyId } : null;
  req.legacyTenantFilter = req.user.tenantId ? { tenantId: req.user.tenantId } : null;
  req.tenantFilter = req.companyFilter || req.legacyTenantFilter;
  req.scopeFields = req.tenantFilter;

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    delete req.body.companyId;
    delete req.body.tenantId;

    if (req.user.companyId) {
      req.body.companyId = req.user.companyId;
    } else {
      req.body.tenantId = req.user.tenantId;
    }
  }

  next();
};

module.exports = scopeToTenant;
