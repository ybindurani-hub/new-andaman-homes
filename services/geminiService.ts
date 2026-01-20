
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enhanceDescription = async (details: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional real estate agent in the Andaman Islands. Enhance the following property description to be catchy, professional, and appealing to potential buyers/renters. Focus on the tropical vibe of Andaman and the specific features provided. Keep it under 150 words.\n\nDetails: ${details}`,
    });
    return response.text || details;
  } catch (error) {
    console.error("Gemini Error:", error);
    return details;
  }
};

export const generatePropertyTags = async (description: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract exactly 5 keywords or tags for this real estate listing in Andaman. Format as a comma-separated list.\n\nDescription: ${description}`,
    });
    return (response.text || "").split(',').map(s => s.trim());
  } catch (error) {
    return ["Andaman", "Real Estate", "Homes"];
  }
};
