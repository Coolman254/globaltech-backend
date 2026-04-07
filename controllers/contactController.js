import Contact from "../models/Contact.js";

// POST /api/contact  — public, no auth required
export const submitContact = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email and message are required.",
      });
    }

    const contact = await Contact.create({
      firstName, lastName, email,
      phone:   phone   || "",
      subject: subject || "other",
      message,
    });

    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    console.error("submitContact:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/contact  — admin only
export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/contact/:id/read  — mark as read, admin only
export const markRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/contact/:id  — admin only
export const deleteContact = async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
