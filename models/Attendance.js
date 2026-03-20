import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Student",
      required: true,
    },
    class: {
      type:     String,
      required: true,
      trim:     true,
    },
    date: {
      type:     Date,
      required: true,
    },
    status: {
      type:     String,
      enum:     ["present", "absent", "late"],
      required: true,
    },
    markedBy: {
      // Teacher _id who marked this record
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Teacher",
    },
    remarks: {
      type:    String,
      trim:    true,
      default: "",
    },
  },
  { timestamps: true }
);

// One record per student per date — prevents duplicates
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Fast queries by class + date (teacher marking) and by student (parent/student view)
attendanceSchema.index({ class: 1, date: -1 });
attendanceSchema.index({ student: 1, date: -1 });

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);
