import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true, trim: true },
    subject:    { type: String, required: true, trim: true },
    class:      { type: String, required: true },         // targets a class e.g. "Grade 8"
    dueDate:    { type: Date, required: true },
    description:{ type: String, trim: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    term:       { type: String, enum: ["Term 1", "Term 2", "Term 3"] },
    year:       { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Assignment", assignmentSchema);
