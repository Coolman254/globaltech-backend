import mongoose from "mongoose";

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

// ── Auto-derive letter grade from score ───────────────────────────────────────
// Use "validate" instead of "save" so it works with both
// Grade.create() and new Grade().save()
gradeSchema.pre("validate", function (next) {
  if (!this.grade) {
    const s = this.score;
    if      (s >= 90) this.grade = "A";
    else if (s >= 80) this.grade = "A-";
    else if (s >= 75) this.grade = "B+";
    else if (s >= 70) this.grade = "B";
    else if (s >= 65) this.grade = "B-";
    else if (s >= 60) this.grade = "C+";
    else if (s >= 55) this.grade = "C";
    else if (s >= 50) this.grade = "C-";
    else if (s >= 45) this.grade = "D+";
    else if (s >= 40) this.grade = "D";
    else              this.grade = "E";
  }
  next();
});

export default mongoose.models.Grade || mongoose.model("Grade", gradeSchema);
