import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    student:    { type: mongoose.Schema.Types.ObjectId, ref: "Student",    required: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    class:      { type: String, required: true },
    subject:    { type: String, required: true },
    answer:     { type: String, default: "" },

    // Optional attached file
    file: {
      fileName:       { type: String },
      storedFileName: { type: String },
      fileType:       { type: String },
      fileSize:       { type: Number },
      filePath:       { type: String },
    },

    // Teacher fills these in when marking
    marks:    { type: Number,  default: null },
    feedback: { type: String,  default: "" },
    marked:   { type: Boolean, default: false },

    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One submission per student per assignment — enforced at DB level
submissionSchema.index({ student: 1, assignment: 1 }, { unique: true });

export default mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
