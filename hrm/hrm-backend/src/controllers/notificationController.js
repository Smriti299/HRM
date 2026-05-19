import Notification from '../models/Notification.js';
import { successResponse } from '../utils/apiResponse.js';

// GET /api/notifications  — own notifications (paginated)
export const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;

    const scopedQuery = { ...query, ...req.tenantFilter };
    const total = await Notification.countDocuments(scopedQuery);
    const notifications = await Notification.find(scopedQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('triggeredBy', 'firstName lastName role');

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false, ...req.tenantFilter });

    return successResponse(res, 200, 'Notifications fetched', notifications, {
      total, unreadCount, page: Number(page), totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
};

// PUT /api/notifications/:id/read
export const markOneRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id, ...req.tenantFilter },
      { isRead: true }
    );
    return successResponse(res, 200, 'Marked as read');
  } catch (err) { next(err); }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false, ...req.tenantFilter }, { isRead: true });
    return successResponse(res, 200, 'All notifications marked as read');
  } catch (err) { next(err); }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false, ...req.tenantFilter });
    return successResponse(res, 200, 'Unread count', { count });
  } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
export const deleteOne = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id, ...req.tenantFilter });
    return successResponse(res, 200, 'Notification deleted');
  } catch (err) { next(err); }
};
