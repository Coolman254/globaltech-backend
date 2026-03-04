import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title:       { type: String, required: [true, "Title is required"], trim: true },
    type:        { type: String, enum: ["PDF", "Video", "Image"], required: true },
    subject:     { type: String, required: true, trim: true },
    grade:       { type: String, required: true, trim: true },
    teacher:     { type: String, required: true, trim: true },
    size:        { type: String },           // e.g. "2.4 MB"
    downloads:   { type: Number, default: 0 },
    status:      { type: String, enum: ["Published", "Draft", "Review"], default: "Published" },
    filename:    { type: String, required: true },   // stored filename on disk
    originalName:{ type: String },                   // original upload name
    mimetype:    { type: String },
    path:        { type: String, required: true },   // full path on disk
  },
  { timestamps: true }
);

const Content = mongoose.model("Content", contentSchema);
export default Content;
