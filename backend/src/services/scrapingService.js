import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Put your Gemini API key directly here

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyze text using Gemini directly
 */
async function analyzeTextWithGemini(content) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a misinformation detection AI.
      Analyze the following article text and determine if it contains misinformation.
      Respond ONLY in the following JSON format:
      {
        "verdict": "MISINFO" | "ACCURATE",
        "reason": "Brief explanation"
      }

      Article Content:
      "${content}"
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Clean up Gemini response
    responseText = responseText.replace(/```json/gi, "").replace(/```/g, "");

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      verdict: "ERROR",
      reason: "Gemini analysis failed",
    };
  }
}

export const analyzeArticle = async (url) => {
  let html = "";

  try {
    const { data } = await axios.get(url);
    html = data;
  } catch {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    html = await page.content();
    await browser.close();
  }

  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  console.log("DEBUG: Extracted Text Length:", text.length);

  const geminiResult = await analyzeTextWithGemini(text);
  console.log("DEBUG: Gemini Raw Response:", geminiResult);

  const verdict = geminiResult?.verdict?.trim().toUpperCase();
  console.log("DEBUG: Final Verdict:", verdict);

  const textMisinfo = verdict === "MISINFO";
  const textAccurate = verdict === "ACCURATE";

  const result = {
    textMisinfo,
    textAccurate,
    textPlace: "Article text",
    textReason: geminiResult.reason || "No explanation provided",
    videoResults: [],
    audioResults: [],
    imageResults: [],
  };

  console.log("DEBUG: analyzeArticle Final Result:", result);
  return result;
};
