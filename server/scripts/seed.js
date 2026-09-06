/**
 * Seed script: wipes pm_saas and creates a demo workspace with users, projects, and tasks.
 * Run: npm run seed   (requires MONGO_URI in server/.env)
 *
 * Demo logins (all use password "password123"):
 *   alex@demo.io   (Owner)
 *   sam@demo.io    (Admin)
 *   jordan@demo.io (Member)
 *   taylor@demo.io (Viewer)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Project from '../src/models/Project.js';
import Task from '../src/models/Task.js';

const GAP = 1024;

const connect = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing in server/.env');
  await mongoose.connect(process.env.MONGO_URI);
};

const wipe = async () => {
  await Promise.all([User.deleteMany({}), Workspace.deleteMany({}), Project.deleteMany({}), Task.deleteMany({})]);
};

const seed = async () => {
  await connect();
  await wipe();

  const userData = [
    { name: 'Alex Rivera', email: 'alex@demo.io', role: 'Owner' },
    { name: 'Sam Chen', email: 'sam@demo.io', role: 'Admin' },
    { name: 'Jordan Patel', email: 'jordan@demo.io', role: 'Member' },
    { name: 'Taylor Kim', email: 'taylor@demo.io', role: 'Viewer' },
  ];
  const users = [];
  for (const u of userData) {
    users.push(await User.create({ name: u.name, email: u.email, password: 'password123' }));
  }
  const byEmail = Object.fromEntries(users.map((u, i) => [userData[i].role, u]));

  const workspace = await Workspace.create({
    name: 'Acme Inc',
    slug: 'acme-inc',
    ownerId: byEmail.Owner._id,
    members: userData.map((u) => ({ userId: byEmail[u.role]._id, role: u.role })),
  });
  await User.updateMany(
    { _id: { $in: users.map((u) => u._id) } },
    { $set: { workspaces: [{ workspaceId: workspace._id, role: 'Viewer' }], lastActiveWorkspaceId: workspace._id } }
  );
  // Set correct per-user roles in the denormalized index.
  for (const u of userData) {
    await User.updateOne(
      { _id: byEmail[u.role]._id, 'workspaces.workspaceId': workspace._id },
      { $set: { 'workspaces.$.role': u.role } }
    );
  }

  const projectDefs = [
    {
      name: 'Website Redesign',
      description: 'Marketing site refresh: new design system, CMS migration, SEO overhaul.',
      color: '#6366f1',
      icon: 'sparkles',
    },
    {
      name: 'Mobile App v2',
      description: 'Cross-platform rebuild with offline mode and push notifications.',
      color: '#10b981',
      icon: 'rocket',
    },
  ];

  for (const def of projectDefs) {
    await Project.create({ ...def, workspaceId: workspace._id, createdBy: byEmail.Owner._id, members: [] });
  }
  const projects = await Project.find({ workspaceId: workspace._id });

  const days = (n) => new Date(Date.now() + n * 86400000);
  const taskDefs = [
    // Website Redesign
    { p: 0, title: 'Audit current site for accessibility issues', status: 'Todo', priority: 'Medium', due: days(7), assignee: byEmail.Member._id, subs: [['Run axe scan', true], ['Fix contrast issues', false], ['Keyboard nav pass', false]] },
    { p: 0, title: 'Design system: color & typography tokens', status: 'Todo', priority: 'High', due: days(3), assignee: byEmail.Admin._id, subs: [] },
    { p: 0, title: 'Migrate blog to new CMS', status: 'In Progress', priority: 'High', due: days(10), assignee: byEmail.Owner._id, subs: [['Map content model', true], ['Import 120 posts', false]] },
    { p: 0, title: 'SEO: metadata + sitemap automation', status: 'In Progress', priority: 'Medium', due: days(14), assignee: byEmail.Member._id, subs: [] },
    { p: 0, title: 'Landing page hero animation', status: 'Review', priority: 'Low', due: days(2), assignee: byEmail.Admin._id, subs: [['Prefers-reduced-motion support', true]] },
    { p: 0, title: 'Set up analytics dashboard', status: 'Done', priority: 'Medium', due: days(-2), assignee: byEmail.Owner._id, subs: [] },
    // Mobile App v2
    { p: 1, title: 'Offline sync conflict resolution', status: 'Todo', priority: 'High', due: days(21), assignee: byEmail.Owner._id, subs: [['Define merge strategy', false], ['Write test matrix', false]] },
    { p: 1, title: 'Push notification service', status: 'In Progress', priority: 'Medium', due: days(12), assignee: byEmail.Admin._id, subs: [] },
    { p: 1, title: 'Biometric login', status: 'Review', priority: 'High', due: days(5), assignee: byEmail.Member._id, subs: [] },
    { p: 1, title: 'App store screenshots & copy', status: 'Todo', priority: 'Low', due: null, assignee: null, subs: [] },
    { p: 1, title: 'Crash-free rate above 99.5%', status: 'Done', priority: 'High', due: days(-5), assignee: byEmail.Admin._id, subs: [] },
  ];

  const counters = {};
  for (const def of taskDefs) {
    const status = def.status;
    counters[status] = (counters[status] || 0) + 1;
    await Task.create({
      projectId: projects[def.p]._id,
      workspaceId: workspace._id,
      title: def.title,
      description: `Seeded task for ${projects[def.p].name}.`,
      status,
      priority: def.priority,
      dueDate: def.due,
      assigneeId: def.assignee,
      subtasks: def.subs.map(([title, isCompleted]) => ({ title, isCompleted })),
      order: counters[status] * GAP,
      createdById: byEmail.Owner._id,
    });
  }

  console.log('Seed complete.');
  console.log('Workspace: Acme Inc (/w/acme-inc), 2 projects, 11 tasks.');
  console.log('Logins (password: password123):');
  for (const u of userData) console.log(`  ${u.email}  ->  ${u.role}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
