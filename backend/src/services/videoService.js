import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { franc } from "franc";

import { transcribeAudioVideo } from "./transcriptionLib.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const callGeminiWithRetry = async (prompt, retries = 3) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response?.text?.() || "";
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (error) {
      console.error(
        `Gemini API error (attempt ${attempt}):`,
        error.message || error
      );
      if ((error.status === 503 || error.status === 429) && attempt < retries) {
        await new Promise((res) => setTimeout(res, 2000 * attempt));
      } else {
        throw error;
      }
    }
  }
};

const truncateTranscript = (text, maxLength = 15000) =>
  text.length > maxLength ? text.slice(0, maxLength) : text;

const isYouTubeURL = (url) => /(?:youtube\.com|youtu\.be)/.test(url);

export const analyzeContent = async ({ url }) => {
  let transcriptText;
  try {
    if (isYouTubeURL(url)) {
      // YouTube: fetch transcript from FastAPI
      console.log("DEBUG: Fetching YouTube transcript from FastAPI...");
      const response = await axios.post(
        "https://misinfo-detection.onrender.com/transcript/video",
        { url }
      );
      transcriptText = response.data.transcript;
      if (!transcriptText)
        throw new Error("Transcript not returned from FastAPI");
    } else {
      // Non-YouTube: audio/video transcription
      console.log("DEBUG: Transcribing audio/video...");
      transcriptText = await transcribeAudioVideo(url);
    }

    transcriptText = truncateTranscript(transcriptText);

    // Language detection
    const langCode = franc(transcriptText, { minLength: 10 });
    console.log("DEBUG: Detected language code:", langCode);

    // Gemini prompt
    const prompt = `
You are an AI misinformation detection system.
Analyze the following transcript and determine if it contains misinformation.
Provide a short summary, a verdict, reasons for the verdict, and correct information if any misinformation is found.

Transcript:
${transcriptText}

Return JSON strictly in this format:
{
  "summary": "...",
  "verdict": "MISINFO DETECTED" or "INFO IS CORRECT",
  "reasons": ["..."],
  "correctInfo": ["..."]
}`;

    console.log("DEBUG: Sending transcript to Gemini...");
    const geminiRaw = await callGeminiWithRetry(prompt);
    console.log("DEBUG: Raw Gemini response:", geminiRaw);

    // ---------------------------
    // Parse Gemini JSON response
    // ---------------------------
    let geminiResponse;
    try {
      const clean = geminiRaw.replace(/```json|```/g, "").trim();
      geminiResponse = JSON.parse(clean);
    } catch (error) {
      console.error("DEBUG: Failed to parse Gemini response:", error.message);
      geminiResponse = {
        summary: "Not available",
        verdict: "INFO IS CORRECT",
        reasons: ["Gemini response could not be parsed"],
        correctInfo: [],
      };
    }

    const verdictNormalized = geminiResponse.verdict?.trim().toUpperCase();

    const result = {
      videoMisinfo: verdictNormalized === "MISINFO DETECTED",
      videoAccurate: verdictNormalized === "INFO IS CORRECT",
      videoPlace: "video",
      videoReason:
        geminiResponse.reasons?.join(", ") || "No explanation provided",
      videoSummary: geminiResponse.summary || "No summary provided",
    };

    console.log("DEBUG: analyzeContent Final Result:", result);
    return result;
  } catch (error) {
    console.error("Error in analyzeContent:", error.message);
    return {
      videoMisinfo: false,
      videoAccurate: false,
      videoPlace: "video",
      videoReason: error.message,
      videoSummary: "Error occurred",
    };
  }
};
