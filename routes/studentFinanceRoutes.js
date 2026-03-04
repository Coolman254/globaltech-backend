import express from "express";
import { getStudentFinance } from "../controllers/studentFinanceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getStudentFinance);

export default router;
