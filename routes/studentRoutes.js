import express from "express";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require a valid token
router.use(protect);

// Admin, teacher, and parent can view students
router.get("/", restrictTo("admin", "teacher", "parent"), getStudents);
router.get("/:id", restrictTo("admin", "teacher", "parent"), getStudentById);

// Only admin can create, update, delete
router.post("/", restrictTo("admin"), createStudent);
router.put("/:id", restrictTo("admin"), updateStudent);
router.delete("/:id", restrictTo("admin"), deleteStudent);

export default router;
