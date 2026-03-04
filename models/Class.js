import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    stream: {
      type: String,
      required: [true, "Stream is required"],
      trim: true,
    },
    students: {
      type: Number,
      default: 0,
      min: 0,
    },
    classTeacher: {
      type: String,
      required: [true, "Class teacher is required"],
      trim: true,
    },
    subjects: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

const Class = mongoose.model("Class", classSchema);
export default Class;
