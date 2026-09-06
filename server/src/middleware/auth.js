import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { HttpError, asyncHandler } from '../utils/error.js';

/** Verifies the httpOnly access-token cookie and attaches the user document. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) throw new HttpError(401, 'Not authenticated');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new HttpError(401, 'Session expired');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'User no longer exists');

  req.user = user;
  next();
});
