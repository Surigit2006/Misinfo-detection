import express from "express";
import { checkMisinfo } from "../controllers/misinfoController.js";

const router = express.Router();

// Debug route check
router.use((req, res, next) => {
  console.log("DEBUG: misinfoRoutes accessed");
  next();
});

router.post(
  "/check",
  (req, res, next) => {
    console.log("DEBUG: /check route hit");
    next();
  },
  checkMisinfo
);

export default router;
