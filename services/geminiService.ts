import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface SessionPlan {
  summary: string;
  systemInstruction: string;
  sources: GroundingSource[];
}

export const generateSessionPlan = async (userIssue: string): Promise<SessionPlan> => {
  if (!apiKey) throw new Error("API Key not found");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are an expert clinical hypnotherapist preparing for a LIVE, INTERACTIVE voice session.
    The user is seeking help with: "${userIssue}".
    
    TASK:
    1.  **Safety Check**: First, research potential contraindications for hypnosis regarding this specific issue (e.g., schizophrenia, severe dissociation, epilepsy). If the issue presents a high risk for hypnosis, the plan MUST warn the user in the summary and the system instruction must focus purely on relaxation and mindfulness, not deep trance.
    2.  **Research**: Find current SOTA (State of the Art) hypnosis and therapeutic techniques (CBT, NLP, etc.) for this specific issue using Google Search. Prioritize techniques cited in recent medical or psychological literature (2020-2025).
    3.  **Plan Summary**: Create a brief summary of the plan for the user to read (approx 100-150 words). Explain the approach (e.g., "We will use the 'Rewind Technique' for trauma...") and cite why it is effective based on your research.
    4.  **System Instruction**: Construct a detailed "System Instruction" for the AI that will conduct the live session. This instruction must:
       - **Persona**: Calm, professional, soothing, empathetic hypnotherapist. Voice should be slow, rhythmic, and warm.
       - **Format**: This is a VOICE conversation. Do not read long scripts. Speak in short, gentle sentences. 
       - **Interactivity**: You MUST frequently pause and check in with the user (e.g., "Nod if you are ready", "How does that feel?", "Say 'yes' when you are ready to move on"). Wait for their audio response or silence (which implies compliance in trance).
       - **Structure**:
         a. **Induction (5-7 mins)**: Progressive relaxation or fixation. Verify relaxation state.
         b. **Deepening (3-5 mins)**: Countdowns or visualization.
         c. **Therapeutic Work (10-15 mins)**: Apply the evidence-based techniques found in your research. Make this interactive—ask the user to visualize and describe if helpful.
         d. **Emergence (2-3 mins)**: Gently bring them back.
       - **Safety**: If the user seems distressed or interrupts with concern, stop the induction immediately and use grounding techniques.
       - **Tone**: Hypnotic, repetitive, comforting.
       
    Output purely a JSON object with the following schema:
    {
      "summary": "The user facing summary including safety notes...",
      "systemInstruction": "The internal system prompt for the live AI...",
      "sources": [{"uri": "...", "title": "..."}] 
    }
    
    If you find grounding sources, extract them into the sources array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType cannot be used with googleSearch tool
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from Gemini");

    // Clean up potential markdown code blocks since we can't enforce JSON mimeType
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

    // Extract sources from groundingMetadata (Primary Source)
    let sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
       sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web)
        .map((web: any) => ({ uri: web.uri, title: web.title }));
    }

    // Fallback to JSON extracted sources if groundingMetadata didn't yield results
    if (sources.length === 0 && Array.isArray(data.sources)) {
        sources = data.sources;
    }

    return {
      summary: data.summary,
      systemInstruction: data.systemInstruction,
      sources: sources
    };

  } catch (error) {
    console.error("Error generating session plan:", error);
    throw error;
  }
};