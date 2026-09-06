import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

const refreshDays = () => parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10);

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

const signRefreshToken = (userId, jti) =>
  jwt.sign({ sub: userId, jti }, process.env.JWT_REFRESH_SECRET, { expiresIn: `${refreshDays()}d` });

/** Create a fresh session: persist refresh-token hash (revocable) and set both httpOnly cookies. */
export const issueSession = async (res, userId, req) => {
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId, jti);
  const expiresAt = new Date(Date.now() + refreshDays() * 86400000);

  await RefreshToken.create({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt,
    userAgent: req?.headers?.['user-agent']?.slice(0, 200) || 'unknown',
  });

  res.cookie(ACCESS_COOKIE, accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieBase, maxAge: refreshDays() * 86400000 });
};

/**
 * Rotate the refresh token: verify + consume the old one (single use),
 * then mint a new pair. Throws 401 if the token was revoked/reused.
 */
export const rotateSession = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw Object.assign(new Error('No refresh token'), { status: 401 });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  const stored = await RefreshToken.findOneAndDelete({ tokenHash: sha256(token) });
  if (!stored) {
    // Token replayed after revocation — wipe every session for this user.
    await RefreshToken.deleteMany({ userId: payload.sub });
    throw Object.assign(new Error('Refresh token revoked'), { status: 401 });
  }

  await issueSession(res, payload.sub, req);
  return payload.sub;
};

export const revokeSession = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await RefreshToken.findOneAndDelete({ tokenHash: sha256(token) });
  res.clearCookie(ACCESS_COOKIE, cookieBase);
  res.clearCookie(REFRESH_COOKIE, cookieBase);
};
