import { useMemo, useState } from 'react';
import { useParams, useSearchParams, useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { Button, Select } from '../components/ui.jsx';
import KanbanBoard from '../components/KanbanBoard.jsx';
import TaskListView from '../components/TaskListView.jsx';
import TaskModal from '../components/TaskModal.jsx';
import NewTaskModal from '../components/NewTaskModal.jsx';

export default function ProjectPage() {
  const { projectId } = useParams();
  const { workspace } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', assignee: 'all' });

  const view = searchParams.get('view') || 'board';
  const setView = (v) => setSearchParams({ view: v }, { replace: true });

  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data.project),
  });

  const tasks = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`).then((r) => r.data.tasks),
  });

  const members = useQuery({
    queryKey: ['workspace', workspace?._id],
    queryFn: () => api.get(`/workspaces/${workspace._id}`).then((r) => r.data.workspace),
    enabled: !!workspace,
  });

  const filteredTasks = useMemo(() => {
    let list = tasks.data || [];
    if (filters.status !== 'all') list = list.filter((t) => t.status === filters.status);
    if (filters.priority !== 'all') list = list.filter((t) => t.priority === filters.priority);
    if (filters.assignee !== 'all') {
      list =
        filters.assignee === 'none'
          ? list.filter((t) => !t.assigneeId)
          : list.filter((t) => t.assigneeId?._id === filters.assignee);
    }
    return list;
  }, [tasks.data, filters]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });

  return (
    <div className="flex h-full flex-col">
      {/* Top navigation */}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <Link
          to={`/w/${workspace?.slug}`}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Back to projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.data?.color }} />
          <h1 className="font-semibold">{project.data?.name || '…'}</h1>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="!w-auto !py-1.5 text-xs"
          >
            <option value="all">All statuses</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Review</option>
            <option>Done</option>
          </Select>
          <Select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            className="!w-auto !py-1.5 text-xs"
          >
            <option value="all">All priorities</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </Select>
          <Select
            value={filters.assignee}
            onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
            className="!w-auto !py-1.5 text-xs"
          >
            <option value="all">Everyone</option>
            <option value="none">Unassigned</option>
            {members.data?.members?.map((m) => (
              <option key={m.userId._id} value={m.userId._id}>
                {m.userId.name}
              </option>
            ))}
          </Select>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            {[
              ['board', LayoutGrid, 'Board'],
              ['list', List, 'List'],
            ].map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${
                  view === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <Button onClick={() => setNewTaskOpen(true)}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {tasks.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading tasks…</div>
        ) : view === 'board' ? (
          <KanbanBoard tasks={filteredTasks} projectId={projectId} onOpenTask={setSelectedTaskId} />
        ) : (
          <TaskListView tasks={filteredTasks} onOpenTask={setSelectedTaskId} />
        )}
      </div>

      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        projectId={projectId}
        members={members.data?.members || []}
      />
      <TaskModal
        taskId={selectedTaskId}
        projectId={projectId}
        members={members.data?.members || []}
        onClose={() => setSelectedTaskId(null)}
        onDeleted={() => {
          setSelectedTaskId(null);
          refresh();
        }}
      />
    </div>
  );
}
