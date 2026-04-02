import mongoose from "mongoose";

// ── Payment Schema ─────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema(
  {
    student: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Student",
      required: [true, "Student reference is required"],
    },
    studentName: { type: String, required: true },
    admNo:       { type: String, required: true, uppercase: true },
    amount: {
      type:     Number,
      required: [true, "Amount is required"],
      min:      [1, "Amount must be greater than 0"],
    },
    method: {
      type:     String,
      required: [true, "Payment method is required"],
      // ✅ FIXED: enum matches all normalised values from the controller
      enum: ["M-Pesa", "Bank Transfer", "Cash", "Cheque"],
    },
    reference: { type: String, required: true, trim: true },
    date:      { type: Date,   required: true, default: Date.now },
    receipt:   { type: String, unique: true },
    notes:     { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// ✅ FIXED: removed `next` parameter from async pre-save hook.
// With async functions Mongoose does NOT pass next() — just return the promise.
paymentSchema.pre("save", async function () {
  if (!this.receipt) {
    const count = await mongoose.model("Payment").countDocuments();
    this.receipt = `RCP${String(count + 1).padStart(4, "0")}`;
  }
});

// ── Fee Structure Schema ───────────────────────────────────────────────────────
const feeStructureSchema = new mongoose.Schema(
  {
    class:    { type: String, required: true },
    term:     { type: String, required: true, enum: ["Term 1", "Term 2", "Term 3"] },
    year:     { type: String, required: true },
    tuition:  { type: Number, required: true, min: 0 },
    boarding: { type: Number, required: true, min: 0 },
    activity: { type: Number, required: true, min: 0 },
    other:    { type: Number, default: 0,    min: 0 },
  },
  { timestamps: true }
);

// Virtual: total
feeStructureSchema.virtual("total").get(function () {
  return this.tuition + this.boarding + this.activity + (this.other || 0);
});

// One fee structure per class+term+year
feeStructureSchema.index({ class: 1, term: 1, year: 1 }, { unique: true });
feeStructureSchema.set("toJSON",   { virtuals: true });
feeStructureSchema.set("toObject", { virtuals: true });

export const Payment      = mongoose.model("Payment",      paymentSchema);
export const FeeStructure = mongoose.model("FeeStructure", feeStructureSchema);