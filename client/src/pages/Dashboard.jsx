import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, Users } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input, Modal, Spinner, Avatar } from '../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then((r) => r.data.workspaces),
  });

  const createWorkspace = useMutation({
    mutationFn: (name) => api.post('/workspaces', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setOpen(false);
      setName('');
    },
    onError: (err) => setError(apiError(err)),
  });

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your workspaces</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back, {user.name.split(' ')[0]}.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New workspace
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7 text-brand-500" />
        </div>
      ) : data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((ws) => (
            <Link
              key={ws._id}
              to={`/w/${ws.slug}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold group-hover:text-brand-700">{ws.name}</h2>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3 w-3" /> {ws.members?.length || 1} member
                    {ws.members?.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium">No workspaces yet</p>
          <p className="mb-4 text-sm text-slate-500">Create your first workspace to start organizing projects.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Create workspace
          </Button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create workspace">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createWorkspace.mutate(name);
          }}
          className="space-y-3"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Inc" required autoFocus />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending && <Spinner className="h-4 w-4" />} Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
