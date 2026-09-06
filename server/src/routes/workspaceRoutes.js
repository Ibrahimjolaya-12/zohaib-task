import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceRole, ALL_ROLES } from '../middleware/rbac.js';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  updateMemberRole,
  removeMember,
} from '../controllers/workspaceController.js';
import { createProject, listProjects } from '../controllers/projectController.js';

const router = Router();

router.use(requireAuth);

// Workspace-level routes use requireWorkspaceRole; ownership rules live in the controllers.
router
  .route('/:workspaceId')
  .get(requireWorkspaceRole(ALL_ROLES), getWorkspace)
  .patch(requireWorkspaceRole(['Owner', 'Admin']), updateWorkspace)
  .delete(requireWorkspaceRole(['Owner']), deleteWorkspace);

router.get('/', getMyWorkspaces);
router.post('/', createWorkspace);

router.get('/:workspaceId/members', requireWorkspaceRole(ALL_ROLES), getWorkspace);
router.post('/:workspaceId/members', requireWorkspaceRole(['Owner', 'Admin']), addMember);
router.patch('/:workspaceId/members/:userId', requireWorkspaceRole(['Owner']), updateMemberRole);
router.delete('/:workspaceId/members/:userId', requireWorkspaceRole(['Owner', 'Admin']), removeMember);

// Projects are workspace-scoped (client calls /workspaces/:id/projects).
router.post('/:workspaceId/projects', requireWorkspaceRole(['Owner', 'Admin']), createProject);
router.get('/:workspaceId/projects', requireWorkspaceRole(ALL_ROLES), listProjects);

export default router;
