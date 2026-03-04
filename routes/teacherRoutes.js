import express from "express";
import { createTeacher, getTeachers, getTeacherById, updateTeacher, deleteTeacher } from "../controllers/teacherController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", restrictTo("admin", "teacher"), getTeachers);
router.get("/:id", restrictTo("admin", "teacher"), getTeacherById);
router.post("/", restrictTo("admin"), createTeacher);
router.put("/:id", restrictTo("admin"), updateTeacher);
router.delete("/:id", restrictTo("admin"), deleteTeacher);

export default router;
