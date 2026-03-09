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
import studentFinanceRoutes from  "./routes/studentFinanceRoutes.js";



dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({
  origin: [process.env.CLIENT_URL, "http://localhost:8080", "http://localhost:5173"],
  credentials: true,
}));

app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "API is running ✅" });
});
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/classes", classesRouter);
app.use("/api/content", contentRouter);  // ← fixed (was /api/contentRouter)
app.use("/api/finance", financeRoutes);
app.use("/api/student-auth",  studentAuthRoutes);
app.use("/api/student-dashboard",   studentDashboardRoutes);
app.use("/api/admin-dashboard",   adminDashboardRoutes);
app.use("/api/teacher-dashboard",   teacherDashboardRoutes);
app.use("/api/parent-dashboard",  parentDashboardRoutes);
app.use("/api/student-finance",  studentFinanceRoutes);


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error("DB connection error:", err));
