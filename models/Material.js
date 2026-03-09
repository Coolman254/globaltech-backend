import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    title:          { type: String, required: true, trim: true },
    subject:        { type: String, required: true, trim: true },
    class:          { type: String, required: true, trim: true },
    description:    { type: String, default: "" },

    uploadedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },

    fileName:       { type: String, required: true },
    storedFileName: { type: String, required: true },
    fileType:       { type: String, required: true },
    fileSize:       { type: Number, required: true },
    fileUrl:        { type: String, default: "" },
  },
  { timestamps: true },
);

materialSchema.index({ class: 1, createdAt: -1 });

export default mongoose.models.Material || mongoose.model("Material", materialSchema);
