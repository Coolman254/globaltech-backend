import Student from "../models/Student.js";
import { Payment, FeeStructure } from "../models/Finance.js";

// ── Helper: derive balance and status from a student object ───────────────────
const deriveFields = (s) => ({
  ...s,
  balance: Math.max(0, (s.totalFees || 0) - (s.amountPaid || 0)),
  status:
    (s.amountPaid || 0) >= (s.totalFees || 0) ? "cleared"
    : (s.amountPaid || 0) > 0 ? "partial"
    : "pending",
});

// ═══════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════

export const getStats = async (req, res) => {
  try {
    const { term, year } = req.query;
    const filter = {};
    if (term && term !== "all") filter.term = term;
    if (year && year !== "all") filter.year = year;

    const students = await Student.find(filter);
    const derived  = students.map((s) => deriveFields(s.toJSON ? s.toJSON() : s));

    res.json({
      success: true,
      data: {
        totalExpected:  derived.reduce((a, s) => a + (s.totalFees  || 0), 0),
        totalCollected: derived.reduce((a, s) => a + (s.amountPaid || 0), 0),
        totalBalance:   derived.reduce((a, s) => a + s.balance, 0),
        cleared: derived.filter((s) => s.status === "cleared").length,
        partial: derived.filter((s) => s.status === "partial").length,
        pending: derived.filter((s) => s.status === "pending").length,
        total:   derived.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════

export const getStudents = async (req, res) => {
  try {
    const { search, class: cls, status, term, year } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { admNo: { $regex: search, $options: "i" } },
      ];
    }
    if (cls  && cls  !== "all") filter.class = cls;
    if (term && term !== "all") filter.term  = term;
    if (year && year !== "all") filter.year  = year;

    const students = await Student.find(filter).sort({ createdAt: -1 });
    let result = students
      .map((s) => s.toJSON ? s.toJSON() : s)
      .map(deriveFields);

    // Status is a derived virtual so filter it here after deriving
    if (status && status !== "all") {
      result = result.filter((s) => s.status === status);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const payments = await Payment.find({ student: student._id }).sort({ date: -1 });
    const s = deriveFields(student.toJSON ? student.toJSON() : student);

    res.json({ success: true, data: { ...s, payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════

export const getPayments = async (req, res) => {
  try {
    const { studentId, admNo, method, dateFrom, dateTo } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (admNo)     filter.admNo   = { $regex: admNo, $options: "i" };
    if (method)    filter.method  = method;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo)   filter.date.$lte = new Date(dateTo);
    }

    const payments = await Payment.find(filter).sort({ date: -1 });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { admNo, amount, method, reference, date, notes } = req.body;

    if (!admNo || !amount || !method || !reference || !date) {
      return res.status(400).json({
        success: false,
        message: "admNo, amount, method, reference and date are required",
      });
    }

    const student = await Student.findOne({ admNo: admNo.toUpperCase() });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `No student found with admission number ${admNo}`,
      });
    }

    const payment = await Payment.create({
      student:     student._id,
      studentName: student.name,
      admNo:       student.admNo,
      amount:      Number(amount),
      method,
      reference,
      date:        new Date(date),
      notes,
    });

    // Update student's amountPaid, capped at totalFees
    const newAmountPaid = Math.min(
      (student.amountPaid || 0) + Number(amount),
      student.totalFees || Infinity
    );
    await Student.findByIdAndUpdate(student._id, { amountPaid: newAmountPaid });

    res.status(201).json({
      success: true,
      message: `Payment of KSH ${Number(amount).toLocaleString()} recorded. Receipt: ${payment.receipt}`,
      data: { payment, studentId: student._id },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reversePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // Deduct reversed amount from student — floor at 0
    const student = await Student.findById(payment.student);
    const newAmountPaid = Math.max(0, (student?.amountPaid || 0) - payment.amount);
    await Student.findByIdAndUpdate(payment.student, { amountPaid: newAmountPaid });

    await payment.deleteOne();
    res.json({ success: true, message: "Payment reversed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// FEE STRUCTURES
// ═══════════════════════════════════════════════════════

export const getFeeStructures = async (req, res) => {
  try {
    const { class: cls, term, year } = req.query;
    const filter = {};
    if (cls  && cls  !== "all") filter.class = cls;
    if (term && term !== "all") filter.term  = term;
    if (year && year !== "all") filter.year  = year;

    const structures = await FeeStructure.find(filter).sort({ class: 1, term: 1 });
    res.json({ success: true, data: structures.map((s) => s.toJSON()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createFeeStructure = async (req, res) => {
  try {
    const { class: cls, term, year } = req.body;
    const existing = await FeeStructure.findOne({ class: cls, term, year });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Fee structure for ${cls}, ${term} ${year} already exists`,
      });
    }
    const structure = await FeeStructure.create(req.body);
    res.status(201).json({ success: true, data: structure.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFeeStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!structure) {
      return res.status(404).json({ success: false, message: "Fee structure not found" });
    }
    res.json({ success: true, data: structure.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteFeeStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findByIdAndDelete(req.params.id);
    if (!structure) {
      return res.status(404).json({ success: false, message: "Fee structure not found" });
    }
    res.json({ success: true, message: "Fee structure deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
