import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Student from "../models/Student.js";

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase(), role });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials or role mismatch." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials or role mismatch." });
    }

    const token = generateToken({ id: user._id, role: user.role, email: user.email });

    res.status(200).json({
      token,
      role: user.role,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// POST /api/auth/register  (admin-only user creation flow)
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const user = await User.create({ name, email, password, role });

    const token = generateToken({ id: user._id, role: user.role, email: user.email });

    res.status(201).json({
      token,
      role: user.role,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/auth/users  (admin only — list ALL system users including students)
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;

    // ── Fetch User accounts (admin, teacher, parent) ──────────────────────────
    const userFilter = role && role !== "student" ? { role } : role ? {} : {};
    const users = await User.find(
      role && role !== "student" ? { role } : {}
    ).select("-password").sort({ createdAt: -1 });

    // Shape User accounts into a common format
    const userEntries = users.map((u) => ({
      _id:       u._id,
      name:      u.name,
      email:     u.email,
      role:      u.role,
      createdAt: u.createdAt,
      // flag so frontend knows this is a User account (can reset password)
      isUserAccount: true,
    }));

    // ── Fetch Students (they use student-auth, not User collection) ───────────
    let studentEntries = [];
    if (!role || role === "student") {
      const students = await Student.find({}).select("firstName lastName admissionNo email class createdAt").sort({ createdAt: -1 });
      studentEntries = students.map((s) => ({
        _id:         s._id,
        name:        `${s.firstName} ${s.lastName}`,
        email:       s.email || `Adm: ${s.admissionNo}`,
        role:        "student",
        admissionNo: s.admissionNo,
        class:       s.class,
        createdAt:   s.createdAt,
        // flag so frontend knows this needs student-auth password reset
        isUserAccount: false,
      }));
    }

    // ── Merge and sort by createdAt ───────────────────────────────────────────
    const all = [...userEntries, ...studentEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.status(200).json({ data: all });
  } catch (error) {
    console.error("getUsers error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/auth/users/:id/password  (admin only — reset any user's password)
export const resetUserPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password = password;
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

// DELETE /api/auth/users/:id  (admin only — delete a user account)
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ message: "User account deleted." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};