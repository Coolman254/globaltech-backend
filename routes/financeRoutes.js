import express from "express";
import {
  getStats,
  getStudents,
  getStudentById,
  getPayments,
  recordPayment,
  reversePayment,
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} from "../controllers/financeController.js";

const router = express.Router();

// Stats
router.get("/stats", getStats);

// Students
router.get("/students",      getStudents);
router.get("/students/:id",  getStudentById);

// Payments
router.get("/payments",        getPayments);
router.post("/payments",       recordPayment);
router.delete("/payments/:id", reversePayment);

// Fee Structures
router.get("/fee-structures",          getFeeStructures);
router.post("/fee-structures",         createFeeStructure);
router.put("/fee-structures/:id",      updateFeeStructure);
router.delete("/fee-structures/:id",   deleteFeeStructure);

export default router;
