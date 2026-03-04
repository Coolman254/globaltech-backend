import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true },
    body:     { type: String, trim: true },
    audience: { type: String, enum: ["all", "students", "parents", "teachers"], default: "all" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
