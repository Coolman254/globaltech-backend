import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Use memory storage — we upload the buffer to Cloudinary manually ──────────
// This avoids multer-storage-cloudinary entirely
const storage = multer.memoryStorage();

// ── File type filter ──────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "video/mp4", "video/mpeg", "video/quicktime", "video/webm",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// ── Helper: upload buffer to Cloudinary ───────────────────────────────────────
// Call this inside your controller after multer runs
export const uploadToCloudinary = (buffer, mimetype, originalname) => {
  return new Promise((resolve, reject) => {
    let resourceType = "raw";
    if (mimetype.startsWith("image/")) resourceType = "image";
    if (mimetype.startsWith("video/")) resourceType = "video";

    const publicId = `school-materials/${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id:     publicId,
        folder:        "school-materials",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

export { cloudinary };
export default upload;