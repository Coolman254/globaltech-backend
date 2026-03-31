import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import {
  getDashboard,
  getStudents,
  getGrades,
  enterGrade,
  enterGradeByAdmission,
  getAssignments,
  createAssignment,
  getSubmissions,
  getMaterials,
  uploadMaterial,
  deleteMaterial,
  getMessages,
  replyMessage,
  getAttendance,
  markAttendance,
} from "../controllers/teacherDashboardController.js";

const router = express.Router();

// All routes require a valid teacher JWT
router.use(protect);

// Dashboard
router.get("/",                                    getDashboard);

// Students
router.get("/students",                            getStudents);

// Grades
router.get("/grades",                              getGrades);
router.post("/grades",                             enterGrade);
router.post("/grades/by-admission",                enterGradeByAdmission);

// Assignments
router.get("/assignments",                         getAssignments);
router.post("/assignments",                        createAssignment);
router.get("/assignments/:id/submissions",         getSubmissions);

// ── Materials ─────────────────────────────────────────────────────────────────
// FIX: these three routes were missing — added upload middleware for POST
router.get("/materials",                           getMaterials);
router.post("/materials", upload.single("file"),   uploadMaterial);
router.delete("/materials/:id",                    deleteMaterial);

// Messages
router.get("/messages",                            getMessages);
router.post("/messages/reply",                     replyMessage);

// Attendance
router.get("/attendance",                          getAttendance);
router.post("/attendance",                         markAttendance);

export default router;