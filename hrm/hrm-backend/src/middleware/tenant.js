import Tenant from '../models/Tenant.js';

const resolveTenant = async (req, res, next) => {
  try {
    let slug = null;

    // 1. From request body or query string (login or API calls)
    if (!slug && req.body?.slug) {
      slug = req.body.slug.toLowerCase().trim();
    }
    if (!slug && req.query?.slug) {
      slug = req.query.slug.toLowerCase().trim();
    }

    // 2. From subdomain: company1.hrm.com → slug = company1
    const host = req.headers.host || '';
    const parts = host.split('.');
    if (!slug && parts.length >= 3) {
      slug = parts[0];
    }

    // 3. From custom domain header (set by your reverse proxy)
    if (!slug && req.headers['x-tenant-slug']) {
      slug = req.headers['x-tenant-slug'];
    }

    // 4. From JWT (fallback — attached after auth middleware runs)
    if (!slug && req.user?.tenantId) {
      const tenant = await Tenant.findById(req.user.tenantId);
      if (!tenant || !tenant.isActive) {
        return res.status(403).json({ success: false, message: 'Tenant not found or inactive' });
      }
      req.tenant = tenant;
      return next();
    }

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Tenant could not be resolved' });
    }

    const tenant = await Tenant.findOne({ slug, isActive: true });
    if (!tenant) {
      return res.status(404).json({ success: false, message: `Tenant "${slug}" not found` });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};

export { resolveTenant };