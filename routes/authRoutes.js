import express from "express";
import {
  login,
  register,
  getMe,
  getUsers,
  resetUserPassword,
  deleteUser,
} from "../controllers/authController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/login",    login);

// Admin only — create user accounts
router.post("/register", protect, restrictTo("admin"), register);

// Authenticated
router.get("/me",        protect, getMe);

// Admin only — manage all user accounts
router.get("/users",                        protect, restrictTo("admin"), getUsers);
router.patch("/users/:id/password",         protect, restrictTo("admin"), resetUserPassword);
router.delete("/users/:id",                 protect, restrictTo("admin"), deleteUser);

export default router;
