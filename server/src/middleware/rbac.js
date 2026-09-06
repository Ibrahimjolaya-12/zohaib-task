import Workspace from '../models/Workspace.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { HttpError, asyncHandler } from '../utils/error.js';

export const ALL_ROLES = ['Owner', 'Admin', 'Member', 'Viewer'];
const WRITE_ROLES = ['Owner', 'Admin', 'Member'];

/** Resolve a user's role within a workspace (null when not a member). */
export const getWorkspaceRole = async (workspaceId, userId) => {
  const ws = await Workspace.findById(workspaceId).select('members ownerId').lean();
  if (!ws) return null;
  const member = ws.members.find((m) => String(m.userId) === String(userId));
  return member?.role || null;
};

/** Guard for routes carrying :workspaceId. */
export const requireWorkspaceRole = (allowed) =>
  asyncHandler(async (req, _res, next) => {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) throw new HttpError(404, 'Workspace not found');

    const member = workspace.members.find((m) => m.userId.equals(req.user._id));
    if (!member) throw new HttpError(403, 'You are not a member of this workspace');
    if (!allowed.includes(member.role)) {
      throw new HttpError(403, `Requires role: ${allowed.join(' or ')}`);
    }

    req.workspace = workspace;
    req.membership = member;
    next();
  });

/**
 * Guard for routes carrying :projectId. Effective role = project-level role
 * if one exists, otherwise the inherited workspace role.
 */
export const requireProjectRole = (allowed) =>
  asyncHandler(async (req, _res, next) => {
    const project = await Project.findById(req.params.projectId);
    if (!project) throw new HttpError(404, 'Project not found');

    const wsRole = await getWorkspaceRole(project.workspaceId, req.user._id);
    if (!wsRole) throw new HttpError(403, 'You are not a member of this workspace');

    const pm = project.members.find((m) => m.userId.equals(req.user._id));
    const effectiveRole = pm ? (pm.role === 'Admin' && wsRole === 'Owner' ? 'Owner' : pm.role) : wsRole;
    if (!allowed.includes(effectiveRole)) {
      throw new HttpError(403, `Requires role: ${allowed.join(' or ')}`);
    }

    req.project = project;
    req.effectiveRole = effectiveRole;
    next();
  });

/** Guard for routes carrying :id (a task id). Loads task -> project -> role chain. */
export const requireTaskRole = (allowed) =>
  asyncHandler(async (req, _res, next) => {
    const task = await Task.findById(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found');

    const project = await Project.findById(task.projectId);
    if (!project) throw new HttpError(404, 'Project not found');

    const wsRole = await getWorkspaceRole(task.workspaceId, req.user._id);
    if (!wsRole) throw new HttpError(403, 'You are not a member of this workspace');

    const pm = project.members.find((m) => m.userId.equals(req.user._id));
    const effectiveRole = pm ? (pm.role === 'Admin' && wsRole === 'Owner' ? 'Owner' : pm.role) : wsRole;
    if (!allowed.includes(effectiveRole)) {
      throw new HttpError(403, `Requires role: ${allowed.join(' or ')}`);
    }

    req.task = task;
    req.project = project;
    req.effectiveRole = effectiveRole;
    next();
  });

export { WRITE_ROLES };
