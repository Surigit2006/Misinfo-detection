import { GoogleGenerativeAI } from "@google/generative-ai";

// Replace with your Gemini API key

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Retry wrapper for Gemini API
 */
const callGeminiWithRetry = async (prompt, retries = 3) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`DEBUG: Gemini attempt ${attempt}...`);
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error.status === 503 && attempt < retries) {
        console.warn(`Gemini overloaded. Retrying in ${2000 * attempt}ms...`);
        await new Promise((res) => setTimeout(res, 2000 * attempt));
      } else {
        throw error;
      }
    }
  }
};

/**
 * Analyze image for misinformation using Gemini only
 */
export const analyzeImage = async (file, link, content) => {
  const imageUrl = file?.path || link || content;
  console.log("DEBUG: Starting image analysis with URL:", imageUrl);

  if (!imageUrl) {
    throw new Error("No image provided for analysis.");
  }

  const prompt = `
    You are an AI misinformation detector.
    Analyze the image at this URL: ${imageUrl}
    Determine if it is being used in a misleading context.
    Respond ONLY in JSON format:
    {
      "verdict": "MISINFO" | "ACCURATE",
      "reason": "Brief explanation"
    }
  `;

  try {
    const geminiOutput = await callGeminiWithRetry(prompt);
    let cleanOutput = geminiOutput.replace(/```json|```/g, "").trim();
    const geminiData = JSON.parse(cleanOutput);

    console.log("DEBUG: Gemini Raw Response:", geminiData);

    const verdict = geminiData?.verdict?.trim().toUpperCase();
    console.log("DEBUG: Final Verdict:", verdict);

    const imageMisinfo = verdict === "MISINFO";
    const imageAccurate = verdict === "ACCURATE";

    return {
      isMisinfo: geminiData.verdict === "MISINFO",
      place: imageUrl,
      reason: geminiData.reason || "No explanation provided",
      verdict: geminiData.verdict || "ACCURATE",
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error.message);
    return {
      isMisinfo: false,
      place: imageUrl,
      reason: "Gemini analysis failed",
      verdict: "ACCURATE",
    };
  }
  const result = {
    imageMisinfo,
    imageAccurate,
    imagePlace: "image",
    imageReason: geminiData.reason || "No explanation provided",
  };

  console.log("DEBUG: analyzeArticle Final Result:", result);
  return result;
};
