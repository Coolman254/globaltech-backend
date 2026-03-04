import Student from "../models/Student.js";
import { Payment, FeeStructure } from "../models/Finance.js";

// GET /api/student-finance
export const getStudentFinance = async (req, res) => {
  try {
    // Student JWT stores the Student._id directly (student-auth flow)
    const student = await Student.findById(req.user.id).lean();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // Compute total fees from FeeStructure for student's class + current year
    const currentYear = String(new Date().getFullYear());
    const structures  = await FeeStructure.find({ class: student.class, year: currentYear }).lean();

    const totalFees = structures.reduce((sum, s) => {
      return sum + (s.tuition ?? 0) + (s.boarding ?? 0) + (s.activity ?? 0) + (s.other ?? 0);
    }, 0);

    // All payments for this student
    const payments   = await Payment.find({ student: student._id }).sort({ date: -1 }).lean();
    const amountPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    const balance   = totalFees - amountPaid;
    const feeStatus =
      totalFees === 0  ? "cleared"
      : balance <= 0   ? "cleared"
      : amountPaid > 0 ? "partial"
      : "pending";

    const progressPercentage = totalFees > 0
      ? Math.min(100, Math.round((amountPaid / totalFees) * 100))
      : 100;

    res.json({
      success: true,
      data: {
        student: {
          _id:         student._id,
          fullName:    `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo,
          class:       student.class,
        },
        finance: {
          totalFees,
          amountPaid,
          balance,
          feeStatus,
          progressPercentage,
        },
        recentPayments: payments.slice(0, 20).map((p) => ({
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
