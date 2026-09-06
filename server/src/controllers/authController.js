import User from '../models/User.js';
import { HttpError, asyncHandler } from '../utils/error.js';
import { issueSession, rotateSession, revokeSession } from '../utils/tokens.js';

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  lastActiveWorkspaceId: user.lastActiveWorkspaceId,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    throw new HttpError(422, 'name, email and password are required');
  }
  if (String(password).length < 8) throw new HttpError(422, 'Password must be at least 8 characters');

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const user = await User.create({ name: name.trim(), email, password });
  await issueSession(res, user._id, req);
  res.status(201).json({ user: sanitizeUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(422, 'email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  await issueSession(res, user._id, req);
  res.json({ user: sanitizeUser(user) });
});

export const refresh = asyncHandler(async (req, res) => {
  const userId = await rotateSession(req, res);
  const user = await User.findById(userId);
  if (!user) throw new HttpError(401, 'User no longer exists');
  res.json({ user: sanitizeUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSession(req, res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

export const setActiveWorkspace = asyncHandler(async (req, res) => {
  req.user.lastActiveWorkspaceId = req.params.workspaceId;
  await req.user.save();
  res.json({ user: sanitizeUser(req.user) });
});
