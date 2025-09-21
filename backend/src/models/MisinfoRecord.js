import mongoose from "mongoose";

const misinfoSchema = new mongoose.Schema({
  type: { type: String, required: true }, // article, video, audio, image
  originalInput: { type: String },
  processedData: { type: Object },
  geminiResult: { type: Object },
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("MisinfoRecord", misinfoSchema);
