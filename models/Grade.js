import mongoose from "mongoose";

// ── Compute letter grade from score ──────────────────────────────────────────
// Called explicitly in the controller instead of using a pre hook
// (pre hooks cause "next is not a function" with Grade.create() in some
//  Mongoose/Node versions)
export function letterGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 45) return "D+";
  if (score >= 40) return "D";
  return "E";
}

const gradeSchema = new mongoose.Schema(
  {
    student:  { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    subject:  { type: String, required: true, trim: true },
    score:    { type: Number, required: true, min: 0, max: 100 },
    grade:    { type: String, trim: true },
    term:     { type: String, required: true, enum: ["Term 1", "Term 2", "Term 3"] },
    year:     { type: String, required: true },
    examType: { type: String, default: "End Term", trim: true },
    date:     { type: Date,   default: Date.now },
    remarks:  { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Grade || mongoose.model("Grade", gradeSchema);
