import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title:        { type: String, required: [true, "Title is required"], trim: true },
    type:         { type: String, enum: ["PDF", "Video", "Image"], required: true },
    subject:      { type: String, required: true, trim: true },
    grade:        { type: String, required: true, trim: true },
    teacher:      { type: String, required: true, trim: true },
    size:         { type: String },
    downloads:    { type: Number, default: 0 },
    status:       { type: String, enum: ["Published", "Draft", "Review"], default: "Published" },
    filename:     { type: String, required: true },
    originalName: { type: String },
    mimetype:     { type: String },
    path:         { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Content", contentSchema);
