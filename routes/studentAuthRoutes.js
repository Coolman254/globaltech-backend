import express from "express";
import { studentLogin, getMe, setStudentPassword } from "../controllers/studentAuthController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: student login
router.post("/login", studentLogin);

// Protected: get own profile
router.get("/me", protect, getMe);

// Admin only: set/reset a student's password
router.post("/set-password", protect, restrictTo("admin"), setStudentPassword);

export default router;
