import express from "express";
import Class from "../models/Class.js";

const router = express.Router();

// ── GET all classes ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const classes = await Class.find().sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch classes", error: err.message });
  }
});

// ── GET single class ─────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch class", error: err.message });
  }
});

// ── POST create class ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, stream, students, classTeacher, subjects, status } = req.body;
    if (!name || !stream || !classTeacher) {
      return res.status(400).json({ message: "name, stream, and classTeacher are required" });
    }
    const cls = await Class.create({ name, stream, students, classTeacher, subjects, status });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ message: "Failed to create class", error: err.message });
  }
});

// ── PUT update class ─────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { name, stream, students, classTeacher, subjects, status } = req.body;
    const cls = await Class.findByIdAndUpdate(
      req.params.id,
      { name, stream, students, classTeacher, subjects, status },
      { new: true, runValidators: true }
    );
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: "Failed to update class", error: err.message });
  }
});

// ── DELETE class ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const cls = await Class.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete class", error: err.message });
  }
});

export default router;
