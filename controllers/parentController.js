import Parent from "../models/Parent.js";
import Student from "../models/Student.js";

// POST /api/parents — Create a new parent
export const createParent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      age,
      email,
      phone,
      nationalId,
      relationship,
      notificationMethod,
      linkedStudents,
    } = req.body;

    if (!firstName || !lastName || !gender || !age || !nationalId || !relationship) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    // Check if national ID already exists
    const existing = await Parent.findOne({ nationalId });
    if (existing) {
      return res.status(409).json({ message: "A parent with this National ID already exists." });
    }

    const parent = await Parent.create({
      firstName,
      lastName,
      gender,
      age,
      email: email || null,
      phone: phone || null,
      nationalId,
      relationship,
      notificationMethod: notificationMethod || "app",
      linkedStudents: linkedStudents || [],
    });

    // Update each linked student's parentId field
    if (linkedStudents && linkedStudents.length > 0) {
      await Student.updateMany(
        { _id: { $in: linkedStudents } },
        { parentId: parent._id }
      );
    }

    res.status(201).json({ message: "Parent registered successfully.", parent });
  } catch (error) {
    console.error("Create parent error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// GET /api/parents — Get all parents
export const getParents = async (req, res) => {
  try {
    const parents = await Parent.find().populate("linkedStudents", "firstName lastName admissionNo").sort({ createdAt: -1 });
    res.status(200).json(parents);
  } catch (error) {
    console.error("Get parents error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/parents/:id — Get single parent
export const getParentById = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id).populate("linkedStudents", "firstName lastName admissionNo");
    if (!parent) return res.status(404).json({ message: "Parent not found." });
    res.status(200).json(parent);
  } catch (error) {
    console.error("Get parent error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// PUT /api/parents/:id — Update parent
export const updateParent = async (req, res) => {
  try {
    const parent = await Parent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!parent) return res.status(404).json({ message: "Parent not found." });
    res.status(200).json({ message: "Parent updated successfully.", parent });
  } catch (error) {
    console.error("Update parent error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// DELETE /api/parents/:id — Delete parent
export const deleteParent = async (req, res) => {
  try {
    const parent = await Parent.findByIdAndDelete(req.params.id);
    if (!parent) return res.status(404).json({ message: "Parent not found." });
    res.status(200).json({ message: "Parent deleted successfully." });
  } catch (error) {
    console.error("Delete parent error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
