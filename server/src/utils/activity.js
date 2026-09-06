const PRUNE_KEYS = 200;

/** Write-through activity logging: appends to the embedded log, capped at the last 200 entries. */
export const logActivity = (task, actorId, action, meta) => {
  const safeMeta =
    meta && typeof meta === 'object'
      ? Object.fromEntries(Object.entries(meta).slice(0, 8).map(([k, v]) => [k, String(v).slice(0, 200)]))
      : meta;
  task.activityLog.push({ actorId, action, meta: safeMeta });
  if (task.activityLog.length > PRUNE_KEYS) {
    task.activityLog = task.activityLog.slice(-PRUNE_KEYS);
  }
};
