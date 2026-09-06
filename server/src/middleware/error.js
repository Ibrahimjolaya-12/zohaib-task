import { HttpError } from '../utils/error.js';

export const notFound = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid id format: ${err.value}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10MB limit' : err.message;
  }

  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: message });
};
