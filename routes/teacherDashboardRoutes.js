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
  enterGradeByAdmission,
  getMyAssignments,
  createAssignment,
  getSubmissions,
  uploadMaterial,
  getMyMaterials,
  deleteMaterial,
  getMessages,
  replyMessage,
} from "../controllers/teacherDashboardController.js";
import {
  getAttendanceForMarking, // ✅ new
  markAttendance,          // ✅ new
} from "../controllers/attendanceController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

// ── ESM-safe __dirname ────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Upload directory ──────────────────────────────────────────────────────────
const MATERIALS_DIR = path.join(__dirname, "../uploads/materials");
if (!fs.existsSync(MATERIALS_DIR)) fs.mkdirSync(MATERIALS_DIR, { recursive: true });

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MATERIALS_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
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
router.use(protect);
router.use(restrictTo("admin", "teacher"));

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/",                                getTeacherDashboard);

// ── Students ──────────────────────────────────────────────────────────────────
router.get("/students",                        getMyStudents);

// ── Grades ────────────────────────────────────────────────────────────────────
router.get("/grades",                          getMyGrades);
router.post("/grades",                         enterGrade);
router.post("/grades/by-admission",            enterGradeByAdmission);

// ── Assignments ───────────────────────────────────────────────────────────────
router.get("/assignments",                     getMyAssignments);
router.post("/assignments",                    createAssignment);
router.get("/assignments/:id/submissions",     getSubmissions);

// ── Materials ─────────────────────────────────────────────────────────────────
router.post("/materials",   upload.single("file"), uploadMaterial);
router.get("/materials",                       getMyMaterials);
router.delete("/materials/:id",                deleteMaterial);

// ── Messages ──────────────────────────────────────────────────────────────────
router.get("/messages",                        getMessages);
router.post("/messages/reply",                 replyMessage);

// ── Attendance ────────────────────────────────────────────────────────────────
router.get("/attendance",                      getAttendanceForMarking); // ✅ new
router.post("/attendance",                     markAttendance);          // ✅ new

export default router;
