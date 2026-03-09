import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    parent:  { type: mongoose.Schema.Types.ObjectId, ref: "Parent",  required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    body:    { type: String, required: true, trim: true },
    sentBy:  { type: String, enum: ["parent", "teacher"], required: true },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ parent: 1, createdAt: -1 });
messageSchema.index({ teacher: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
