import dotenv from "dotenv";
dotenv.config(); // MUST BE FIRST

import express from "express";
import cors from "cors";
import connectDB from "./src/config/db.js";
import misinfoRoutes from "./src/routes/misinfoRoutes.js";

console.log("DEBUG: Starting server...");

// Check if key loaded
console.log("DEBUG OPENAI KEY:", process.env.OPENAI_API_KEY || "NOT FOUND");

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Log every request
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

app.use("/api/gemini", misinfoRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
