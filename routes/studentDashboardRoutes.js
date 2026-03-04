import express from "express";
import {
  getDashboard,
  getMyGrades,
  getMyAssignments,
  getMyFinance,
} from "../controllers/studentDashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require student to be logged in
router.use(protect);

router.get("/",            getDashboard);
router.get("/grades",      getMyGrades);
router.get("/assignments", getMyAssignments);
router.get("/finance",     getMyFinance);

export default router;
