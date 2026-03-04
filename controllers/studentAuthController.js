import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Student from "../models/Student.js";

const signToken = (id) =>
  jwt.sign({ id, role: "student" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/student-auth/login
export const studentLogin = async (req, res) => {
  try {
    const { admissionNo, password } = req.body;

    if (!admissionNo || !password) {
      return res.status(400).json({
        success: false,
        message: "Admission number and password are required",
      });
    }

    const student = await Student.findOne({
      admissionNo: Number(admissionNo),
    }).select("+password");

    if (!student || !student.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or account not activated",
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(student._id);

    const studentData = student.toJSON();
    delete studentData.password;

    res.json({ success: true, token, data: studentData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/student-auth/me
export const getMe = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.json({ success: true, data: student.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/student-auth/set-password  (admin only)
export const setStudentPassword = async (req, res) => {
  try {
    const { admissionNo, password } = req.body;

    if (!admissionNo || !password) {
      return res.status(400).json({
        success: false,
        message: "admissionNo and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const student = await Student.findOne({ admissionNo: Number(admissionNo) });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Hash manually and use updateOne — avoids triggering the pre-save hook
    const hashed = await bcrypt.hash(password, 12);
    await Student.updateOne({ _id: student._id }, { $set: { password: hashed } });

    res.json({
      success: true,
      message: `Password set for ${student.firstName} ${student.lastName}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
