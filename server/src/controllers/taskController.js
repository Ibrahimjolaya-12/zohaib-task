import Task, { STATUSES, PRIORITIES } from '../models/Task.js';
import { HttpError, asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';
import { getWorkspaceRole } from '../middleware/rbac.js';

const GAP = 1024; // base gap between column positions
const MIN_GAP = 1e-6; // renumber the column when gaps collapse below this

const validateAssignee = async (assigneeId, project) => {
  const role = await getWorkspaceRole(project.workspaceId, assigneeId);
  if (!role) throw new HttpError(422, 'Assignee must be a member of the workspace');
};

const nextOrder = async (projectId, status) => {
  const last = await Task.findOne({ projectId, status }).sort({ order: -1 }).select('order').lean();
  return last ? last.order + GAP : GAP;
};

/** GET /projects/:projectId/tasks — filters: status, assigneeId, q; sort: manual|dueDate|priority|createdAt */
export const listTasks = asyncHandler(async (req, res) => {
  const { status, assigneeId, q, sort } = req.query;
  const filter = { projectId: req.project._id };
  if (status && STATUSES.includes(status)) filter.status = status;
  if (assigneeId) filter.assigneeId = assigneeId === 'none' ? null : assigneeId;
  if (q) filter.$text = { $search: String(q).slice(0, 100) };

  const sortMap = {
    manual: { status: 1, order: 1 },
    dueDate: { dueDate: 1, createdAt: -1 },
    priority: { createdAt: -1 },
    createdAt: { createdAt: -1 },
  };
  let tasks = await Task.find(filter)
    .populate('assigneeId', 'name avatar')
    .populate('createdById', 'name avatar')
    .lean();

  if (sort === 'priority') {
    const rank = { High: 0, Medium: 1, Low: 2 };
    tasks.sort((a, b) => rank[a.priority] - rank[b.priority] || a.order - b.order);
  }

  res.json({ tasks });
});

/** POST /projects/:projectId/tasks */
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, dueDate, assigneeId, subtasks } = req.body || {};
  if (!title?.trim()) throw new HttpError(422, 'Task title is required');
  if (status && !STATUSES.includes(status)) throw new HttpError(422, `status must be one of: ${STATUSES.join(', ')}`);
  if (priority && !PRIORITIES.includes(priority)) throw new HttpError(422, `priority must be one of: ${PRIORITIES.join(', ')}`);
  if (assigneeId) await validateAssignee(assigneeId, req.project);

  const taskStatus = status || 'Todo';
  const task = await Task.create({
    projectId: req.project._id,
    workspaceId: req.project.workspaceId,
    title: title.trim(),
    description: description?.trim() || '',
    status: taskStatus,
    priority: priority || 'Medium',
    dueDate: dueDate || null,
    assigneeId: assigneeId || null,
    subtasks: Array.isArray(subtasks) ? subtasks.slice(0, 50).map((s) => ({ title: String(s.title || '').slice(0, 200), isCompleted: false })) : [],
    order: await nextOrder(req.project._id, taskStatus),
    createdById: req.user._id,
  });

  logActivity(task, req.user._id, 'created');
  await task.save();
  res.status(201).json({ task });
});

/** GET /tasks/:id */
export const getTask = asyncHandler(async (req, res) => {
  await req.task.populate([
    { path: 'assigneeId', select: 'name avatar' },
    { path: 'createdById', select: 'name avatar' },
    { path: 'comments.authorId', select: 'name avatar' },
    { path: 'activityLog.actorId', select: 'name avatar' },
    { path: 'attachments.uploadedBy', select: 'name avatar' },
  ]);
  res.json({ task: req.task });
});

/** PATCH /tasks/:id — whitelisted fields with automatic activity entries. */
export const updateTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, dueDate, assigneeId } = req.body || {};
  const task = req.task;
  const patches = [];

  if (title !== undefined && title.trim() !== task.title) {
    if (!title.trim()) throw new HttpError(422, 'Task title cannot be empty');
    patches.push(['renamed', { from: task.title, to: title.trim() }]);
    task.title = title.trim();
  }
  if (description !== undefined && description !== task.description) {
    patches.push(['description_updated']);
    task.description = String(description).slice(0, 10000);
  }
  if (status !== undefined && status !== task.status) {
    if (!STATUSES.includes(status)) throw new HttpError(422, `status must be one of: ${STATUSES.join(', ')}`);
    patches.push(['status_changed', { from: task.status, to: status }]);
    task.status = status;
  }
  if (priority !== undefined && priority !== task.priority) {
    if (!PRIORITIES.includes(priority)) throw new HttpError(422, `priority must be one of: ${PRIORITIES.join(', ')}`);
    patches.push(['priority_changed', { from: task.priority, to: priority }]);
    task.priority = priority;
  }
  if (dueDate !== undefined) {
    const next = dueDate ? new Date(dueDate) : null;
    if (next && Number.isNaN(next.getTime())) throw new HttpError(422, 'Invalid dueDate');
    if (String(next ?? '') !== String(task.dueDate ?? '')) {
      patches.push(['due_date_changed', { from: task.dueDate?.toISOString?.() || null, to: next?.toISOString?.() || null }]);
      task.dueDate = next;
    }
  }
  if (assigneeId !== undefined) {
    const nextId = assigneeId || null;
    const changed = String(nextId ?? '') !== String(task.assigneeId ?? '');
    if (changed) {
      if (nextId) await validateAssignee(nextId, req.project);
      patches.push(nextId ? ['assigned', { to: nextId }] : ['unassigned']);
      task.assigneeId = nextId;
    }
  }

  if (task.isModified()) {
    for (const [action, meta] of patches) logActivity(task, req.user._id, action, meta);
    await task.save();
  }

  await task.populate([{ path: 'assigneeId', select: 'name avatar' }, { path: 'activityLog.actorId', select: 'name avatar' }]);
  res.json({ task });
});

/** PATCH /tasks/:id/reorder — body: { status?, beforeTaskId?, afterTaskId? } (O(1) midpoint write). */
export const reorderTask = asyncHandler(async (req, res) => {
  const { status, beforeTaskId, afterTaskId } = req.body || {};
  const task = req.task;
  const targetStatus = status || task.status;
  if (!STATUSES.includes(targetStatus)) throw new HttpError(422, `status must be one of: ${STATUSES.join(', ')}`);

  const orderOf = async (id) => {
    if (!id) return null;
    const t = await Task.findOne({ _id: id, projectId: task.projectId }).select('order').lean();
    return t?.order ?? null;
  };

  let lo = await orderOf(beforeTaskId);
  let hi = await orderOf(afterTaskId);
  if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo];

  let newOrder;
  if (lo !== null && hi !== null) {
    if (hi - lo < MIN_GAP) await renumberColumn(task.projectId, targetStatus);
    newOrder = (lo + hi) / 2;
  } else if (lo !== null) {
    newOrder = lo + GAP;
  } else if (hi !== null) {
    newOrder = hi - GAP;
  } else {
    newOrder = await nextOrder(task.projectId, targetStatus);
  }

  const statusChanged = targetStatus !== task.status;
  task.order = newOrder;
  task.status = targetStatus;
  if (statusChanged) {
    logActivity(task, req.user._id, 'status_changed', { from: task.status, to: targetStatus });
  }
  await task.save();

  res.json({ task });
});

/** One-time O(n) renumber when fractional gaps get too small. */
const renumberColumn = async (projectId, status) => {
  const tasks = await Task.find({ projectId, status }).sort({ order: 1 }).select('_id');
  const bulk = tasks.map((t, i) => ({
    updateOne: { filter: { _id: t._id }, update: { $set: { order: (i + 1) * GAP } } },
  }));
  if (bulk.length) await Task.bulkWrite(bulk);
};

/**
 * PATCH /tasks/bulk — body: { updates: [{ _id, status?, order?, priority?, assigneeId?, dueDate? }] }
 * Capped at 50 operations, all within one accessible project. Uses a single bulkWrite.
 */
export const bulkUpdateTasks = asyncHandler(async (req, res) => {
  const { updates } = req.body || {};
  const projectId = req.params.projectId || req.query.projectId;
  if (!Array.isArray(updates) || updates.length === 0) throw new HttpError(422, 'updates array is required');
  if (updates.length > 50) throw new HttpError(422, 'Bulk updates are capped at 50 operations');

  const ids = updates.map((u) => u._id).filter(Boolean);
  if (ids.length !== updates.length) throw new HttpError(422, 'Every update needs an _id');

  const tasks = await Task.find({ _id: { $in: ids } }).select('_id projectId workspaceId');
  const projectIds = [...new Set(tasks.map((t) => String(t.projectId)))];
  if (projectIds.length !== 1 || projectIds[0] !== String(projectId)) {
    throw new HttpError(422, 'Bulk updates must target tasks within a single project');
  }

  // The route middleware has already resolved the effective role for this project.
  const operations = [];
  for (const upd of updates) {
    const $set = {};
    if (upd.status !== undefined) {
      if (!STATUSES.includes(upd.status)) throw new HttpError(422, `Invalid status: ${upd.status}`);
      $set.status = upd.status;
    }
    if (upd.order !== undefined) $set.order = Number(upd.order);
    if (upd.priority !== undefined) {
      if (!PRIORITIES.includes(upd.priority)) throw new HttpError(422, `Invalid priority: ${upd.priority}`);
      $set.priority = upd.priority;
    }
    if (upd.assigneeId !== undefined) $set.assigneeId = upd.assigneeId || null;
    if (upd.dueDate !== undefined) $set.dueDate = upd.dueDate ? new Date(upd.dueDate) : null;
    if (Object.keys($set).length) operations.push({ updateOne: { filter: { _id: upd._id }, update: { $set } } });
  }

  if (!operations.length) return res.json({ modifiedCount: 0 });
  const result = await Task.bulkWrite(operations);
  res.json({ modifiedCount: result.modifiedCount });
});

/** DELETE /tasks/:id */
export const deleteTask = asyncHandler(async (req, res) => {
  await req.task.deleteOne();
  res.json({ ok: true });
});

/** POST /tasks/:id/subtasks — body: { title } */
export const addSubtask = asyncHandler(async (req, res) => {
  const { title } = req.body || {};
  if (!title?.trim()) throw new HttpError(422, 'Subtask title is required');
  if (req.task.subtasks.length >= 50) throw new HttpError(422, 'Subtask limit reached (50)');

  req.task.subtasks.push({ title: title.trim() });
  logActivity(req.task, req.user._id, 'subtask_added', { to: title.trim() });
  await req.task.save();
  res.status(201).json({ task: req.task });
});

/** PATCH /tasks/:id/subtasks/:subtaskId — body: { title?, isCompleted? } */
export const updateSubtask = asyncHandler(async (req, res) => {
  const { title, isCompleted } = req.body || {};
  const sub = req.task.subtasks.id(req.params.subtaskId);
  if (!sub) throw new HttpError(404, 'Subtask not found');

  if (title !== undefined) {
    if (!title.trim()) throw new HttpError(422, 'Subtask title cannot be empty');
    sub.title = title.trim();
  }
  if (isCompleted !== undefined) {
    sub.isCompleted = Boolean(isCompleted);
    logActivity(req.task, req.user._id, 'subtask_toggled', { to: sub.title, completed: sub.isCompleted });
  }
  await req.task.save();
  res.json({ task: req.task });
});

/** DELETE /tasks/:id/subtasks/:subtaskId */
export const deleteSubtask = asyncHandler(async (req, res) => {
  const sub = req.task.subtasks.id(req.params.subtaskId);
  if (!sub) throw new HttpError(404, 'Subtask not found');

  req.task.subtasks.pull(sub);
  logActivity(req.task, req.user._id, 'subtask_removed', { from: sub.title });
  await req.task.save();
  res.json({ task: req.task });
});

/** POST /tasks/:id/comments — body: { body } */
export const addComment = asyncHandler(async (req, res) => {
  const { body } = req.body || {};
  if (!body?.trim()) throw new HttpError(422, 'Comment body is required');
  if (req.task.comments.length >= 500) throw new HttpError(422, 'Comment limit reached');

  req.task.comments.push({ authorId: req.user._id, body: body.trim() });
  logActivity(req.task, req.user._id, 'commented');
  await req.task.save();
  await req.task.populate({ path: 'comments.authorId', select: 'name avatar' });
  res.status(201).json({ task: req.task });
});

/** PATCH /tasks/:id/comments/:commentId — author only */
export const updateComment = asyncHandler(async (req, res) => {
  const comment = req.task.comments.id(req.params.commentId);
  if (!comment) throw new HttpError(404, 'Comment not found');
  if (!comment.authorId.equals(req.user._id)) throw new HttpError(403, 'Only the author can edit this comment');

  const { body } = req.body || {};
  if (!body?.trim()) throw new HttpError(422, 'Comment body is required');
  comment.body = body.trim();
  comment.edited = true;

  await req.task.save();
  await req.task.populate({ path: 'comments.authorId', select: 'name avatar' });
  res.json({ task: req.task });
});

/** DELETE /tasks/:id/comments/:commentId — author, or workspace Admin+/Owner */
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = req.task.comments.id(req.params.commentId);
  if (!comment) throw new HttpError(404, 'Comment not found');

  const isAuthor = comment.authorId.equals(req.user._id);
  const isModerator = ['Owner', 'Admin'].includes(req.effectiveRole);
  if (!isAuthor && !isModerator) throw new HttpError(403, 'Not allowed to delete this comment');

  req.task.comments.pull(comment);
  logActivity(req.task, req.user._id, 'comment_deleted');
  await req.task.save();
  res.json({ task: req.task });
});
