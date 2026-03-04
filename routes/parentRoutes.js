import express from "express";
import {
  createParent,
  getParents,
  getParentById,
  updateParent,
  deleteParent,
} from "../controllers/parentController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require a valid token
router.use(protect);

// Admin and teacher can view parents
router.get("/", restrictTo("admin", "teacher"), getParents);
router.get("/:id", restrictTo("admin", "teacher"), getParentById);

// Only admin can create, update, delete
router.post("/", restrictTo("admin"), createParent);
router.put("/:id", restrictTo("admin"), updateParent);
router.delete("/:id", restrictTo("admin"), deleteParent);

export default router;
