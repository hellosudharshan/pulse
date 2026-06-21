import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Endpoint for parsing natural language reminders
  app.post("/api/parse-reminder", async (req: express.Request, res: express.Response) => {
    try {
      const { prompt, referenceTime, userApiKey } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const activeKey = userApiKey || process.env.GEMINI_API_KEY;
      if (!activeKey) {
        return res.status(403).json({ 
          error: "GEMINI_NOT_CONFIGURED" 
        });
      }

      const aiInstance = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are an expert natural language scheduler designed for an interval timer and alarm app.
Analyze the user's spoken or typed text prompt and convert it to a structured schedule configuration.
Current local reference time: ${referenceTime || new Date().toISOString()}.

Follow these rules:
1. Determine if the requested reminder is a relative countdown duration (e.g. "for 10 minutes", "every 2 hours", "stop working in 45 seconds") or an absolute time-of-day alarm (e.g., "at 3:15 pm", "wake me up at 8 am").
2. For countdown duration parameters, calculate the absolute total seconds (e.g., "5 minutes" -> 300 seconds).
3. For alarm parameters, extract the hour (1-12 format), minute (00-59), and ampm ('AM' or 'PM').
4. Pick the most suitable soundProfile among: 'synth_chime', 'synth_beep', 'synth_pulsar', 'synth_vibrate', 'synth_gong'.
5. Provide a friendly, encouraging label and description based on the prompt. For example: "Water Break", "Drink a fresh glass of hydration".`;

      // Helper function to call generateContent with retry and fallback
      const generateWithRetryAndFallback = async (modelName: string): Promise<any> => {
        const options = {
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: "Must be 'countdown' if relative duration, or 'alarm' if specific time of day",
                },
                label: {
                  type: Type.STRING,
                  description: "Short descriptive goal label of the reminder (maximum 3-4 words)",
                },
                description: {
                  type: Type.STRING,
                  description: "A friendly, encouraging explanation of what the user should do",
                },
                durationSeconds: {
                  type: Type.INTEGER,
                  description: "Total duration in seconds. Required only for type 'countdown'",
                },
                alarmHour: {
                  type: Type.STRING,
                  description: "Two-digit hour string (1-12 format), e.g. '03' or '11'. Required only for type 'alarm'",
                },
                alarmMinute: {
                  type: Type.STRING,
                  description: "Two-digit minute string (00-59), e.g. '00' or '45'. Required only for type 'alarm'",
                },
                alarmAmpm: {
                  type: Type.STRING,
                  description: "Must be 'AM' or 'PM'. Required only for type 'alarm'",
                },
                soundProfile: {
                  type: Type.STRING,
                  description: "Most fitting sound profile setting: 'synth_beep', 'synth_chime', 'synth_pulsar', 'synth_vibrate', 'synth_gong'",
                }
              },
              required: ["type", "label", "description", "soundProfile"],
            }
          }
        };

        let lastErr: any = null;
        // Try up to 3 times on the primary model
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`[Gemini Engine] Attempting payload parsing with ${modelName} (attempt ${attempt}/3)...`);
            return await aiInstance.models.generateContent(options);
          } catch (err: any) {
            lastErr = err;
            const errMsg = err.message || "";
            const isTransient = errMsg.includes("533") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("demand") || errMsg.includes("limit") || err.status === 503;
            
            if (isTransient && attempt < 3) {
              const backoffMs = attempt * 1000;
              console.warn(`[Gemini Engine] Transient error (${errMsg}). Retrying in ${backoffMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            } else {
              break;
            }
          }
        }

        // If we are here and still failed, fallback if possible
        if (modelName === "gemini-3.5-flash") {
          console.warn(`[Gemini Engine] Model gemini-3.5-flash failed (${lastErr?.message}). Falling back to gemini-flash-latest...`);
          try {
            return await aiInstance.models.generateContent({
              ...options,
              model: "gemini-flash-latest"
            });
          } catch (fallbackErr: any) {
            console.error("[Gemini Engine] Final fallback to gemini-flash-latest also failed:", fallbackErr);
            throw fallbackErr;
          }
        }

        throw lastErr;
      };

      const response = await generateWithRetryAndFallback("gemini-3.5-flash");
      const text = response.text || "{}";
      const parsedData = JSON.parse(text);
      res.json(parsedData);
    } catch (err: any) {
      console.error("AI Parse Error after retries:", err);
      res.status(500).json({ error: err.message || "Failed to process reminder request" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
