import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLES = ['Owner', 'Admin', 'Member', 'Viewer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 60 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: null },
    // Denormalized index for "my workspaces" — source of truth is Workspace.members.
    workspaces: [
      {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
        role: { type: String, enum: ROLES },
        _id: false,
      },
    ],
    lastActiveWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
  },
  { timestamps: true, toJSON: { virtuals: false }, toObject: { virtuals: false } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const ROLES_LIST = ROLES;
export default mongoose.model('User', userSchema);
