import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, MessageSquare, ListChecks } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { Avatar, Badge, PRIORITY_STYLES } from './ui.jsx';

const STATUSES = ['Pending', 'In Progress', 'Review', 'Done'];
const COLUMN_ACCENT = {
  Pending: 'bg-slate-400',
  'In Progress': 'bg-sky-500',
  Review: 'bg-amber-500',
  Done: 'bg-emerald-500',
};

function TaskCard({ task, index, onOpen }) {
  const done = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const total = task.subtasks?.length || 0;
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task._id)}
          className={`mb-2 cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 hover:shadow ${
            snapshot.isDragging ? 'rotate-1 shadow-lg ring-2 ring-brand-200' : ''
          }`}
        >
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority}</Badge>
            {task.dueDate && (
              <Badge className={overdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}>
                <CalendarDays className="mr-1 h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Badge>
            )}
            {total > 0 && (
              <Badge className="bg-slate-100 text-slate-500">
                <ListChecks className="mr-1 h-3 w-3" />
                {done}/{total}
              </Badge>
            )}
            {task.comments?.length > 0 && (
              <Badge className="bg-slate-100 text-slate-500">
                <MessageSquare className="mr-1 h-3 w-3" />
                {task.comments.length}
              </Badge>
            )}
          </div>
          {task.assigneeId && (
            <div className="mt-2 flex justify-end">
              <Avatar user={task.assigneeId} size="h-6 w-6 text-[10px]" />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard({ tasks, projectId, onOpenTask }) {
  const queryClient = useQueryClient();

  const reorder = useMutation({
    mutationFn: ({ taskId, status, beforeTaskId, afterTaskId }) =>
      api.patch(`/tasks/${taskId}/reorder`, { status, beforeTaskId, afterTaskId }),
    // Server is the source of truth for the final fractional order.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
    onError: (err) => alert(apiError(err)),
  });

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, []]));
    for (const t of tasks) if (map[t.status]) map[t.status].push(t);
    for (const s of STATUSES) map[s].sort((a, b) => a.order - b.order);
    return map;
  }, [tasks]);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destStatus = destination.droppableId;
    const destList = [...grouped[destStatus]];
    const [moved] = destList.splice(source.droppableId === destStatus ? source.index : destList.findIndex((t) => t._id === draggableId), 1);
    destList.splice(destination.index, 0, moved);

    const beforeId = destList[destination.index - 1]?._id || null;
    const afterId = destList[destination.index + 1]?._id || null;

    // Optimistic update: move in cache immediately.
    queryClient.setQueryData(['tasks', projectId], (old) =>
      (old || []).map((t) => (t._id === draggableId ? { ...t, status: destStatus } : t))
    );
    reorder.mutate({ taskId: draggableId, status: destStatus, beforeTaskId: beforeId, afterTaskId: afterId });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="scroll-thin flex h-full gap-4 overflow-x-auto p-4">
        {STATUSES.map((status) => (
          <div key={status} className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70">
            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
              <span className={`h-2 w-2 rounded-full ${COLUMN_ACCENT[status]}`} />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{status}</h3>
              <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {grouped[status].length}
              </span>
            </div>
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`scroll-thin min-h-[120px] flex-1 overflow-y-auto rounded-b-xl px-2 pb-2 transition ${
                    snapshot.isDraggingOver ? 'bg-brand-50/80 ring-1 ring-brand-200' : ''
                  }`}
                >
                  {grouped[status].map((task, index) => (
                    <TaskCard key={task._id} task={task} index={index} onOpen={onOpenTask} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
