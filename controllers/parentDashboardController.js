import Parent from "../models/Parent.js";
import Student from "../models/Student.js";
import Grade from "../models/Grade.js";
import Announcement from "../models/Announcement.js";
import { Payment, FeeStructure } from "../models/Finance.js";

// ── Look up Parent by email from JWT ─────────────────────────────────────────
const getParentDoc = async (req) => {
  const email = req.user?.email;
  if (!email) return null;
  return Parent.findOne({ email: email.toLowerCase() });
};

// ── Fee helper: compute totals from FeeStructure + Payment records ────────────
const getStudentFeeInfo = async (student) => {
  const currentYear = String(new Date().getFullYear());
  const structures  = await FeeStructure.find({ class: student.class, year: currentYear }).lean();

  // Sum all terms' fee structures for this class
  const totalFees = structures.reduce((sum, s) => {
    return sum + (s.tuition ?? 0) + (s.boarding ?? 0) + (s.activity ?? 0) + (s.other ?? 0);
  }, 0);

  // Sum all payments made by this student
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
          .sort({ date: -1 })
          .limit(5)
          .lean();

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

    const isLinked = parent.linkedStudents.some(id => id.toString() === childId);
    if (!isLinked) {
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

    const isLinked = parent.linkedStudents.some(id => id.toString() === childId);
    if (!isLinked) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const grades = await Grade.find({ student: childId }).sort({ date: -1 }).limit(30).lean();
    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
