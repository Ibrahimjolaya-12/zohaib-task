import { v2 as cloudinary } from 'cloudinary';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('[cloudinary] credentials missing in .env — attachment uploads will fail until configured');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

/** Upload a multer memory buffer; resolves with { url, publicId, bytes, mime }. */
export const uploadBuffer = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          mime: result.resource_type === 'raw' ? result.format || 'application/octet-stream' : result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });

export const destroyAsset = (publicId) => cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => cloudinary.uploader.destroy(publicId));
