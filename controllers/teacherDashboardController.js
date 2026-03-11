import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Teacher from "../models/Teacher.js";
import Student from "../models/Student.js";
import Grade from "../models/Grade.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import Material from "../models/Material.js";

// ── ESM-safe __dirname (needed for file paths) ────────────────────────────────
const __filename    = fileURLToPath(import.meta.url);
const __dirname     = path.dirname(__filename);
const MATERIALS_DIR = path.join(__dirname, "../uploads/materials");

// ── Look up Teacher by email from JWT ─────────────────────────────────────────
const getTeacherDoc = async (req) => {
  const email = req.user?.email;
  if (!email) return null;
  return Teacher.findOne({ email: email.toLowerCase() });
};

// GET /api/teacher-dashboard
export const getTeacherDashboard = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found. Ensure the User account email matches the Teacher record email exactly.",
      });
    }

    const classList = teacher.classesAssigned
      ? teacher.classesAssigned.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const students = classList.length
      ? await Student.find({ class: { $in: classList } })
      : [];

    const upcomingAssignments = classList.length
      ? await Assignment.find({ class: { $in: classList }, dueDate: { $gte: new Date() } })
          .sort({ dueDate: 1 }).limit(5)
      : [];

    const announcements = await Announcement.find({ isActive: true })
      .sort({ createdAt: -1 }).limit(5);

    const upcomingTasks = upcomingAssignments.map((a) => {
      const diff = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000);
      return {
        _id: a._id, title: a.title, subject: a.subject, class: a.class, dueDate: a.dueDate,
        due: diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`,
        priority: diff <= 1 ? "high" : "medium",
      };
    });

    const classesWithCounts = await Promise.all(
      classList.map(async (cls) => ({
        name: cls,
        subject: teacher.subject,
        students: await Student.countDocuments({ class: cls }),
      }))
    );

    const totalAssignments = classList.length
      ? await Assignment.countDocuments({ class: { $in: classList } })
      : 0;

    res.json({
      success: true,
      data: {
        teacher: {
          _id: teacher._id, firstName: teacher.firstName, lastName: teacher.lastName,
          fullName: `${teacher.firstName} ${teacher.lastName}`,
          teacherId: teacher.teacherId, subject: teacher.subject,
          classesAssigned: classList, email: teacher.email, phone: teacher.phone,
        },
        stats: {
          totalStudents: students.length, totalClasses: classList.length,
          pendingReview: upcomingAssignments.length, totalAssignments,
        },
        classes: classesWithCounts,
        upcomingTasks,
        upcomingAssignments,
        announcements,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/teacher-dashboard/students
export const getMyStudents = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classList = teacher.classesAssigned
      ? teacher.classesAssigned.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const filter = { class: { $in: classList } };
    if (req.query.class) filter.class = req.query.class;

    const students = await Student.find(filter).sort({ firstName: 1 });
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/teacher-dashboard/grades
export const getMyGrades = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classList = teacher.classesAssigned
      ? teacher.classesAssigned.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const studentIds = (await Student.find({ class: { $in: classList } }).select("_id"))
      .map((s) => s._id);

    const filter = { student: { $in: studentIds } };
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.term)    filter.term    = req.query.term;

    const grades = await Grade.find(filter)
      .populate("student", "firstName lastName admissionNo class")
      .sort({ date: -1 }).limit(50);

    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/teacher-dashboard/grades
export const enterGrade = async (req, res) => {
  try {
    const { studentId, subject, score, term, year, examType, date, remarks } = req.body;
    if (!studentId || !subject || score === undefined || !term || !year) {
      return res.status(400).json({
        success: false,
        message: "studentId, subject, score, term and year are required",
      });
    }
    const grade = await Grade.create({
      student: studentId, subject, score: Number(score), term, year, examType, date, remarks,
    });
    res.status(201).json({ success: true, data: grade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ POST /api/teacher-dashboard/grades/by-admission
// Enter a grade using the student's admission number instead of MongoDB _id
export const enterGradeByAdmission = async (req, res) => {
  try {
    const { admissionNo, subject, score, term, year, examType, date, remarks } = req.body;

    if (!admissionNo || !subject || score === undefined || !term || !year) {
      return res.status(400).json({
        success: false,
        message: "admissionNo, subject, score, term and year are required",
      });
    }

    // Look up student by admission number (case-insensitive)
    const student = await Student.findOne({
      admissionNo: admissionNo.trim().toUpperCase(),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `No student found with admission number "${admissionNo}"`,
      });
    }

    const grade = await Grade.create({
      student:  student._id,
      subject,
      score:    Number(score),
      term,
      year,
      examType: examType || "End Term",
      date,
      remarks,
    });

    // Return grade with student info so frontend can confirm who was graded
    res.status(201).json({
      success: true,
      data: {
        ...grade.toObject(),
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
        class:       student.class,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/teacher-dashboard/assignments
export const getMyAssignments = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classList = teacher.classesAssigned
      ? teacher.classesAssigned.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const assignments = await Assignment.find({ class: { $in: classList } }).sort({ dueDate: 1 });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/teacher-dashboard/assignments
export const createAssignment = async (req, res) => {
  try {
    const { title, subject, class: cls, dueDate, description, term, year } = req.body;
    if (!title || !subject || !cls || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "title, subject, class and dueDate are required",
      });
    }
    const assignment = await Assignment.create({ title, subject, class: cls, dueDate, description, term, year });
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MATERIALS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/teacher-dashboard/materials
export const uploadMaterial = async (req, res) => {
  try {
    const { title, subject, description } = req.body;
    const className = req.body.class;

    if (!title?.trim()) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!className?.trim()) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: "Class is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const teacher = await getTeacherDoc(req);
    if (!teacher) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const material = await Material.create({
      title:          title.trim(),
      subject:        subject?.trim() || teacher.subject,
      class:          className.trim(),
      description:    description?.trim() ?? "",
      uploadedBy:     teacher._id,
      fileName:       req.file.originalname,
      storedFileName: req.file.filename,
      fileType:       req.file.mimetype,
      fileSize:       req.file.size,
      fileUrl:        "",
    });

    res.status(201).json({
      success: true,
      message: "Material uploaded successfully",
      material: {
        _id:       material._id,
        title:     material.title,
        subject:   material.subject,
        class:     material.class,
        fileType:  material.fileType,
        fileSize:  material.fileSize,
        createdAt: material.createdAt,
      },
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error("uploadMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/teacher-dashboard/materials
export const getMyMaterials = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const materials = await Material.find({ uploadedBy: teacher._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: materials });
  } catch (err) {
    console.error("getMyMaterials:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/teacher-dashboard/materials/:id
export const deleteMaterial = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const material = await Material.findOne({
      _id:        req.params.id,
      uploadedBy: teacher._id,
    });

    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    const filePath = path.join(MATERIALS_DIR, material.storedFileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await material.deleteOne();
    res.json({ success: true, message: "Material deleted successfully" });
  } catch (err) {
    console.error("deleteMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
