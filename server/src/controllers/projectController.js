import Project, { ICONS } from '../models/Project.js';
import Task from '../models/Task.js';
import Workspace from '../models/Workspace.js';
import { HttpError, asyncHandler } from '../utils/error.js';

export const createProject = asyncHandler(async (req, res) => {
  const { name, description, color, icon } = req.body || {};
  if (!name?.trim()) throw new HttpError(422, 'Project name is required');
  if (icon && !ICONS.includes(icon)) throw new HttpError(422, `icon must be one of: ${ICONS.join(', ')}`);

  const project = await Project.create({
    workspaceId: req.workspace._id,
    name: name.trim(),
    description: description?.trim() || '',
    color,
    icon,
    members: [],
    createdBy: req.user._id,
  });

  res.status(201).json({ project });
});

export const listProjects = asyncHandler(async (req, res) => {
  const includeArchived = req.query.archived === 'true';
  const filter = { workspaceId: req.workspace._id };
  if (!includeArchived) filter.archived = false;

  const projects = await Project.find(filter).sort({ createdAt: 1 }).lean();

  // Task counts per project for the sidebar/workspace home.
  const counts = await Task.aggregate([
    { $match: { workspaceId: req.workspace._id } },
    { $group: { _id: '$projectId', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c]));

  res.json({
    projects: projects.map((p) => ({
      ...p,
      taskCount: countMap.get(String(p._id))?.total || 0,
      doneCount: countMap.get(String(p._id))?.done || 0,
    })),
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.project._id)
    .populate('members.userId', 'name email avatar')
    .lean();
  res.json({ project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const { name, description, color, icon, archived } = req.body || {};
  if (name !== undefined) {
    if (!name?.trim()) throw new HttpError(422, 'Project name cannot be empty');
    req.project.name = name.trim();
  }
  if (description !== undefined) req.project.description = String(description).slice(0, 2000);
  if (color !== undefined) req.project.color = color;
  if (icon !== undefined) {
    if (!ICONS.includes(icon)) throw new HttpError(422, `icon must be one of: ${ICONS.join(', ')}`);
    req.project.icon = icon;
  }
  if (archived !== undefined) req.project.archived = Boolean(archived);
  await req.project.save();
  res.json({ project: req.project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  await Task.deleteMany({ projectId: req.project._id });
  await req.project.deleteOne();
  res.json({ ok: true });
});

export const addProjectMember = asyncHandler(async (req, res) => {
  const { role = 'Member' } = req.body || {};
  const { userId } = req.params;
  if (!['Admin', 'Member', 'Viewer'].includes(role)) {
    throw new HttpError(422, 'role must be Admin, Member or Viewer');
  }

  const workspace = await Workspace.findById(req.project.workspaceId).select('members');
  const wsMember = workspace.members.find((m) => String(m.userId) === userId);
  if (!wsMember) throw new HttpError(404, 'User must first be a member of the workspace');
  if (req.project.members.some((m) => m.userId.equals(userId))) {
    throw new HttpError(409, 'User is already a member of this project');
  }

  req.project.members.push({ userId, role });
  await req.project.save();
  res.status(201).json({ member: { userId, role, workspaceRole: wsMember.role } });
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  const before = req.project.members.length;
  req.project.members = req.project.members.filter((m) => !m.userId.equals(req.params.userId));
  if (req.project.members.length === before) throw new HttpError(404, 'Member not found on project');
  await req.project.save();
  res.json({ ok: true });
});
