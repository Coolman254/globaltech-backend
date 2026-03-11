import mongoose from "mongoose";

const parentSchema = new mongoose.Schema(
  {
    firstName:    { type: String, required: true, trim: true },
    lastName:     { type: String, required: true, trim: true },
    gender:       { type: String, enum: ["Male", "Female", "Other"], required: true },
    age:          { type: Number, required: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:        { type: String, default: null },
    nationalId:   { type: Number, required: true, unique: true },
    relationship: { type: String, required: true },
    notificationMethod: {
      type:    String,
      enum:    ["app", "sms", "email"],
      default: "app",
    },
    // Array of Student ObjectIds linked to this parent
    linkedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  },
  { timestamps: true }
);

// Virtual: fullName
parentSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

parentSchema.set("toJSON",   { virtuals: true });
parentSchema.set("toObject", { virtuals: true });

export default mongoose.model("Parent", parentSchema);
