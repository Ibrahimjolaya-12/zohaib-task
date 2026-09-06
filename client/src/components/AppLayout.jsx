import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Plus,
  Users,
} from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Button, Input, Modal, Select, Spinner } from './ui.jsx';
import WorkspaceSwitcherModal from './WorkspaceSwitcherModal.jsx';
import MemberModal from './MemberModal.jsx';

export default function AppLayout() {
  const { workspaceSlug } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const workspaces = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then((r) => r.data.workspaces),
  });
  const workspace = useMemo(
    () => workspaces.data?.find((w) => w.slug === workspaceSlug),
    [workspaces.data, workspaceSlug]
  );

  const projects = useQuery({
    queryKey: ['projects', workspace?._id],
    queryFn: () => api.get(`/workspaces/${workspace._id}/projects`).then((r) => r.data.projects),
    enabled: !!workspace,
  });

  const createProject = useMutation({
    mutationFn: (body) => api.post(`/workspaces/${workspace._id}/projects`, body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspace._id] });
      setProjectOpen(false);
      navigate(`/w/${workspace.slug}/p/${res.data.project._id}`);
    },
  });

  const wsQuery = useQuery({
    queryKey: ['workspace', workspace?._id],
    queryFn: () => api.get(`/workspaces/${workspace._id}`).then((r) => r.data.workspace),
    enabled: !!workspace,
  });

  if (workspaces.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-500" />
      </div>
    );
  }
  if (!workspace) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-slate-500">Workspace not found.</p>
        <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
          Back to workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all ${collapsed ? 'w-16' : 'w-64'}`}
      >
        <div className="flex items-center justify-between px-3 py-3">
          {!collapsed && (
            <button
              onClick={() => setSwitcherOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                {workspace.name.charAt(0)}
              </div>
              <span className="truncate text-sm font-semibold">{workspace.name}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {!collapsed && (
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Projects</span>
              <button
                onClick={() => setProjectOpen(true)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                title="New project"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          {projects.isLoading ? (
            <div className="px-3 py-2">
              <Spinner className="h-4 w-4 text-slate-400" />
            </div>
          ) : projects.data?.length ? (
            projects.data.map((p) => (
              <NavLink
                key={p._id}
                to={`/w/${workspace.slug}/p/${p._id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                    isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
                title={p.name}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" style={{ color: p.color }} />
                {!collapsed && <span className="truncate">{p.name}</span>}
                {!collapsed && (
                  <span className="ml-auto text-[11px] text-slate-400">
                    {p.doneCount}/{p.taskCount}
                  </span>
                )}
              </NavLink>
            ))
          ) : (
            !collapsed && (
              <p className="px-2.5 py-2 text-xs text-slate-400">
                No projects yet. Click + to create one.
              </p>
            )
          )}
        </nav>

        <div className="border-t border-slate-200 p-2">
          <button
            onClick={() => setTeamOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100"
            title="Team"
          >
            <Users className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Team</span>}
          </button>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            <Avatar user={user} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-[11px] text-slate-400">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ workspace, projectsQuery: projects, wsQuery }} />
      </main>

      <WorkspaceSwitcherModal
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        workspaces={workspaces.data || []}
        current={workspace}
      />
      <MemberModal open={teamOpen} onClose={() => setTeamOpen(false)} workspace={wsQuery.data} />
      <Modal open={projectOpen} onClose={() => setProjectOpen(false)} title="Create project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            createProject.mutate({
              name: fd.get('name'),
              description: fd.get('description'),
              color: fd.get('color'),
              icon: fd.get('icon') || 'folder',
            });
          }}
          className="space-y-3"
        >
          <Input name="name" placeholder="Project name" required autoFocus />
          <Input name="description" placeholder="Description (optional)" />
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Color
              <input name="color" type="color" defaultValue="#6366f1" className="h-8 w-12 cursor-pointer rounded border border-slate-300" />
            </label>
          </div>
          {createProject.error && <p className="text-xs text-rose-600">{apiError(createProject.error)}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setProjectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending && <Spinner className="h-4 w-4" />} Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
