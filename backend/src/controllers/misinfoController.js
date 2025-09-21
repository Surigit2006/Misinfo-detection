import MisinfoRecord from "../models/MisinfoRecord.js";
import { analyzeArticle } from "../services/scrapingService.js";
import { analyzeContent } from "../services/videoService.js";

import { analyzeImage } from "../services/imageService.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function isValidURL(str) {
  const urlPattern = /^(https?:\/\/[^\s]+)$/i;
  return urlPattern.test(str);
}

function isVideoPlatformURL(url) {
  if (!url) return false;
  const videoPatterns = [
    /youtube\.com/i,
    /youtu\.be/i,
    /vimeo\.com/i,
    /dailymotion\.com/i,
    /twitch\.tv/i,
    /instagram\.com\/(p|reel|tv)\//i,
    /facebook\.com\/.*\/videos?\//i,
    /fb\.watch/i,
    /twitter\.com\/.*\/status\/\d+/i,
    /x\.com\/.*\/status\/\d+/i,
    /tiktok\.com\/@[\w.-]+\/video\/\d+/i,
  ];
  try {
    const parsedUrl = new URL(url);
    return videoPatterns.some((pattern) => pattern.test(parsedUrl.href));
  } catch {
    return false;
  }
}

function detectInputType(reqBody, reqFile) {
  const { content, url } = reqBody;

  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;
  const audioExtensions = /\.(mp3|wav|ogg|aac|flac|m4a)$/i;
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;

  if (url && isValidURL(url)) {
    const trimmedUrl = url.trim();
    if (isVideoPlatformURL(trimmedUrl)) return "video";
    if (imageExtensions.test(trimmedUrl)) return "image";
    if (audioExtensions.test(trimmedUrl)) return "audio";
    if (videoExtensions.test(trimmedUrl)) return "video";
    return "article";
  }

  if (content && isValidURL(content.trim())) {
    const trimmedContent = content.trim();
    if (isVideoPlatformURL(trimmedContent)) return "video";
    if (imageExtensions.test(trimmedContent)) return "image";
    if (audioExtensions.test(trimmedContent)) return "audio";
    if (videoExtensions.test(trimmedContent)) return "video";
    return "article";
  }

  if (reqFile && reqFile.mimetype) {
    if (reqFile.mimetype.startsWith("video/")) return "video";
    if (reqFile.mimetype.startsWith("audio/")) return "audio";
    if (reqFile.mimetype.startsWith("image/")) return "image";
  }

  if (content) return "text";

  return null;
}
const callGeminiWithRetry = async (prompt, retries = 3) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error.status === 503 && attempt < retries) {
        console.warn(`Gemini overloaded (503). Retrying attempt ${attempt}...`);
        await new Promise((res) => setTimeout(res, 2000 * attempt)); // exponential backoff
      } else {
        throw error;
      }
    }
  }
};

export const analyzeTextWithGemini = async (text) => {
  const prompt = `
You are a misinformation detection system.
Analyze the following text and determine if it is misinformation.
ignore any spelling mistakes.

Text:
${text}

Return JSON strictly in this format (no markdown, no extra words):
{
  "verdict": "MISINFO" or "ACCURATE",
  "place": "where misinformation appears",
  "reason": "why it's misinformation or accurate"
}
`;

  try {
    const responseText = await callGeminiWithRetry(prompt);

    console.log("DEBUG: Gemini Raw Response:", responseText);

    // Clean Markdown formatting if Gemini outputs it
    const cleaned = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    if (err.status === 503) {
      console.error("Gemini overloaded: Service temporarily unavailable.");
      return {
        verdict: "ERROR",
        place: "N/A",
        reason: "Gemini model is currently overloaded. Please try again later.",
      };
    }

    console.error("Gemini text analysis error:", err.message);
    return {
      verdict: "ERROR",
      place: "N/A",
      reason: "Defaulted due to error",
    };
  }
};

export const checkMisinfo = async (req, res) => {
  try {
    console.log("DEBUG: Incoming Request Body ===>", req.body);
    console.log("DEBUG: Incoming File ===>", req.file);

    const { content, url, link } = req.body;
    const detectedType = detectInputType(req.body, req.file);
    console.log("Detected Input Type:", detectedType);

    if (!detectedType)
      return res.status(400).json({
        success: false,
        error:
          "Could not detect input type. Provide text, article URL, image, audio, or video.",
      });

    let results = [];

    // ====== Text Analysis ======
    if (detectedType === "text") {
      console.log("Analyzing text with Gemini...");
      const geminiResult = await analyzeTextWithGemini(content);

      const verdict = geminiResult?.verdict?.trim().toUpperCase();
      console.log("DEBUG: Final Verdict:", verdict);

      if (verdict === "MISINFO") {
        results.push({
          type: "text",
          verdict: "MISINFO",
          place: geminiResult.place,
          reason: geminiResult.reason,
        });
      } else if (verdict === "ACCURATE") {
        results.push({
          type: "text",
          verdict: "ACCURATE",
          place: geminiResult.place,
          reason: geminiResult.reason,
        });
      } else if (verdict === "ERROR") {
        results.push({
          type: "text",
          verdict: "ERROR",
          place: geminiResult.place,
          reason: geminiResult.reason,
        });
      }
    }

    // ====== Article Analysis ======
    else if (detectedType === "article") {
      const articleUrl = url || content;
      const articleResult = await analyzeArticle(articleUrl);
      if (articleResult.textMisinfo) {
        results.push({
          type: "article",
          verdict: "MISINFO",
          place: articleResult.textPlace,
          reason: articleResult.textReason,
        });
      } else if (articleResult.textAccurate) {
        results.push({
          type: "article",
          verdict: "ACCURATE",
          place: articleResult.textPlace,
          reason: articleResult.textReason,
        });
      }
    }

    // ====== Video / Audio Analysis ======
    else if (detectedType === "video" || detectedType === "audio") {
      const { content, link, url } = req.body;
      const fileOrLink = req.file || link || url || content;

      console.log("DEBUG: Incoming File ===>", req.file);
      console.log("DEBUG: fileOrLink before analyzeContent:", fileOrLink);

      if (!fileOrLink) {
        results.push({
          type: detectedType,
          reason: "No video/audio URL or file provided",
        });
      } else {
        // Wrap it in an object for analyzeContent
        const analysisResult = await analyzeContent({ url: fileOrLink });

        if (analysisResult.videoMisinfo) {
          results.push({
            type: "video",
            verdict: "MISINFO",
            place: analysisResult.videoPlace,
            reason: analysisResult.videoReason,
            summary: analysisResult.videoSummary,
          });
        } else if (analysisResult.videoAccurate) {
          results.push({
            type: "video",
            verdict: "ACCURATE",
            place: analysisResult.videoPlace,
            reason: analysisResult.videoReason,
            summary: analysisResult.videoSummary,
          });
        }
      }
    }

    // ====== Image Analysis ======
    else if (detectedType === "image") {
      const imageResult = await analyzeImage(req.file, link, req.body.content);

      // Always push the image result, whether misinfo or not
      results.push({
        type: "image",
        place: imageResult.place,
        reason: imageResult.reason,
        verdict: imageResult.verdict,
      });
    }

    // ====== Final Output ======
    const finalVerdict = results.some((r) => r.verdict === "MISINFO")
      ? "MISINFO DETECTED"
      : "ACCURATE!";

    const output = { success: true, verdict: finalVerdict, locations: results };

    // Save to DB
    await MisinfoRecord.create({
      type: detectedType,
      originalInput: content || url || link || req.file?.originalname,
      processedData: output,
      geminiResult: results.length > 0 ? results : null,
      status: "completed",
    });

    console.log("Final Output:", output);
    res.json(output);
  } catch (err) {
    console.error("Server Error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};
