import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiError } from '../api/client.js';
import { Avatar, Badge, Button, Input, Modal, Select, Spinner } from './ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_BADGE = {
  Owner: 'bg-brand-100 text-brand-700',
  Admin: 'bg-sky-100 text-sky-700',
  Member: 'bg-slate-100 text-slate-600',
  Viewer: 'bg-amber-100 text-amber-700',
};

export default function MemberModal({ open, onClose, workspace }) {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');

  const members = workspace?.members || [];
  const myRole = members.find((m) => m.userId?._id === me.id)?.role;
  const canManage = ['Owner', 'Admin'].includes(myRole);
  const isOwner = myRole === 'Owner';

  const addMember = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspace._id}/members`, { email, role }),
    onSuccess: () => {
      setEmail('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace._id] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }) =>
      api.patch(`/workspaces/${workspace._id}/members/${userId}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace', workspace._id] }),
    onError: (err) => setError(apiError(err)),
  });

  const removeMember = useMutation({
    mutationFn: (userId) => api.delete(`/workspaces/${workspace._id}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace', workspace._id] }),
    onError: (err) => setError(apiError(err)),
  });

  return (
    <Modal open={open} onClose={onClose} title={`Team — ${workspace?.name || ''}`}>
      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMember.mutate();
          }}
          className="mb-4 flex gap-2"
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com (must be registered)"
            required
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-32">
            <option>Admin</option>
            <option>Member</option>
            <option>Viewer</option>
          </Select>
          <Button type="submit" disabled={addMember.isPending}>
            {addMember.isPending ? <Spinner className="h-4 w-4" /> : 'Add'}
          </Button>
        </form>
      )}

      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

      <div className="space-y-1">
        {members.map((m) => {
          const u = m.userId; // populated
          const isMe = u?._id === me.id;
          return (
            <div key={u?._id || m.userId} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
              <Avatar user={u} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u?.name} {isMe && <span className="text-xs text-slate-400">(you)</span>}
                </p>
                <p className="truncate text-xs text-slate-400">{u?.email}</p>
              </div>
              {m.role === 'Owner' || isMe || !canManage ? (
                <Badge className={ROLE_BADGE[m.role]}>{m.role}</Badge>
              ) : isOwner ? (
                <Select
                  value={m.role}
                  onChange={(e) => changeRole.mutate({ userId: u._id, role: e.target.value })}
                  className="w-28 !py-1 text-xs"
                >
                  <option>Admin</option>
                  <option>Member</option>
                  <option>Viewer</option>
                </Select>
              ) : (
                <Badge className={ROLE_BADGE[m.role]}>{m.role}</Badge>
              )}
              {canManage && m.role !== 'Owner' && !isMe && (
                <button
                  onClick={() => removeMember.mutate(u._id)}
                  className="rounded p-1 text-xs text-slate-400 hover:text-rose-600"
                  title="Remove from workspace"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        Roles: <b>Owner</b> manages everything & members' roles · <b>Admin</b> manages projects, members and tasks ·{' '}
        <b>Member</b> creates and edits tasks · <b>Viewer</b> read-only.
      </p>
    </Modal>
  );
}
