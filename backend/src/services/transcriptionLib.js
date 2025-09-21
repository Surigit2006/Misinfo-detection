// transcriptionLib.js
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import axios from "axios";

/**
 * Download file from URL
 */
const downloadFile = async (url, outputPath) => {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({ url, method: "GET", responseType: "stream" });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

/**
 * Extract audio using FFmpeg
 */
const extractAudio = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`;
    exec(command, (err) => (err ? reject(err) : resolve(outputPath)));
  });
};

/**
 * Transcribe audio using Whisper (local)
 * You need whisper.cpp or OpenAI Whisper
 */
const transcribeAudio = (audioPath) => {
  return new Promise((resolve, reject) => {
    // Example using whisper.cpp CLI
    const command = `whisper "${audioPath}" --model small --output_format txt`;
    exec(command, (err) => {
      if (err) return reject(err);
      const transcriptPath = audioPath.replace(path.extname(audioPath), ".txt");
      const transcript = fs.readFileSync(transcriptPath, "utf-8");
      resolve(transcript);
    });
  });
};

/**
 * Main transcription function
 * @param {string} urlOrFile - video/audio URL or local file path
 */
export const transcribeAudioVideo = async (urlOrFile) => {
  try {
    let inputFile = urlOrFile;

    // 1. Download file if it's a URL
    if (urlOrFile.startsWith("http")) {
      const tempPath = path.join("temp", `video_${Date.now()}.mp4`);
      if (!fs.existsSync("temp")) fs.mkdirSync("temp");
      await downloadFile(urlOrFile, tempPath);
      inputFile = tempPath;
    }

    // 2. Extract audio
    const audioPath = inputFile.replace(path.extname(inputFile), ".wav");
    await extractAudio(inputFile, audioPath);

    // 3. Transcribe audio
    const transcript = await transcribeAudio(audioPath);

    // Cleanup temp files if downloaded
    if (urlOrFile.startsWith("http")) fs.unlinkSync(inputFile);
    fs.unlinkSync(audioPath);

    return transcript;
  } catch (error) {
    console.error("Error in transcribeAudioVideo:", error.message);
    throw new Error("Audio/video transcription failed.");
  }
};
