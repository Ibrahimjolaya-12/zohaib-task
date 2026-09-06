# Flowdeck — Workspace & Project Management SaaS

A Notion/Jira-style project management platform. Strict MERN stack — every data point (auth, workspaces, projects, tasks, comments, activity) persists in MongoDB Atlas via RESTful APIs. No localStorage/IndexedDB state simulation.

```
pm-saas/
├── client/   # React 18 + Vite + Tailwind CSS (@hello-pangea/dnd, react-query, react-router)
└── server/   # Node + Express + Mongoose (JWT httpOnly cookies, Cloudinary)
```

## Setup

### 1. Server

```bash
cd server
cp .env.example .env        # then fill in real values
npm install
```

Fill `server/.env`:
- `MONGO_URI` — your MongoDB Atlas SRV string (database `pm_saas`)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `CLOUDINARY_*` — from the Cloudinary console (only needed for task attachments)

### 2. Seed demo data (recommended)

```bash
npm run seed    # from server/
```

Creates workspace **Acme Inc** with 2 projects and 11 tasks. Logins (password `password123`):
`alex@demo.io` (Owner) · `sam@demo.io` (Admin) · `jordan@demo.io` (Member) · `taylor@demo.io` (Viewer)

### 3. Run

```bash
# from repo root:
npm install
npm run dev          # API on :5000, client on :5173 (proxied — cookies just work)
```

Open http://localhost:5173

## Architecture notes

**Auth** — Access JWT (15m) + refresh JWT (7d), both `httpOnly`/`SameSite=Lax` cookies. Refresh tokens are single-use and stored as SHA-256 hashes in a `refreshtokens` collection (TTL-indexed), so sessions are revocable and replay is detected (replaying a consumed token wipes all of that user's sessions). The Axios interceptor does one silent `/auth/refresh` retry on any 401. The Vite `/api` proxy keeps everything same-origin in dev (no CORS/cookie headaches).

**RBAC** — Workspace roles: `Owner > Admin > Member > Viewer`. Project roles *narrow* workspace roles. Enforced server-side in `requireWorkspaceRole` / `requireProjectRole` / `requireTaskRole` middleware — the client never decides permissions.

**Task engine** — Fractional ordering (`order` field, LexoRank-lite): a Kanban drag sends `{ status, beforeTaskId, afterTaskId }` and the server writes one document (`order = (prev+next)/2`, O(1)); the column is renumbered only when gaps collapse. Bulk endpoint: `PATCH /projects/:projectId/tasks/bulk` (≤50 ops, single `bulkWrite`). Every mutation appends to the embedded `activityLog` (capped at 200).

**Attachments** — Multer memory storage → Cloudinary upload stream (10MB limit, MIME whitelist). `public_id` is stored on the task so deletes clean up Cloudinary.

## API surface (`/api/v1`)

| Method | Route | Notes |
|---|---|---|
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` | cookie sessions |
| GET/PUT | `/auth/me` · `/auth/active-workspace/:id` | |
| GET/POST | `/workspaces` | list mine / create |
| GET/PATCH/DELETE | `/workspaces/:id` | role-gated |
| GET/POST/PATCH/DELETE | `/workspaces/:id/members[/:userId]` | add by email, role change (Owner only) |
| POST/GET | `/workspaces/:id/projects` | |
| GET/PATCH/DELETE | `/projects/:id` | |
| POST/DELETE | `/projects/:id/members/:userId` | project-level narrowing |
| GET/POST | `/projects/:id/tasks` | filters: `status`, `assigneeId`, `q`, `sort` |
| PATCH | `/tasks/:id` · `/tasks/:id/reorder` | updates / drag-and-drop |
| PATCH | `/projects/:id/tasks/bulk` | ≤50 ops |
| POST/PATCH/DELETE | `/tasks/:id/subtasks[/:subtaskId]` | checklist |
| POST/PATCH/DELETE | `/tasks/:id/comments[/:commentId]` | author/ moderator rules |
| POST/DELETE | `/tasks/:id/attachments[/:attachmentId]` | Cloudinary |
