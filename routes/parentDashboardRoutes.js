import express from "express";
import {
  getParentDashboard,
  getChildFinance,
  getChildGrades,
} from "../controllers/parentDashboardController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "parent"));

router.get("/",                           getParentDashboard);
router.get("/child/:childId/finance",     getChildFinance);
router.get("/child/:childId/grades",      getChildGrades);

export default router;
