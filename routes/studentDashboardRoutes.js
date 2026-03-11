import express from "express";
import {
  getDashboard,
  getMyGrades,
  getMyAssignments,
  getMyFinance,
  getMaterials,
  downloadMaterial,
  submitAssignment,
} from "../controllers/studentDashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ── ESM-safe __dirname ────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename); // ✅ fixed __path__

// ── Submission upload directory ───────────────────────────────────────────────
const SUBMISSIONS_DIR = path.join(__dirname, "../uploads/submissions"); // ✅ fixed __path__
if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true }); // ✅ fixed __fs__

// ── Multer: save submission files to disk ─────────────────────────────────────
const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SUBMISSIONS_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`); // ✅ fixed __path__
  },
});

const uploadSubmission = multer({
  storage: submissionStorage,
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/png", "image/gif",
      "video/mp4", "video/quicktime",
      "text/plain",
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Unsupported file type"));
  },
});

const router = express.Router();

// ── All routes require a logged-in student ────────────────────────────────────
router.use(protect);

// ── Routes ────────────────────────────────────────────────────────────────────
router.get("/",            getDashboard);
router.get("/grades",      getMyGrades);
router.get("/assignments", getMyAssignments);
router.get("/finance",     getMyFinance);

// ── Materials ─────────────────────────────────────────────────────────────────
router.get("/materials",              getMaterials);
router.get("/materials/:id/download", downloadMaterial);

// ── Assignment submission ─────────────────────────────────────────────────────
router.post(
  "/assignments/:id/submit",
  uploadSubmission.single("file"),
  submitAssignment,
);

export default router;
