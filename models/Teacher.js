import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    firstName:       { type: String, required: true, trim: true },
    lastName:        { type: String, required: true, trim: true },
    gender:          { type: String, enum: ["Male", "Female", "Other"], required: true },
    age:             { type: Number, required: true },
    // email is required + unique so dashboard can look up teacher from JWT email
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:           { type: String, default: null },
    teacherId:       { type: Number, required: true, unique: true },
    subject:         { type: String, required: true },
    salaryKsh:       { type: Number, required: true },
    employmentType:  { type: String, enum: ["fulltime", "parttime"], default: "fulltime" },
    // Comma-separated class names e.g. "Grade 6, Grade 7"
    classesAssigned: { type: String, default: null },
  },
  { timestamps: true }
);

// Virtual: fullName
teacherSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
teacherSchema.set("toJSON",   { virtuals: true });
teacherSchema.set("toObject", { virtuals: true });

export default mongoose.model("Teacher", teacherSchema);
