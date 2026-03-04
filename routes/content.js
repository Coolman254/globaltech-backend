import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Content from "../models/Content.js";
import upload from "../middleware/upload.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Helper: derive type from mimetype ────────────────────────────────────────
const getType = (mimetype = "") => {
  if (mimetype.startsWith("video/"))       return "Video";
  if (mimetype.startsWith("image/"))       return "Image";
  if (mimetype === "application/pdf")      return "PDF";
  return "PDF";
};

// ── Helper: format bytes → human-readable ────────────────────────────────────
const formatSize = (bytes) => {
  if (bytes < 1024)            return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── GET all content (optional ?type= filter) ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;       // ?type=PDF|Video|Image
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }
    const items = await Content.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch content", error: err.message });
  }
});

// ── GET single content item ───────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Content not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch content", error: err.message });
  }
});

// ── POST upload new content ───────────────────────────────────────────────────
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "File is required" });

    const { title, subject, grade, teacher, status } = req.body;
    if (!title || !subject || !grade || !teacher) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "title, subject, grade, and teacher are required" });
    }

    const item = await Content.create({
      title,
      subject,
      grade,
      teacher,
      status:       status || "Published",
      type:         getType(req.file.mimetype),
      filename:     req.file.filename,
      originalName: req.file.originalname,
      mimetype:     req.file.mimetype,
      path:         req.file.path,
      size:         formatSize(req.file.size),
    });

    res.status(201).json(item);
  } catch (err) {
    // Clean up file if DB save fails
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Failed to upload content", error: err.message });
  }
});

// ── GET download a file (increments download counter) ────────────────────────
router.get("/:id/download", async (req, res) => {
  try {
    const item = await Content.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Content not found" });
    if (!fs.existsSync(item.path)) return res.status(404).json({ message: "File not found on disk" });

    res.download(item.path, item.originalName || item.filename);
  } catch (err) {
    res.status(500).json({ message: "Failed to download file", error: err.message });
  }
});

// ── DELETE content + file from disk ──────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const item = await Content.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Content not found" });

    // Remove file from disk
    if (item.path && fs.existsSync(item.path)) {
      fs.unlinkSync(item.path);
    }

    res.json({ message: "Content deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete content", error: err.message });
  }
});

export default router;
