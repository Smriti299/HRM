const express = require('express');
const router  = express.Router();
const {
  getMyNotifications,
  markOneRead,
  markAllRead,
  getUnreadCount,
  deleteOne,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const scopeToTenant = require('../middleware/scopeToTenant');

router.use(protect);
router.use(scopeToTenant); 
router.get('/',              getMyNotifications);
router.get('/unread-count',  getUnreadCount);
router.put('/read-all',      markAllRead);
router.put('/:id/read',      markOneRead);
router.delete('/:id',        deleteOne);

module.exports = router;
