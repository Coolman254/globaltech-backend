import Teacher      from "../models/Teacher.js";
import Student      from "../models/Student.js";
import Grade        from "../models/Grade.js";
import Assignment   from "../models/Assignment.js";
import Submission   from "../models/Submission.js";
import Announcement from "../models/Announcement.js";
import Material     from "../models/Material.js";
import Attendance   from "../models/Attendance.js";
import Message      from "../models/Message.js";
import { uploadToCloudinary, cloudinary } from "../middleware/upload.js";

// ── Helper: get Teacher doc from JWT ─────────────────────────────────────────
const getTeacherDoc = async (req) => {
  const id = req.user?.id ?? req.user?._id;
  if (!id) return null;

  let teacher = await Teacher.findById(id).lean();
  if (teacher) return teacher;

  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(id).lean();
    if (user?.email) {
      teacher = await Teacher.findOne({ email: user.email }).lean();
    }
  } catch (_) {}

  return teacher ?? null;
};

// ── Helper: get classes array from teacher doc ────────────────────────────────
const getClasses = (teacher) => {
  if (!teacher) return [];
  if (Array.isArray(teacher.classes)) return teacher.classes;
  if (Array.isArray(teacher.classesAssigned)) return teacher.classesAssigned;
  if (typeof teacher.classesAssigned === "string" && teacher.classesAssigned.trim()) {
    return teacher.classesAssigned.split(",").map((c) => c.trim()).filter(Boolean);
  }
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboard = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classes = getClasses(teacher);

    const [students, assignments, announcements] = await Promise.all([
      classes.length ? Student.find({ class: { $in: classes } }).lean() : [],
      classes.length ? Assignment.find({ class: { $in: classes } }).sort({ dueDate: 1 }).lean() : [],
      Announcement.find({ isActive: true, audience: { $in: ["all", "teachers"] } })
        .sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      success: true,
      data: {
        teacher: {
          _id:       teacher._id,
          firstName: teacher.firstName,
          lastName:  teacher.lastName,
          fullName:  teacher.fullName ?? `${teacher.firstName} ${teacher.lastName}`,
          email:     teacher.email,
          classes,
          subjects:  teacher.subject ? [teacher.subject] : (teacher.subjects ?? []),
        },
        stats: {
          studentCount:    students.length,
          assignmentCount: assignments.length,
          classCount:      classes.length,
        },
        assignments,
        announcements,
      },
    });
  } catch (err) {
    console.error("teacher getDashboard:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-dashboard/students
// ─────────────────────────────────────────────────────────────────────────────
export const getStudents = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classes = getClasses(teacher);
    const filter = {};
    if (req.query.class) {
      filter.class = req.query.class;
    } else if (classes.length) {
      filter.class = { $in: classes };
    }

    const students = await Student.find(filter).lean();
    res.json({ success: true, data: students });
  } catch (err) {
    console.error("getStudents:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-dashboard/grades
// ─────────────────────────────────────────────────────────────────────────────
export const getGrades = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.class)   filter.class   = req.query.class;

    const grades = await Grade.find(filter)
      .populate("student", "firstName lastName fullName admissionNo")
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: grades });
  } catch (err) {
    console.error("getGrades:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher-dashboard/grades
// ─────────────────────────────────────────────────────────────────────────────
export const enterGrade = async (req, res) => {
  try {
    const { studentId, subject, score, grade, term, year, examType, remarks, class: cls } = req.body;

    if (!studentId || !subject || score == null) {
      return res.status(400).json({ success: false, message: "studentId, subject and score are required" });
    }

    const newGrade = await Grade.create({
      student:  studentId, subject, score, grade, term,
      year:     year ?? String(new Date().getFullYear()),
      examType: examType ?? "End Term",
      remarks, class: cls, date: new Date(),
    });
    res.status(201).json({ success: true, data: newGrade });
  } catch (err) {
    console.error("enterGrade:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher-dashboard/grades/by-admission
// ─────────────────────────────────────────────────────────────────────────────
export const enterGradeByAdmission = async (req, res) => {
  try {
    const { admissionNo, subject, score, grade, term, year, examType, remarks } = req.body;

    if (!admissionNo || !subject || score == null) {
      return res.status(400).json({ success: false, message: "admissionNo, subject and score are required" });
    }

    const student = await Student.findOne({ admissionNo }).lean();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const newGrade = await Grade.create({
      student: student._id, subject, score, grade, term,
      year:     year ?? String(new Date().getFullYear()),
      examType: examType ?? "End Term",
      remarks, class: student.class, date: new Date(),
    });
    res.status(201).json({ success: true, data: newGrade });
  } catch (err) {
    console.error("enterGradeByAdmission:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-dashboard/assignments
// ─────────────────────────────────────────────────────────────────────────────
export const getAssignments = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classes = getClasses(teacher);
    const assignments = await Assignment.find(
      classes.length ? { class: { $in: classes } } : {}
    ).sort({ dueDate: 1 }).lean();

    res.json({ success: true, data: assignments });
  } catch (err) {
    console.error("getAssignments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher-dashboard/assignments
// ─────────────────────────────────────────────────────────────────────────────
export const createAssignment = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { title, description, subject, class: cls, dueDate, totalMarks } = req.body;
    if (!title || !cls) {
      return res.status(400).json({ success: false, message: "Title and class are required" });
    }
    const assignment = await Assignment.create({
      title, description, subject, class: cls, dueDate, totalMarks, teacher: teacher._id,
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    console.error("createAssignment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-dashboard/assignments/:id/submissions
// ─────────────────────────────────────────────────────────────────────────────
export const getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ assignment: req.params.id })
      .populate("student", "firstName lastName fullName admissionNo")
      .sort({ submittedAt: -1 })
      .lean();
    res.json({ success: true, data: submissions });
  } catch (err) {
    console.error("getSubmissions:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-dashboard/materials
// ─────────────────────────────────────────────────────────────────────────────
export const getMaterials = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const materials = await Material.find({ uploadedBy: teacher._id })
      .sort({ createdAt: -1 })
      .lean();

    const shaped = materials.map((m) => ({
      _id: m._id, title: m.title, subject: m.subject, class: m.class,
      description: m.description ?? "", fileName: m.fileName,
      fileType: m.fileType, fileSize: m.fileSize, createdAt: m.createdAt,
    }));

    res.json({ success: true, data: shaped });
  } catch (err) {
    console.error("getMaterials:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher-dashboard/materials  ← Cloudinary via memoryStorage
// ─────────────────────────────────────────────────────────────────────────────
export const uploadMaterial = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file attached" });
    }

    const { title, subject, class: cls, description } = req.body;
    if (!title || !cls) {
      return res.status(400).json({ success: false, message: "Title and class are required" });
    }

    // Upload buffer directly to Cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    const material = await Material.create({
      title,
      subject:        subject ?? "",
      class:          cls,
      description:    description ?? "",
      uploadedBy:     teacher._id,
      fileName:       req.file.originalname,  // shown in UI
      storedFileName: result.public_id,        // Cloudinary public_id for deletion
      fileType:       req.file.mimetype,
      fileSize:       req.file.size,
      fileUrl:        result.secure_url,       // permanent Cloudinary URL
    });

    res.status(201).json({ success: true, data: material });
  } catch (err) {
    console.error("uploadMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/teacher-dashboard/materials/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteMaterial = async (req, res) => {
  try {
    const teacher  = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    if (String(material.uploadedBy) !== String(teacher._id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (material.storedFileName) {
      await cloudinary.uploader.destroy(material.storedFileName).catch(() => {});
    }

    await material.deleteOne();
    res.json({ success: true, message: "Material deleted" });
  } catch (err) {
    console.error("deleteMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-dashboard/messages
// POST /api/teacher-dashboard/messages/reply
// ─────────────────────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const messages = await Message.find({ teacher: teacher._id })
      .populate("student", "firstName lastName fullName admissionNo")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: messages });
  } catch (err) {
    console.error("getMessages:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const replyMessage = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { parentId, studentId, body } = req.body;
    if (!parentId || !body) {
      return res.status(400).json({ success: false, message: "parentId and body are required" });
    }
    const reply = await Message.create({
      teacher: teacher._id, student: studentId,
      parentMessageId: parentId, body, sender: "teacher",
    });
    res.status(201).json({ success: true, data: reply });
  } catch (err) {
    console.error("replyMessage:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/teacher-dashboard/attendance
// POST /api/teacher-dashboard/attendance
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendance = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const classes = getClasses(teacher);
    const date    = req.query.date ? new Date(req.query.date) : new Date();
    const start   = new Date(date); start.setHours(0, 0, 0, 0);
    const end     = new Date(date); end.setHours(23, 59, 59, 999);

    const students = classes.length
      ? await Student.find({ class: { $in: classes } })
          .select("firstName lastName fullName admissionNo class").lean()
      : [];

    const records = classes.length
      ? await Attendance.find({ class: { $in: classes }, date: { $gte: start, $lte: end } })
          .populate("student", "firstName lastName fullName admissionNo").lean()
      : [];

    res.json({ success: true, data: { students, records } });
  } catch (err) {
    console.error("getAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const teacher = await getTeacherDoc(req);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: "date and records[] are required" });
    }

    const ops = records.map(r => ({
      updateOne: {
        filter: { student: r.studentId, date: new Date(date) },
        update: {
          $set: {
            student: r.studentId, status: r.status,
            remarks: r.remarks ?? "", date: new Date(date),
            markedBy: teacher._id, class: r.class ?? "",
          },
        },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(ops);
    res.json({ success: true, message: "Attendance saved" });
  } catch (err) {
    console.error("markAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};