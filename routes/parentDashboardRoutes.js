import express from "express";
import {
  getParentDashboard,
  getChildFinance,
  getChildGrades,
  getReportCard,
  getAttendance,
  getMessages,
  sendMessage,
  makePayment,   // ✅ added
} from "../controllers/parentDashboardController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.use(restrictTo("admin", "parent"));

// Dashboard
router.get("/",                                getParentDashboard);

// Child data
router.get("/child/:childId/finance",          getChildFinance);
router.get("/child/:childId/grades",           getChildGrades);
router.get("/child/:childId/report-card",      getReportCard);
router.get("/child/:childId/attendance",       getAttendance);

// Payments
router.post("/child/:childId/payment",         makePayment);   // ✅ added

// Messages
router.get("/messages",                        getMessages);
router.post("/messages",                       sendMessage);

export default router;
