import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Plus } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { Button, Spinner } from '../components/ui.jsx';

export default function WorkspaceHome() {
  const { workspace, projectsQuery } = useOutletContext();

  if (!workspace) return <Navigate to="/" replace />;

  const projects = projectsQuery.data || [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-xl font-bold">Projects in {workspace.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Pick a project to open its board.</p>

      {projectsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7 text-brand-500" />
        </div>
      ) : projects.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p._id}
              to={`/w/${workspace.slug}/p/${p._id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${p.color}1a`, color: p.color }}
                >
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold group-hover:text-brand-700">{p.name}</h2>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{p.description || 'No description'}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {p.doneCount}/{p.taskCount} done
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm text-slate-500">Use the + in the sidebar to create your first project.</p>
        </div>
      )}
    </div>
  );
}
