import mongoose from 'mongoose';

export const STATUSES = ['Todo', 'In Progress', 'Review', 'Done'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

export const ACTIVITY_ACTIONS = [
  'created',
  'renamed',
  'description_updated',
  'status_changed',
  'priority_changed',
  'assigned',
  'unassigned',
  'due_date_changed',
  'moved',
  'subtask_added',
  'subtask_toggled',
  'subtask_removed',
  'commented',
  'comment_updated',
  'comment_deleted',
  'attachment_added',
  'attachment_removed',
];

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: false }
);

const activitySchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, enum: ACTIVITY_ACTIONS },
    meta: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    _id: false,
  },
  { timestamps: false }
);

const commentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [
      {
        url: String,
        publicId: String,
        filename: String,
        bytes: Number,
        _id: false,
      },
    ],
    edited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    filename: { type: String, required: true },
    mime: { type: String, default: 'application/octet-stream' },
    bytes: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 250 },
    description: { type: String, default: '', maxlength: 10000 },
    status: { type: String, enum: STATUSES, default: 'Todo', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    dueDate: { type: Date, default: null },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    // Fractional ordering (LexoRank-lite): drags cost O(1); column is renumbered when gaps get tight.
    order: { type: Number, required: true },
    subtasks: { type: [subtaskSchema], default: [] },
    activityLog: { type: [activitySchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, status: 1, order: 1 });
taskSchema.index({ projectId: 1, dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text' });

taskSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Task', taskSchema);
