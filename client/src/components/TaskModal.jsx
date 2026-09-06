import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckSquare, FileText, History, Plus, Send, Square, Trash2, Upload } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { Avatar, Badge, Button, Modal, PRIORITY_STYLES, Select, Spinner, STATUS_STYLES } from './ui.jsx';

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export default function TaskModal({ taskId, projectId, members, onClose, onDeleted }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [tab, setTab] = useState('comments');
  const [error, setError] = useState('');

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then((r) => r.data.task),
    enabled: !!taskId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const update = useMutation({
    mutationFn: (body) => api.patch(`/tasks/${taskId}`, body),
    onSuccess: invalidate,
    onError: (err) => setError(apiError(err)),
  });

  const removeTask = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}`),
    onSuccess: onDeleted,
    onError: (err) => setError(apiError(err)),
  });

  const subtask = useMutation({
    mutationFn: ({ action, subtaskId, body }) => {
      if (action === 'add') return api.post(`/tasks/${taskId}/subtasks`, body);
      if (action === 'toggle') return api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, body);
      return api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
    },
    onSuccess: invalidate,
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/comments`, { body: comment }),
    onSuccess: () => {
      setComment('');
      invalidate();
    },
    onError: (err) => setError(apiError(err)),
  });

  const uploadFile = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/tasks/${taskId}/attachments`, fd);
    },
    onSuccess: invalidate,
    onError: (err) => setError(apiError(err)),
  });

  const removeAttachment = useMutation({
    mutationFn: (attachmentId) => api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
    onSuccess: invalidate,
  });

  if (!taskId) return null;
  const task = taskQuery.data;
  if (!task) {
    return (
      <Modal open onClose={onClose} title="Task">
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6 text-brand-500" />
        </div>
      </Modal>
    );
  }

  const doneSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;

  return (
    <Modal open onClose={onClose} title={task.title} wide>
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        {/* Left column */}
        <div>
          {/* Properties (inline editors persist to MongoDB on change) */}
          <Section title="Properties">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Status</label>
                <Select value={task.status} onChange={(e) => update.mutate({ status: e.target.value })}>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Review</option>
                  <option>Done</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Priority</label>
                <Select value={task.priority} onChange={(e) => update.mutate({ priority: e.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Assignee</label>
                <Select
                  value={task.assigneeId?._id || ''}
                  onChange={(e) => update.mutate({ assigneeId: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId._id} value={m.userId._id}>
                      {m.userId.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Due date</label>
                <input
                  type="date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                  onChange={(e) => update.mutate({ dueDate: e.target.value || null })}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </Section>

          <Section title="Description">
            <textarea
              defaultValue={task.description}
              rows={3}
              placeholder="Add a description…"
              onBlur={(e) =>
                e.target.value !== task.description && update.mutate({ description: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </Section>

          <Section title={`Subtasks (${doneSubtasks}/${task.subtasks?.length || 0})`}>
            <div className="space-y-1">
              {task.subtasks?.map((s) => (
                <div key={s._id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50">
                  <button
                    onClick={() => subtask.mutate({ action: 'toggle', subtaskId: s._id, body: { isCompleted: !s.isCompleted } })}
                    className="text-slate-400 hover:text-brand-600"
                  >
                    {s.isCompleted ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${s.isCompleted ? 'text-slate-400 line-through' : ''}`}>
                    {s.title}
                  </span>
                  <button
                    onClick={() => subtask.mutate({ action: 'delete', subtaskId: s._id })}
                    className="hidden rounded p-1 text-slate-300 hover:text-rose-500 group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!subtaskTitle.trim()) return;
                  subtask.mutate({ action: 'add', body: { title: subtaskTitle } });
                  setSubtaskTitle('');
                }}
                className="flex gap-2 pt-1"
              >
                <input
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask…"
                  className="flex-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                />
                <Button type="submit" variant="secondary" className="!px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Section>

          {/* Tabs: comments / activity */}
          <div className="mb-2 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
            {[
              ['comments', 'Comments', task.comments?.length || 0],
              ['activity', 'Activity', task.activityLog?.length || 0],
            ].map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-md px-3 py-1.5 ${tab === key ? 'bg-white shadow-sm' : 'text-slate-500'}`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {tab === 'comments' ? (
            <div>
              <div className="mb-3 space-y-3">
                {task.comments?.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
                {task.comments?.map((c) => (
                  <div key={c._id} className="flex gap-2.5">
                    <Avatar user={c.authorId} />
                    <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold">
                        {c.authorId?.name} <span className="ml-1 font-normal text-slate-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                        {c.edited && <span className="ml-1 text-[10px] text-slate-400">(edited)</span>}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addComment.mutate();
                }}
                className="flex gap-2"
              >
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment…"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <Button type="submit" disabled={addComment.isPending || !comment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-2">
              {task.activityLog?.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
              {[...(task.activityLog || [])].reverse().map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  <History className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <b className="font-semibold text-slate-700">{a.actorId?.name || 'Someone'}</b>
                  <span>{a.action.replace(/_/g, ' ')}</span>
                  {a.meta?.from && a.meta?.to && (
                    <span className="text-slate-400">
                      ({String(a.meta.from).slice(0, 30)} → {String(a.meta.to).slice(0, 30)})
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-slate-300">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          <Section title="Badges">
            <div className="flex flex-wrap gap-1.5">
              <Badge className={STATUS_STYLES[task.status]}>{task.status}</Badge>
              <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority}</Badge>
              {task.dueDate && (
                <Badge className="bg-slate-100 text-slate-600">
                  <CalendarDays className="mr-1 h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </Section>

          <Section title="Attachments">
            <div className="space-y-1.5">
              {task.attachments?.map((a) => (
                <div key={a._id} className="group flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-xs text-brand-600 hover:underline"
                  >
                    {a.filename}
                  </a>
                  <button
                    onClick={() => removeAttachment.mutate(a._id)}
                    className="hidden text-slate-300 hover:text-rose-500 group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600">
                <Upload className="h-3.5 w-3.5" />
                {uploadFile.isPending ? 'Uploading…' : 'Upload file (10MB max)'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && uploadFile.mutate(e.target.files[0])}
                />
              </label>
            </div>
          </Section>

          <Section title="Danger zone">
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                if (window.confirm('Delete this task permanently?')) removeTask.mutate();
              }}
              disabled={removeTask.isPending}
            >
              <Trash2 className="h-4 w-4" /> Delete task
            </Button>
          </Section>
        </div>
      </div>

      {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
    </Modal>
  );
}
