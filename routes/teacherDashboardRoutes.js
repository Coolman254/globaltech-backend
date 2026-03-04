import express from "express";
import {
  getTeacherDashboard,
  getMyStudents,
  getMyGrades,
  enterGrade,
  getMyAssignments,
  createAssignment,
} from "../controllers/teacherDashboardController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "teacher"));

router.get("/",             getTeacherDashboard);
router.get("/students",     getMyStudents);
router.get("/grades",       getMyGrades);
router.post("/grades",      enterGrade);
router.get("/assignments",  getMyAssignments);
router.post("/assignments", createAssignment);

export default router;
