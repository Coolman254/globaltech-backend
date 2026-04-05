import express from "express";
import {
  getGrades, createGrade, updateGrade, deleteGrade,
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getMaterials, uploadMaterial, deleteMaterial,
} from "../controllers/adminDashboardController.js";
import {
  adminGetAttendance,
  adminUpdateAttendance,
  adminDeleteAttendance,
  adminMarkAttendance,
} from "../controllers/attendanceController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();
router.use(protect);
router.use(restrictTo("admin", "teacher"));

// ── Grades ────────────────────────────────────────────────────────────────────
router.get("/grades",          getGrades);
router.post("/grades",         createGrade);
router.put("/grades/:id",      updateGrade);
router.delete("/grades/:id",   deleteGrade);

// ── Assignments ───────────────────────────────────────────────────────────────
router.get("/assignments",         getAssignments);
router.post("/assignments",        createAssignment);
router.put("/assignments/:id",     updateAssignment);
router.delete("/assignments/:id",  deleteAssignment);

// ── Announcements ─────────────────────────────────────────────────────────────
router.get("/announcements",                              getAnnouncements);
router.post("/announcements",   restrictTo("admin"),      createAnnouncement);
router.put("/announcements/:id",restrictTo("admin"),      updateAnnouncement);
router.delete("/announcements/:id", restrictTo("admin"),  deleteAnnouncement);

// ── Attendance ────────────────────────────────────────────────────────────────
router.get("/attendance",         restrictTo("admin"), adminGetAttendance);
router.post("/attendance",        restrictTo("admin"), adminMarkAttendance);
router.put("/attendance/:id",     restrictTo("admin"), adminUpdateAttendance);
router.delete("/attendance/:id",  restrictTo("admin"), adminDeleteAttendance);

// ── Materials ─────────────────────────────────────────────────────────────────
router.get("/materials",                         restrictTo("admin"), getMaterials);
router.post("/materials", upload.single("file"), restrictTo("admin"), uploadMaterial);
router.delete("/materials/:id",                  restrictTo("admin"), deleteMaterial);

export default router;