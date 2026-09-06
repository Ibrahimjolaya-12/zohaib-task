import { HttpError, asyncHandler } from '../utils/error.js';
import { uploadBuffer, destroyAsset } from '../config/cloudinary.js';
import { logActivity } from '../utils/activity.js';
import { getWorkspaceRole } from '../middleware/rbac.js';

const isModerator = (role) => ['Owner', 'Admin'].includes(role);

/** POST /tasks/:id/attachments (multipart field: file) */
export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(422, 'No file provided (multipart field "file")');
  if (req.task.attachments.length >= 20) throw new HttpError(422, 'Attachment limit reached (20 per task)');

  const uploaded = await uploadBuffer(req.file.buffer, `pm-saas/${req.task._id}`, req.file.originalname);

  const attachment = {
    url: uploaded.url,
    publicId: uploaded.publicId,
    filename: req.file.originalname,
    mime: req.file.mimetype,
    bytes: uploaded.bytes,
    uploadedBy: req.user._id,
  };
  req.task.attachments.push(attachment);
  logActivity(req.task, req.user._id, 'attachment_added', { to: req.file.originalname });
  await req.task.save();

  res.status(201).json({ task: req.task });
});

/** DELETE /tasks/:id/attachments/:attachmentId — uploader or workspace Admin+ */
export const deleteAttachment = asyncHandler(async (req, res) => {
  const attachment = req.task.attachments.id(req.params.attachmentId);
  if (!attachment) throw new HttpError(404, 'Attachment not found');

  const canDelete = attachment.uploadedBy?.equals(req.user._id) || isModerator(req.effectiveRole);
  if (!canDelete) throw new HttpError(403, 'Only the uploader or a workspace admin can remove this file');

  await destroyAsset(attachment.publicId).catch(() => {
    // Asset already gone from Cloudinary — still remove the reference.
  });

  req.task.attachments.pull(attachment);
  logActivity(req.task, req.user._id, 'attachment_removed', { from: attachment.filename });
  await req.task.save();
  res.json({ task: req.task });
});
