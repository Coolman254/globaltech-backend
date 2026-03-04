import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

    // ── Include email in token so dashboard controllers can look up profiles ──
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

// GET /api/auth/users  (admin only — list all user accounts)
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.status(200).json({ data: users });
  } catch (error) {
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

    // Assign plain text — User model's pre-save hook will hash it automatically
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
    // Prevent admin from deleting themselves
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
