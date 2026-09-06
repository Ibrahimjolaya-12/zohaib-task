import mongoose from 'mongoose';

const ROLES = ['Owner', 'Admin', 'Member', 'Viewer'];

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true, _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Workspace name is required'], trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: {
      type: [memberSchema],
      validate: [(v) => v.length > 0, 'Workspace must have at least one member'],
    },
    logo: { type: String, default: null },
  },
  { timestamps: true }
);

workspaceSchema.index({ 'members.userId': 1 });

workspaceSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export { ROLES };
export default mongoose.model('Workspace', workspaceSchema);
