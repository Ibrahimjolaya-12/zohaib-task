import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTaskRole, ALL_ROLES } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';
import {
  getTask,
  updateTask,
  deleteTask,
  reorderTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addComment,
  updateComment,
  deleteComment,
} from '../controllers/taskController.js';
import { uploadAttachment, deleteAttachment } from '../controllers/attachmentController.js';

const router = Router();

const READ = ALL_ROLES; // Owner/Admin/Member/Viewer
const WRITE = ['Owner', 'Admin', 'Member']; // Viewer is read-only

router.use(requireAuth);

// Task collection endpoints (/projects/:id/tasks...) live in projectRoutes.
// This router handles individual tasks: /tasks/:id...

router.get('/:id', requireTaskRole(READ), getTask);
router.patch('/:id', requireTaskRole(WRITE), updateTask);
router.patch('/:id/reorder', requireTaskRole(WRITE), reorderTask);
router.delete('/:id', requireTaskRole(WRITE), deleteTask);

// --- Subtasks ---
router.post('/:id/subtasks', requireTaskRole(WRITE), addSubtask);
router.patch('/:id/subtasks/:subtaskId', requireTaskRole(WRITE), updateSubtask);
router.delete('/:id/subtasks/:subtaskId', requireTaskRole(WRITE), deleteSubtask);

// --- Comments ---
router.post('/:id/comments', requireTaskRole(WRITE), addComment);
router.patch('/:id/comments/:commentId', requireTaskRole(WRITE), updateComment);
router.delete('/:id/comments/:commentId', requireTaskRole(READ), deleteComment); // moderator check inside

// --- Attachments (Cloudinary) ---
router.post('/:id/attachments', requireTaskRole(WRITE), upload.single('file'), uploadAttachment);
router.delete('/:id/attachments/:attachmentId', requireTaskRole(READ), deleteAttachment); // uploader/mod check inside

export default router;
