import express from 'express';
const router  = express.Router();
import { getMyNotifications,
  markOneRead,
  markAllRead,
  getUnreadCount,
  deleteOne, } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import scopeToCompany from '../middleware/scopeToCompany.js';

router.use(protect);
router.use(scopeToCompany); 
router.get('/',              getMyNotifications);
router.get('/unread-count',  getUnreadCount);
router.put('/read-all',      markAllRead);
router.put('/:id/read',      markOneRead);
router.delete('/:id',        deleteOne);

export default router;


