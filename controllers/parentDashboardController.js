import Parent from "../models/Parent.js";
import Student from "../models/Student.js";
import Grade from "../models/Grade.js";
import Announcement from "../models/Announcement.js";
import { Payment, FeeStructure } from "../models/Finance.js";
import Message from "../models/Message.js";

// ── Look up Parent by email from JWT ─────────────────────────────────────────
const getParentDoc = async (req) => {
  const email = req.user?.email;
  if (!email) return null;
  return Parent.findOne({ email: email.toLowerCase() });
};

// ── Security helper: confirm child belongs to this parent ─────────────────────
const isLinkedChild = (parent, childId) =>
  parent.linkedStudents.some((id) => id.toString() === childId.toString());

// ── Fee helper: compute totals from FeeStructure + Payment records ────────────
const getStudentFeeInfo = async (student) => {
  const currentYear = String(new Date().getFullYear());
  const structures  = await FeeStructure.find({ class: student.class, year: currentYear }).lean();

  const totalFees = structures.reduce((sum, s) => {
    return sum + (s.tuition ?? 0) + (s.boarding ?? 0) + (s.activity ?? 0) + (s.other ?? 0);
  }, 0);

  const payments   = await Payment.find({ student: student._id }).lean();
  const amountPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const balance   = totalFees - amountPaid;
  const feeStatus =
    totalFees === 0  ? "cleared"
    : balance <= 0   ? "cleared"
    : amountPaid > 0 ? "partial"
    : "pending";

  return { totalFees, amountPaid, balance, feeStatus };
};

// GET /api/parent-dashboard
export const getParentDashboard = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent profile not found. Ensure your User account email matches your Parent record email.",
      });
    }

    const children = parent.linkedStudents.length
      ? await Student.find({ _id: { $in: parent.linkedStudents } }).lean()
      : [];

    const childrenWithData = await Promise.all(
      children.map(async (child) => {
        const recentGrades = await Grade.find({ student: child._id })
          .sort({ date: -1 }).limit(5).lean();

        const avgScore = recentGrades.length
          ? Math.round(recentGrades.reduce((s, g) => s + g.score, 0) / recentGrades.length)
          : 0;

        const fee = await getStudentFeeInfo(child);

        return {
          _id:         child._id,
          firstName:   child.firstName,
          lastName:    child.lastName,
          fullName:    `${child.firstName} ${child.lastName}`,
          class:       child.class,
          admissionNo: child.admissionNo,
          avgScore,
          recentGrades,
          fee,
        };
      })
    );

    const announcements = await Announcement.find({
      isActive: true,
      audience: { $in: ["all", "parents"] },
    }).sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      success: true,
      data: {
        parent: {
          _id:          parent._id,
          firstName:    parent.firstName,
          lastName:     parent.lastName,
          fullName:     `${parent.firstName} ${parent.lastName}`,
          email:        parent.email,
          phone:        parent.phone,
          relationship: parent.relationship,
        },
        children: childrenWithData,
        announcements,
        upcomingEvents: [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parent-dashboard/child/:childId/finance
export const getChildFinance = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const { childId } = req.params;

    if (!isLinkedChild(parent, childId)) {
      return res.status(403).json({ success: false, message: "Access denied: child not linked to your account" });
    }

    const child = await Student.findById(childId);
    if (!child) return res.status(404).json({ success: false, message: "Student not found" });

    const fee      = await getStudentFeeInfo(child);
    const payments = await Payment.find({ student: childId }).sort({ date: -1 }).limit(20).lean();

    res.json({
      success: true,
      data: {
        child: {
          _id:         child._id,
          fullName:    `${child.firstName} ${child.lastName}`,
          admissionNo: child.admissionNo,
          class:       child.class,
        },
        finance: fee,
        payments: payments.map((p) => ({
          _id:       p._id,
          amount:    p.amount,
          method:    p.method,
          date:      p.date,
          reference: p.reference,
          receipt:   p.receipt,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parent-dashboard/child/:childId/grades
export const getChildGrades = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const { childId } = req.params;

    if (!isLinkedChild(parent, childId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const grades = await Grade.find({ student: childId }).sort({ date: -1 }).limit(30).lean();
    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parent-dashboard/child/:childId/report-card
export const getReportCard = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const { childId } = req.params;

    if (!isLinkedChild(parent, childId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const grades = await Grade.find({ student: childId }).sort({ date: -1 }).lean();

    const byTerm = grades.reduce((acc, g) => {
      const key = `${g.term} ${g.year ?? ""}`.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(g);
      return acc;
    }, {});

    res.json({ success: true, data: byTerm });
  } catch (err) {
    console.error("getReportCard:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parent-dashboard/child/:childId/attendance
export const getAttendance = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const { childId } = req.params;

    if (!isLinkedChild(parent, childId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    let records = [];
    try {
      const Attendance = (await import("../models/Attendance.js")).default;
      records = await Attendance.find({ student: childId })
        .sort({ date: -1 }).limit(60).lean();
    } catch {
      // Attendance model not set up yet — returns empty summary gracefully
    }

    const totalDays   = records.length;
    const presentDays = records.filter((r) => r.status === "present").length;
    const absentDays  = records.filter((r) => r.status === "absent").length;
    const lateDays    = records.filter((r) => r.status === "late").length;
    const percentage  = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      success: true,
      data: {
        summary: { totalDays, presentDays, absentDays, lateDays, percentage },
        records,
      },
    });
  } catch (err) {
    console.error("getAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parent-dashboard/messages
export const getMessages = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const messages = await Message.find({ parent: parent._id })
      .populate("teacher", "firstName lastName subject")
      .populate("student", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: messages });
  } catch (err) {
    console.error("getMessages:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/parent-dashboard/messages
export const sendMessage = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const { teacherId, studentId, body } = req.body;

    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "Message body is required" });
    }
    if (!teacherId) {
      return res.status(400).json({ success: false, message: "Please select a teacher" });
    }
    if (!isLinkedChild(parent, studentId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const message = await Message.create({
      parent:  parent._id,
      teacher: teacherId,
      student: studentId,
      body:    body.trim(),
      sentBy:  "parent",
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error("sendMessage:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/parent-dashboard/child/:childId/payment
export const makePayment = async (req, res) => {
  try {
    const parent = await getParentDoc(req);
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const { childId } = req.params;

    if (!isLinkedChild(parent, childId)) {
      return res.status(403).json({ success: false, message: "Access denied: child not linked to your account" });
    }

    const child = await Student.findById(childId).lean();
    if (!child) return res.status(404).json({ success: false, message: "Student not found" });

    const { amount, method, reference, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }
    if (!method) {
      return res.status(400).json({ success: false, message: "Payment method is required" });
    }
    if (!reference?.trim()) {
      return res.status(400).json({ success: false, message: "Reference number is required" });
    }

    // Prevent duplicate reference for same student
    const duplicate = await Payment.findOne({
      student:   child._id,
      reference: reference.trim(),
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `A payment with reference "${reference}" already exists for this student`,
      });
    }

    const payment = await Payment.create({
      student:     child._id,
      studentName: `${child.firstName} ${child.lastName}`,
      admNo:       child.admissionNo,
      amount:      Number(amount),
      method,
      reference:   reference.trim(),
      notes:       notes?.trim() ?? "",
      date:        new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        _id:       payment._id,
        amount:    payment.amount,
        method:    payment.method,
        reference: payment.reference,
        receipt:   payment.receipt,
        date:      payment.date,
      },
    });
  } catch (err) {
    console.error("makePayment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
