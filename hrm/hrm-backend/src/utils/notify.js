import Notification from '../models/Notification.js';

/**
 * Create and persist a notification for one recipient.
 * @param {Object} opts
 * @param {string} opts.companyId   - Company._id
 * @param {string} opts.tenantId    - Legacy Tenant._id
 * @param {string} opts.recipient   - Employee._id
 * @param {string} opts.type        - ATTENDANCE_UPDATED | LEAVE_BALANCE_UPDATED | LEAVE_REVIEWED | GENERAL
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.triggeredBy] - Admin/HR Employee._id
 * @param {Object} [opts.meta]      - arbitrary extra data
 */
const createNotification = async ({ companyId, tenantId, recipient, type, title, message, triggeredBy = null, meta = {} }) => {
  try {
    if (!companyId && !tenantId) {
      throw new Error('Notification scope missing');
    }

    const scope = companyId ? { companyId } : { tenantId };
    await Notification.create({ ...scope, recipient, type, title, message, triggeredBy, meta });
  } catch (err) {
    // Non-fatal — log and continue
    console.error('⚠️  Notification creation failed:', err.message);
  }
};

export { createNotification };
