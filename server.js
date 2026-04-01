import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import parentRoutes from "./routes/parentRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import classesRouter from "./routes/classes.js";
import contentRouter from "./routes/content.js";
import financeRoutes from "./routes/financeRoutes.js";
import studentAuthRoutes from "./routes/studentAuthRoutes.js";
import studentDashboardRoutes from "./routes/studentDashboardRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import teacherDashboardRoutes from "./routes/teacherDashboardRoutes.js";
import parentDashboardRoutes from "./routes/parentDashboardRoutes.js";
import studentFinanceRoutes from "./routes/studentFinanceRoutes.js";

dotenv.config();

// ── Guard required environment variables ─────────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── ESM-safe __dirname ────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const app  = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:8080",
    "http://localhost:5173",
    "https://frolicking-sherbet-aee998.netlify.app",
  ],
  credentials: true,
  exposedHeaders: ["Content-Type", "Content-Disposition", "Content-Length"],
}));
app.use(express.json());

// ── Static uploads ────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ message: "API is running ✅" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",               authRoutes);
app.use("/api/students",           studentRoutes);
app.use("/api/parents",            parentRoutes);
app.use("/api/teachers",           teacherRoutes);
app.use("/api/classes",            classesRouter);
app.use("/api/content",            contentRouter);
app.use("/api/finance",            financeRoutes);
app.use("/api/student-auth",       studentAuthRoutes);
app.use("/api/student-dashboard",  studentDashboardRoutes);
app.use("/api/admin-dashboard",    adminDashboardRoutes);
app.use("/api/teacher-dashboard",  teacherDashboardRoutes);
app.use("/api/parent-dashboard",   parentDashboardRoutes);
app.use("/api/student-finance",    studentFinanceRoutes);

// ── Database + server start ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("❌ DB connection error:", err.message);
    process.exit(1); // Exit with error so Render shows the real failure reason
  });