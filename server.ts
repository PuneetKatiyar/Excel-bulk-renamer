import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize Gemini:", e);
}

// API routes
app.post("/api/rename/ai", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini API key is not configured." });
  }

  try {
    const { files } = req.body;
    // files is an array of roughly: { originalName: string, headers: string[], firstRow: any }
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No files provided for AI analysis." });
    }

    // To prevent overwhelming the prompt, we'll chunk or summarize.
    // For now, let's process them and ask Gemini to suggest a name for each.
    // If the list is large, we should limit to parsing a few. Let's assume a reasonable batch size for AI.
    if (files.length > 50) {
      return res.status(400).json({ error: "Please select 50 or fewer files for AI renaming at once." });
    }

    const prompt = `
You are an expert data analyst and organizational assistant.
The user wants to rename a batch of Excel/CSV files based on their contents.
Below is a JSON array containing the original file names, their column headers, and the first row of data.
Your task is to suggest a new, highly descriptive, professional, and concise file name for each file.
Use clear patterns, maybe incorporating dates if present, or identifying the core subject (e.g., "Q3_Sales_Report.xlsx" instead of "data.xlsx").
Maintain the original file extension.

Files data:
${JSON.stringify(files.map(f => ({ id: f.id, originalName: f.originalName, headers: f.headers, sampleRow: f.firstRow })), null, 2)}

Return ONLY a JSON array of objects with the following format:
[
  { "id": "file_id", "suggestedName": "New_Name.xlsx", "reason": "Short reason" }
]
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from Gemini");
    }

    const suggestions = JSON.parse(text);
    res.json({ suggestions });

  } catch (error: any) {
    console.error("AI Renaming Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI names." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
