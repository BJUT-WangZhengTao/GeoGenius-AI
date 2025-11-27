import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ComputedGeometry } from "../types";

// Initialize the client. API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;

const SYSTEM_INSTRUCTION = `
You are GeoGenius, an enthusiastic and highly capable high school math tutor specializing in Geometry.
Your goal is to help students understand the Law of Cosines and triangle properties.

Key Behaviors:
1.  **Context Aware**: You will be provided with the current live geometry data (sides and angles) of the triangle the student is manipulating. Use this data in your explanations.
    *   Example: "Since angle C is 90 degrees, notice how the term 2ab*cos(C) becomes zero!"
2.  **Socratic Method**: Don't just give answers. Ask guiding questions to help the student build intuition.
3.  **Concise & Clear**: Keep responses brief (under 100 words ideally) unless a detailed proof is requested. Use simple language.
4.  **LaTeX**: Output mathematical formulas using standard LaTeX format wrapped in single dollar signs for inline math (e.g., $c^2 = a^2 + b^2$) and double dollar signs for block math.

The user is interacting with a dynamic triangle on a canvas. They can drag points A, B, and C.
`;

export const initializeChat = () => {
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const sendMessageToTutor = async (
  message: string,
  geometryContext: ComputedGeometry
): Promise<string> => {
  if (!chatSession) {
    initializeChat();
  }

  // Enrich the user message with the current visual state context
  // This is hidden from the user but visible to the model
  const contextHeader = `
[CURRENT VISUAL STATE]
Side a (BC) = ${geometryContext.sideA.toFixed(2)}
Side b (AC) = ${geometryContext.sideB.toFixed(2)}
Side c (AB) = ${geometryContext.sideC.toFixed(2)}
Angle A = ${geometryContext.angleA.toFixed(1)}°
Angle B = ${geometryContext.angleB.toFixed(1)}°
Angle C = ${geometryContext.angleC.toFixed(1)}°
[USER QUESTION]
`;

  const fullPrompt = `${contextHeader}${message}`;

  try {
    const result: GenerateContentResponse = await chatSession!.sendMessage({
      message: fullPrompt,
    });
    return result.text || "I'm having trouble calculating the geometric proof right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I lost my connection to the math dimension. Please check your API key.";
  }
};