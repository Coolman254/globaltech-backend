import express from "express";
import {
  getGrades, createGrade, updateGrade, deleteGrade,
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from "../controllers/adminDashboardController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "teacher"));

// Grades
router.get("/grades",          getGrades);
router.post("/grades",         createGrade);
router.put("/grades/:id",      updateGrade);
router.delete("/grades/:id",   deleteGrade);

// Assignments
router.get("/assignments",         getAssignments);
router.post("/assignments",        createAssignment);
router.put("/assignments/:id",     updateAssignment);
router.delete("/assignments/:id",  deleteAssignment);

// Announcements (admin only for create/update/delete)
router.get("/announcements",                               getAnnouncements);
router.post("/announcements",    restrictTo("admin"),      createAnnouncement);
router.put("/announcements/:id", restrictTo("admin"),      updateAnnouncement);
router.delete("/announcements/:id", restrictTo("admin"),   deleteAnnouncement);

export default router;
