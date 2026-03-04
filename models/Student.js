import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const studentSchema = new mongoose.Schema(
  {
    firstName:   { type: String, required: true, trim: true },
    lastName:    { type: String, required: true, trim: true },
    gender:      { type: String, enum: ["Male", "Female", "Other"], required: true },
    age:         { type: Number, required: true },
    email:       { type: String, lowercase: true, trim: true, default: null },
    admissionNo: { type: Number, required: true, unique: true },
    class:       { type: String, required: true },
    subjects:    { type: String, default: null },
    parentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Parent", default: null },
    parentName:  { type: String, default: null },
    parentPhone: { type: String, default: null },
    parentEmail: { type: String, default: null },

    // ── Added: student portal login ──────────────────────────────────────────
    password: {
      type: String,
      default: null,
      select: false,   // never returned in queries unless explicitly requested
    },

    // ── Added: finance fields (used by financeController) ────────────────────
    totalFees:  { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Virtual: fullName
studentSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
studentSchema.set("toJSON",   { virtuals: true });
studentSchema.set("toObject", { virtuals: true });

// Auto-hash password on save
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method: verify password
studentSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("Student", studentSchema);
