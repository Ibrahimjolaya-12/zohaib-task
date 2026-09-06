import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { Button, Input, Modal, Select, Spinner } from './ui.jsx';

export default function NewTaskModal({ open, onClose, projectId, members }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const createTask = useMutation({
    mutationFn: (body) => api.post(`/projects/${projectId}/tasks`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onClose();
      setError('');
    },
    onError: (err) => setError(apiError(err)),
  });

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    createTask.mutate({
      title: fd.get('title'),
      description: fd.get('description') || '',
      status: fd.get('status'),
      priority: fd.get('priority'),
      dueDate: fd.get('dueDate') || null,
      assigneeId: fd.get('assigneeId') || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form onSubmit={submit} className="space-y-3">
        <Input name="title" placeholder="Task title" required autoFocus />
        <textarea
          name="description"
          rows={3}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <Select name="status" defaultValue="Pending">
              <option>Pending</option>
              <option>In Progress</option>
              <option>Review</option>
              <option>Done</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Priority</label>
            <Select name="priority" defaultValue="Medium">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Due date</label>
            <Input name="dueDate" type="date" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Assignee</label>
            <Select name="assigneeId" defaultValue="">
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId._id} value={m.userId._id}>
                  {m.userId.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTask.isPending}>
            {createTask.isPending && <Spinner className="h-4 w-4" />} Create task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
