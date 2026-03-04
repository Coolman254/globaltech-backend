import Student from "../models/Student.js";
import Grade from "../models/Grade.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import { Payment } from "../models/Finance.js";

// GET /api/student-dashboard  (student protected)
// Returns everything the dashboard needs in one request
export const getDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // ── Recent grades (last 5) ───────────────────────────────────────────────
    const recentGrades = await Grade.find({ student: studentId })
      .sort({ date: -1 })
      .limit(5);

    // ── Average score ────────────────────────────────────────────────────────
    const allGrades = await Grade.find({ student: studentId });
    const average = allGrades.length
      ? Math.round(allGrades.reduce((a, g) => a + g.score, 0) / allGrades.length)
      : 0;

    // ── Upcoming assignments for student's class ─────────────────────────────
    const upcomingAssignments = await Assignment.find({
      class:   student.class,
      dueDate: { $gte: new Date() },
    })
      .sort({ dueDate: 1 })
      .limit(5);

    // ── Announcements (latest 5, active, for all or students) ───────────────
    const announcements = await Announcement.find({
      isActive:  true,
      audience: { $in: ["all", "students"] },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // ── Fee status ───────────────────────────────────────────────────────────
    const balance    = Math.max(0, (student.totalFees || 0) - (student.amountPaid || 0));
    const feeStatus  = student.amountPaid >= student.totalFees ? "cleared"
                     : student.amountPaid > 0 ? "partial"
                     : "pending";
    const recentPayments = await Payment.find({ student: studentId })
      .sort({ date: -1 })
      .limit(3);

    // ── Subject count ────────────────────────────────────────────────────────
    const subjectList  = student.subjects
      ? student.subjects.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    res.json({
      success: true,
      data: {
        student: {
          _id:         student._id,
          firstName:   student.firstName,
          lastName:    student.lastName,
          fullName:    `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo,
          class:       student.class,
          email:       student.email,
          gender:      student.gender,
        },
        stats: {
          average,
          pendingAssignments: upcomingAssignments.length,
          subjectCount:       subjectList.length || 8,
          // attendance would come from an Attendance model when added
        },
        recentGrades,
        upcomingAssignments,
        announcements,
        finance: {
          totalFees:    student.totalFees,
          amountPaid:   student.amountPaid,
          balance,
          feeStatus,
          recentPayments,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/student-dashboard/grades  (full grades list)
export const getMyGrades = async (req, res) => {
  try {
    const { term, year } = req.query;
    const filter = { student: req.user.id };
    if (term && term !== "all") filter.term = term;
    if (year && year !== "all") filter.year = year;

    const grades = await Grade.find(filter).sort({ date: -1 });
    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/student-dashboard/assignments
export const getMyAssignments = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const assignments = await Assignment.find({
      class: student.class,
      dueDate: { $gte: new Date() },
    }).sort({ dueDate: 1 });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/student-dashboard/finance
export const getMyFinance = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const payments = await Payment.find({ student: req.user.id }).sort({ date: -1 });
    const balance  = Math.max(0, (student.totalFees || 0) - (student.amountPaid || 0));

    res.json({
      success: true,
      data: {
        totalFees:  student.totalFees,
        amountPaid: student.amountPaid,
        balance,
        feeStatus: student.amountPaid >= student.totalFees ? "cleared"
                 : student.amountPaid > 0 ? "partial" : "pending",
        payments,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
