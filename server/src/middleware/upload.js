import multer from 'multer';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// Memory storage: buffer goes straight to Cloudinary via upload_stream, nothing touches local disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(Object.assign(new Error(`Unsupported file type: ${file.mimetype}`), { status: 415 }));
    }
    cb(null, true);
  },
});
