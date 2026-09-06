import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, MessageSquare } from 'lucide-react';
import { Avatar, Badge, PRIORITY_STYLES, STATUS_STYLES } from './ui.jsx';

const COLUMNS = [
  { key: 'title', label: 'Task' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'dueDate', label: 'Due date' },
];

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const STATUS_RANK = { Pending : 0, 'In Progress': 1, Review: 2, Done: 3 };

export default function TaskListView({ tasks, onOpenTask }) {
  const [sort, setSort] = useState({ field: 'dueDate', dir: 1 });

  const sorted = useMemo(() => {
    const list = [...tasks];
    const { field, dir } = sort;
    list.sort((a, b) => {
      let va, vb;
      switch (field) {
        case 'priority':
          va = PRIORITY_RANK[a.priority];
          vb = PRIORITY_RANK[b.priority];
          break;
        case 'status':
          va = STATUS_RANK[a.status];
          vb = STATUS_RANK[b.status];
          break;
        case 'assignee':
          va = a.assigneeId?.name || '~';
          vb = b.assigneeId?.name || '~';
          break;
        case 'dueDate':
          va = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          vb = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        default:
          va = a.title.toLowerCase();
          vb = b.title.toLowerCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.order - b.order;
    });
    return list;
  }, [tasks, sort]);

  const toggleSort = (field) =>
    setSort((s) => (s.field === field ? { field, dir: -s.dir } : { field, dir: 1 }));

  return (
    <div className="scroll-thin h-full overflow-auto p-4">
      <div className="min-w-[720px] overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {COLUMNS.map(({ key, label }) => (
                <th key={key} className="px-4 py-2.5 font-semibold">
                  <button
                    onClick={() => toggleSort(key)}
                    className="flex items-center gap-1 hover:text-slate-700"
                  >
                    {label}
                    {sort.field === key &&
                      (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5 font-semibold">Subtasks</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No tasks match the current filters.
                </td>
              </tr>
            )}
            {sorted.map((task) => (
              <tr
                key={task._id}
                onClick={() => onOpenTask(task._id)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-brand-50/40"
              >
                <td className="max-w-[320px] px-4 py-3">
                  <p className="truncate font-medium">{task.title}</p>
                  {task.comments?.length > 0 && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <MessageSquare className="h-3 w-3" /> {task.comments.length}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_STYLES[task.status]}>{task.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority}</Badge>
                </td>
                <td className="px-4 py-3">
                  {task.assigneeId ? (
                    <div className="flex items-center gap-2">
                      <Avatar user={task.assigneeId} size="h-6 w-6 text-[10px]" />
                      <span className="text-xs text-slate-600">{task.assigneeId.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.dueDate ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        new Date(task.dueDate) < new Date() && task.status !== 'Done'
                          ? 'font-medium text-rose-600'
                          : 'text-slate-500'
                      }`}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(task.dueDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {task.subtasks?.length
                    ? `${task.subtasks.filter((s) => s.isCompleted).length}/${task.subtasks.length}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
