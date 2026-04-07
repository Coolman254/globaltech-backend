import express from "express";
import {
  submitContact,
  getContacts,
  markRead,
  deleteContact,
} from "../controllers/contactController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — no auth
router.post("/", submitContact);

// Admin only
router.get("/",           protect, restrictTo("admin"), getContacts);
router.patch("/:id/read", protect, restrictTo("admin"), markRead);
router.delete("/:id",     protect, restrictTo("admin"), deleteContact);

export default router;