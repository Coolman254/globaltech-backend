import Student from "../models/Student.js";

// POST /api/students — Create a new student
export const createStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      age,
      email,
      admissionNo,
      class: studentClass,
      subjects,
      parentId,
      parentName,
      parentPhone,
      parentEmail,
      totalFees,
      amountPaid,
    } = req.body;

    if (!firstName || !lastName || !gender || !age || !admissionNo || !studentClass) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const existing = await Student.findOne({ admissionNo });
    if (existing) {
      return res.status(409).json({ message: "A student with this admission number already exists." });
    }

    const student = await Student.create({
      firstName,
      lastName,
      gender,
      age,
      email:       email       || null,
      admissionNo,
      class:       studentClass,
      subjects:    subjects    || null,
      parentId:    parentId    || null,
      parentName:  parentName  || null,
      parentPhone: parentPhone || null,
      parentEmail: parentEmail || null,
      totalFees:   totalFees   || 0,
      amountPaid:  amountPaid  || 0,
    });

    res.status(201).json({ message: "Student registered successfully.", student });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// GET /api/students — Get all students
export const getStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("parentId", "firstName lastName phone")
      .sort({ createdAt: -1 });
    res.status(200).json(students);
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/students/:id — Get single student
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate("parentId", "firstName lastName phone");
    if (!student) return res.status(404).json({ message: "Student not found." });
    res.status(200).json(student);
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// PUT /api/students/:id — Update student
export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new:           true,
      runValidators: true,
    });
    if (!student) return res.status(404).json({ message: "Student not found." });
    res.status(200).json({ message: "Student updated successfully.", student });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// DELETE /api/students/:id — Delete student
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });
    res.status(200).json({ message: "Student deleted successfully." });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ message: "Server error." });
  }
};