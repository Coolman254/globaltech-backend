import express from "express";
import {
  getParentDashboard,
  getChildFinance,
  getChildGrades,
  // ── new ──
  getReportCard,
  getAttendance,
  getMessages,
  sendMessage,
} from "../controllers/parentDashboardController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "parent"));

// Existing routes (unchanged)
router.get("/",                                getParentDashboard);
router.get("/child/:childId/finance",          getChildFinance);
router.get("/child/:childId/grades",           getChildGrades);

// New routes
router.get("/child/:childId/report-card",      getReportCard);
router.get("/child/:childId/attendance",       getAttendance);
router.get("/messages",                        getMessages);
router.post("/messages",                       sendMessage);

export default router;
