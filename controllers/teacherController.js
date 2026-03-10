import Teacher from "../models/Teacher.js";
import User from "../models/User.js";

// POST /api/teachers
export const createTeacher = async (req, res) => {
  try {
    const {
      firstName, lastName, gender, age, email, phone,
      teacherId, subject, salaryKsh, employmentType, classesAssigned,
      password,
    } = req.body;

    if (!firstName || !lastName || !gender || !age || !email || !teacherId || !subject || !salaryKsh || !password) {
      return res.status(400).json({ message: "Please fill in all required fields including email and password." });
    }

    // Check duplicate teacherId
    const existingById = await Teacher.findOne({ teacherId });
    if (existingById) {
      return res.status(409).json({ message: "A teacher with this employee number already exists." });
    }

    // Check duplicate email in Teacher collection
    const existingByEmail = await Teacher.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      return res.status(409).json({ message: "A teacher with this email already exists." });
    }

    // Check duplicate email in User collection
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "A login account with this email already exists." });
    }

    // Create login account (password hashed automatically via User pre-save hook)
    await User.create({
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      password,
      role: "teacher",
    });

    // Create teacher profile
    const teacher = await Teacher.create({
      firstName,
      lastName,
      gender,
      age,
      email: email.toLowerCase(),
      phone: phone || null,
      teacherId,
      subject,
      salaryKsh,
      employmentType: employmentType || "fulltime",
      classesAssigned: classesAssigned || null,
    });

    res.status(201).json({ message: "Teacher registered successfully.", teacher });
  } catch (error) {
    console.error("Create teacher error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// GET /api/teachers
export const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.status(200).json(teachers);
  } catch (error) {
    console.error("Get teachers error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/teachers/:id
export const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    res.status(200).json(teacher);
  } catch (error) {
    console.error("Get teacher error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// PUT /api/teachers/:id
export const updateTeacher = async (req, res) => {
  try {
    // If email is being changed, check it's not taken
    if (req.body.email) {
      const existing = await Teacher.findOne({
        email: req.body.email.toLowerCase(),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({ message: "This email is already used by another teacher." });
      }
    }

    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    res.status(200).json({ message: "Teacher updated successfully.", teacher });
  } catch (error) {
    console.error("Update teacher error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// DELETE /api/teachers/:id
export const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    res.status(200).json({ message: "Teacher deleted successfully." });
  } catch (error) {
    console.error("Delete teacher error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
