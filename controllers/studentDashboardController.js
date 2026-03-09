import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Student    from "../models/Student.js";
import Grade      from "../models/Grade.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import Material   from "../models/Material.js";
import Submission from "../models/Submission.js";
import { Payment, FeeStructure } from "../models/Finance.js";

const __filename    = fileURLToPath(import.meta.url);
const __dirname     = path.dirname(__filename);
const MATERIALS_DIR = path.join(__dirname, "../uploads/materials");

// ── Helper: get Student doc from JWT ─────────────────────────────────────────
// protect middleware sets req.user = { id, role } from the JWT payload.
// We use req.user.id to fetch the full Student document including .class.
const getStudentDoc = async (req) => {
  const id = req.user?.id ?? req.user?._id;
  if (!id) return null;
  return Student.findById(id).lean();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student-dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboard = async (req, res) => {
  try {
    const student = await getStudentDoc(req);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    // Run all queries in parallel for speed
    const [grades, assignments, announcements, submissions] = await Promise.all([
      Grade.find({ student: student._id }).sort({ date: -1 }).limit(5).lean(),
      Assignment.find({ class: student.class, dueDate: { $gte: new Date() } })
        .sort({ dueDate: 1 }).lean(),
      Announcement.find({ isActive: true, audience: { $in: ["all", "students"] } })
        .sort({ createdAt: -1 }).limit(10).lean(),
      Submission.find({ student: student._id }).distinct("assignment"),
    ]);

    // Mark which assignments are already submitted
    const submittedSet = new Set(submissions.map(String));
    const enrichedAssignments = assignments.map((a) => ({
      ...a,
      submitted: submittedSet.has(String(a._id)),
    }));

    // Fee info
    let finance = { totalFees: 0, amountPaid: 0, balance: 0, feeStatus: "pending" };
    try {
      const currentYear = String(new Date().getFullYear());
      const structures  = await FeeStructure.find({ class: student.class, year: currentYear }).lean();
      const totalFees   = structures.reduce((s, f) =>
        s + (f.tuition ?? 0) + (f.boarding ?? 0) + (f.activity ?? 0) + (f.other ?? 0), 0);
      const payments    = await Payment.find({ student: student._id }).lean();
      const amountPaid  = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
      const balance     = totalFees - amountPaid;
      finance = {
        totalFees, amountPaid, balance,
        feeStatus: totalFees === 0 ? "cleared" : balance <= 0 ? "cleared" : amountPaid > 0 ? "partial" : "pending",
      };
    } catch { /* Finance model not set up yet — return defaults */ }

    const avgScore = grades.length
      ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)
      : 0;

    const subjects = [...new Set(grades.map((g) => g.subject))];

    res.json({
      success: true,
      data: {
        student: {
          _id:         student._id,
          firstName:   student.firstName,
          lastName:    student.lastName,
          fullName:    student.fullName ?? `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo,
          class:       student.class,
          email:       student.email,
        },
        stats: {
          average:            avgScore,
          pendingAssignments: enrichedAssignments.filter((a) => !a.submitted).length,
          subjectCount:       subjects.length,
        },
        recentGrades:        grades,
        upcomingAssignments: enrichedAssignments,
        announcements,
        finance,
      },
    });
  } catch (err) {
    console.error("getDashboard:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student-dashboard/grades
// ─────────────────────────────────────────────────────────────────────────────
export const getMyGrades = async (req, res) => {
  try {
    const student = await getStudentDoc(req);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const filter = { student: student._id };
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.term)    filter.term    = req.query.term;

    const grades = await Grade.find(filter).sort({ date: -1 }).lean();
    res.json({ success: true, data: grades });
  } catch (err) {
    console.error("getMyGrades:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student-dashboard/assignments
// ─────────────────────────────────────────────────────────────────────────────
export const getMyAssignments = async (req, res) => {
  try {
    const student = await getStudentDoc(req);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const assignments = await Assignment.find({ class: student.class })
      .sort({ dueDate: 1 })
      .lean();

    const submittedIds = await Submission.find({ student: student._id }).distinct("assignment");
    const submittedSet = new Set(submittedIds.map(String));

    const enriched = assignments.map((a) => ({ ...a, submitted: submittedSet.has(String(a._id)) }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("getMyAssignments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student-dashboard/finance
// ─────────────────────────────────────────────────────────────────────────────
export const getMyFinance = async (req, res) => {
  try {
    const student = await getStudentDoc(req);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const currentYear = String(new Date().getFullYear());
    const structures  = await FeeStructure.find({ class: student.class, year: currentYear }).lean();
    const totalFees   = structures.reduce((s, f) =>
      s + (f.tuition ?? 0) + (f.boarding ?? 0) + (f.activity ?? 0) + (f.other ?? 0), 0);

    const payments   = await Payment.find({ student: student._id }).sort({ date: -1 }).lean();
    const amountPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const balance    = totalFees - amountPaid;

    res.json({
      success: true,
      data: {
        totalFees, amountPaid, balance,
        feeStatus: totalFees === 0 ? "cleared" : balance <= 0 ? "cleared" : amountPaid > 0 ? "partial" : "pending",
        payments,
      },
    });
  } catch (err) {
    console.error("getMyFinance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student-dashboard/materials
// ─────────────────────────────────────────────────────────────────────────────
export const getMaterials = async (req, res) => {
  try {
    const student = await getStudentDoc(req);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const materials = await Material.find({ class: student.class })
      .populate("uploadedBy", "firstName lastName fullName")
      .sort({ createdAt: -1 })
      .lean();

    const shaped = materials.map((m) => ({
      _id:         m._id,
      title:       m.title,
      subject:     m.subject,
      class:       m.class,
      description: m.description ?? "",
      fileUrl:     m.fileUrl ?? "",
      fileName:    m.fileName,
      fileType:    m.fileType,
      fileSize:    m.fileSize,
      uploadedBy:
        m.uploadedBy?.fullName ??
        `${m.uploadedBy?.firstName ?? ""} ${m.uploadedBy?.lastName ?? ""}`.trim() ??
        "Teacher",
      createdAt: m.createdAt,
    }));

    res.json({ success: true, data: shaped });
  } catch (err) {
    console.error("getMaterials:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student-dashboard/materials/:id/download
// ─────────────────────────────────────────────────────────────────────────────
export const downloadMaterial = async (req, res) => {
  try {
    const student  = await getStudentDoc(req);
    const material = await Material.findById(req.params.id).lean();

    if (!material) return res.status(404).json({ message: "Material not found" });
    if (material.class !== student.class) return res.status(403).json({ message: "Access denied" });

    const filePath = path.join(MATERIALS_DIR, material.storedFileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on server" });

    res.setHeader("Content-Disposition", `attachment; filename="${material.fileName}"`);
    res.setHeader("Content-Type",        material.fileType);
    res.setHeader("Content-Length",      material.fileSize);

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => res.status(500).json({ message: "Failed to read file" }));
    stream.pipe(res);
  } catch (err) {
    console.error("downloadMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/student-dashboard/assignments/:id/submit
// ─────────────────────────────────────────────────────────────────────────────
export const submitAssignment = async (req, res) => {
  try {
    const student = await getStudentDoc(req);
    const { answer = "" } = req.body;

    if (!answer.trim() && !req.file) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Please provide an answer or attach a file" });
    }

    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Assignment not found" });
    }

    const existing = await Submission.findOne({ student: student._id, assignment: assignment._id });
    if (existing) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(409).json({ message: "You have already submitted this assignment" });
    }

    const submissionData = {
      student:     student._id,
      assignment:  assignment._id,
      class:       student.class,
      subject:     assignment.subject,
      answer:      answer.trim(),
      submittedAt: new Date(),
    };

    if (req.file) {
      submissionData.file = {
        fileName:       req.file.originalname,
        storedFileName: req.file.filename,
        fileType:       req.file.mimetype,
        fileSize:       req.file.size,
        filePath:       req.file.path,
      };
    }

    const submission = await Submission.create(submissionData);
    res.status(201).json({
      success: true,
      message: "Assignment submitted successfully",
      submission: { _id: submission._id, submittedAt: submission.submittedAt },
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error("submitAssignment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
