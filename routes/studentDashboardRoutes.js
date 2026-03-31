import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import {
  getDashboard,
  getMyGrades,
  getMyAssignments,
  getMyFinance,
  getMaterials,
  downloadMaterial,
  submitAssignment,
} from "../controllers/studentDashboardController.js";

const router = express.Router();

// All routes require a valid student JWT
router.use(protect);

// Dashboard summary
router.get("/",                                               getDashboard);

// Grades
router.get("/grades",                                         getMyGrades);

// Assignments
router.get("/assignments",                                    getMyAssignments);
router.post("/assignments/:id/submit", upload.single("file"), submitAssignment);

// Finance
router.get("/finance",                                        getMyFinance);

// ── Materials ─────────────────────────────────────────────────────────────────
// FIX: both routes were missing from this router
router.get("/materials",                                      getMaterials);
router.get("/materials/:id/download",                         downloadMaterial);

export default router;