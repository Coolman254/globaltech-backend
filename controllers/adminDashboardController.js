// ── adminDashboardController.js ───────────────────────────────────────────────
// Add these to your existing admin controllers or create a new file.
// These let admins manage grades, assignments, and announcements.

import Grade from "../models/Grade.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import Student from "../models/Student.js";

// ═══════════════════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════════════════

export const getGrades = async (req, res) => {
  try {
    const { studentId, class: cls, term, year, subject } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (term)      filter.term    = term;
    if (year)      filter.year    = year;
    if (subject)   filter.subject = { $regex: subject, $options: "i" };

    const grades = await Grade.find(filter)
      .populate("student", "firstName lastName admissionNo class")
      .sort({ date: -1 });

    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createGrade = async (req, res) => {
  try {
    const grade = await Grade.create(req.body);
    res.status(201).json({ success: true, data: grade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateGrade = async (req, res) => {
  try {
    const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!grade) return res.status(404).json({ success: false, message: "Grade not found" });
    res.json({ success: true, data: grade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteGrade = async (req, res) => {
  try {
    await Grade.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Grade deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════

export const getAssignments = async (req, res) => {
  try {
    const { class: cls, term, year } = req.query;
    const filter = {};
    if (cls)  filter.class = cls;
    if (term) filter.term  = term;
    if (year) filter.year  = year;
    const assignments = await Assignment.find(filter).sort({ dueDate: 1 });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.create(req.body);
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Assignment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════

export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create(req.body);
    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!announcement) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
