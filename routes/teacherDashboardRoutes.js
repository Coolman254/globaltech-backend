import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  getTeacherDashboard,
  getMyStudents,
  getMyGrades,
  enterGrade,
  enterGradeByAdmission, // ✅ added
  getMyAssignments,
  createAssignment,
  uploadMaterial,
  getMyMaterials,
  deleteMaterial,
} from "../controllers/teacherDashboardController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

// ── ESM-safe __dirname ────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename); // ✅ fixed __path__

// ── Upload directory ──────────────────────────────────────────────────────────
const MATERIALS_DIR = path.join(__dirname, "../uploads/materials"); // ✅ fixed __path__
if (!fs.existsSync(MATERIALS_DIR)) fs.mkdirSync(MATERIALS_DIR, { recursive: true }); // ✅ fixed __fs__

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MATERIALS_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`); // ✅ fixed __path__
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg", "image/png",
      "video/mp4", "video/quicktime",
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Unsupported file type"));
  },
});

const router = express.Router();

// ── All routes require login + teacher or admin role ──────────────────────────
router.use(protect);
router.use(restrictTo("admin", "teacher"));

// ── Routes ────────────────────────────────────────────────────────────────────
router.get("/",             getTeacherDashboard);
router.get("/students",     getMyStudents);
router.get("/grades",       getMyGrades);
router.post("/grades",      enterGrade);
router.post("/grades/by-admission", enterGradeByAdmission); // ✅ added
router.get("/assignments",  getMyAssignments);
router.post("/assignments", createAssignment);

// ── Materials ─────────────────────────────────────────────────────────────────
router.post("/materials",        upload.single("file"), uploadMaterial);
router.get("/materials",         getMyMaterials);
router.delete("/materials/:id",  deleteMaterial);

export default router;
