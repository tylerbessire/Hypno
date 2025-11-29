import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface MusicConfig {
  style: string;
  binauralFreq: number; // The difference frequency (e.g., 5Hz for Theta)
  baseFreq: number; // Carrier frequency (e.g., 200Hz)
  isochronic: boolean;
}

export interface SessionPlan {
  summary: string;
  systemInstruction: string;
  sources: GroundingSource[];
  musicConfig: MusicConfig;
}

export const generateSessionPlan = async (userIssue: string, musicPreference: string): Promise<SessionPlan> => {
  if (!apiKey) throw new Error("API Key not found");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are an expert clinical hypnotherapist and psycho-acoustic engineer preparing for a LIVE, INTERACTIVE voice session.
    The user is seeking help with: "${userIssue}".
    User's music preference: "${musicPreference}".
    
    TASK:
    1.  **Safety Check**: Research potential contraindications.
    2.  **Research**: Find SOTA techniques using Google Search (medical lit 2020-2025).
    3.  **Music Design (Lyria 2 Engine)**: Design a real-time generated audio backdrop.
        - Determine the best **Binaural Beat** frequency for this session (e.g., Delta 0.5-4Hz for sleep, Theta 4-8Hz for deep trance/healing, Alpha 8-14Hz for relaxation/focus).
        - Select a carrier frequency (usually 100Hz - 250Hz for comfort).
        - Decide if **Isochronic tones** (rhythmic pulsing) would aid the induction.
    4.  **Plan Summary**: Brief summary (100-150 words).
    5.  **System Instruction**: Detailed prompt for the Live AI (gemini-2.5-flash-native-audio).
       - **CRITICAL VOCAL DIRECTIVE**: You MUST speak with a slow, hypnotic cadence. Breathe naturally between phrases. Use dynamic inflection to sound sincere, warm, and empathetic. Do NOT sound robotic or monotone. Vary your pitch and speed to match the emotional content.
       - **INTERACTION**: Start the session IMMEDIATELY by welcoming the user warmly. Do not wait for them to speak first.
       - **STRUCTURE**: Induction -> Deepening -> Work -> Emergence.
       - **BEHAVIOR**: If the user interrupts, stop speaking immediately and listen.
       
    Output purely a JSON object with this schema:
    {
      "summary": "...",
      "systemInstruction": "...",
      "musicConfig": {
        "style": "Description of the ambient pad style (e.g. 'Deep Space', 'Warm Pad')",
        "binauralFreq": 5,
        "baseFreq": 200,
        "isochronic": true
      },
      "sources": [{"uri": "...", "title": "..."}] 
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from Gemini");

    // Clean up potential markdown code blocks
    text = text.trim()
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "");

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn("JSON Parse Error on response:", text);
      throw new Error("Failed to parse session plan from AI response");
    }

    // Extract sources
    let sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
       sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web)
        .map((web: any) => ({ uri: web.uri, title: web.title }));
    }

    // Fallback
    if (sources.length === 0 && Array.isArray(data.sources)) {
        sources = data.sources;
    }

    // Defaults for music if missing
    const musicConfig = data.musicConfig || {
        style: "Ambient",
        binauralFreq: 6,
        baseFreq: 200,
        isochronic: false
    };

    return {
      summary: data.summary,
      systemInstruction: data.systemInstruction,
      sources: sources,
      musicConfig: musicConfig
    };

  } catch (error) {
    console.error("Error generating session plan:", error);
    throw error;
  }
};