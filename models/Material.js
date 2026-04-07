import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    subject:     { type: String, default: "", trim: true },
    class:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // ref changed to "User" so both teachers and admins can upload
    uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Original filename shown in the UI (e.g. "Chapter 3 Notes.pdf")
    fileName:       { type: String, required: true },

    // Cloudinary public_id — used for deletion
    storedFileName: { type: String, required: true },

    fileType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },

    // Permanent Cloudinary URL — used for download
    fileUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Material", materialSchema);