import app from '../src/app.js';

const routes = [];
for (const layer of app._router.stack) {
  if (layer.name === 'router' && layer.handle?.stack) {
    // Derive the mount path from the layer regexp: "^\/api\/v1\/workspaces\/?(?=\/|$)" -> "/api/v1/workspaces"
    const base = layer.regexp.source
      .replace(/^\^/, '')
      .split('(?=')[0]
      .replace(/\\\/\??$/, '')
      .split('\\/')
      .filter(Boolean)
      .join('/');
    for (const r of layer.handle.stack) {
      if (r.route) {
        const method = Object.keys(r.route.methods)[0].toUpperCase();
        routes.push(`${method.padEnd(6)} ${`${base}${r.route.path === '/' ? '' : r.route.path}`.replace(/\/+$/, '') || base}`);
      }
    }
  }
}
console.log(routes.sort().join('\n'));
console.log('---');

const clientCalls = [
  'POST   /api/v1/auth/register', 'POST   /api/v1/auth/login', 'POST   /api/v1/auth/refresh',
  'POST   /api/v1/auth/logout', 'GET    /api/v1/auth/me',
  'GET    /api/v1/workspaces', 'POST   /api/v1/workspaces', 'GET    /api/v1/workspaces/:workspaceId',
  'POST   /api/v1/workspaces/:workspaceId/projects', 'GET    /api/v1/workspaces/:workspaceId/projects',
  'POST   /api/v1/workspaces/:workspaceId/members', 'PATCH  /api/v1/workspaces/:workspaceId/members/:userId',
  'DELETE /api/v1/workspaces/:workspaceId/members/:userId',
  'GET    /api/v1/projects/:projectId', 'GET    /api/v1/projects/:projectId/tasks',
  'POST   /api/v1/projects/:projectId/tasks', 'PATCH  /api/v1/projects/:projectId/tasks/bulk',
  'GET    /api/v1/tasks/:id', 'PATCH  /api/v1/tasks/:id', 'PATCH  /api/v1/tasks/:id/reorder', 'DELETE /api/v1/tasks/:id',
  'POST   /api/v1/tasks/:id/subtasks', 'PATCH  /api/v1/tasks/:id/subtasks/:subtaskId', 'DELETE /api/v1/tasks/:id/subtasks/:subtaskId',
  'POST   /api/v1/tasks/:id/comments', 'PATCH  /api/v1/tasks/:id/comments/:commentId', 'DELETE /api/v1/tasks/:id/comments/:commentId',
  'POST   /api/v1/tasks/:id/attachments', 'DELETE /api/v1/tasks/:id/attachments/:attachmentId',
];

// Registered paths are reconstructed without a leading slash; expected ones have it — strip "/api/v1/" prefix marker on both.
const normalize = (r) => r.replace(/\s+/g, ' ').replace('/api/v1/', 'api/v1/');
const registered = new Set(routes.map(normalize));
const missing = clientCalls.filter((c) => !registered.has(normalize(c)));
console.log(missing.length ? 'MISSING:\n' + missing.join('\n') : `All ${clientCalls.length} client-called routes registered ✔`);
process.exit(0);
