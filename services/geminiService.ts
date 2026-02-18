
import { GoogleGenAI } from "@google/genai";
import { TreeData } from "../types";

export const getAIInsights = async (data: TreeData[]) => {
  if (!process.env.API_KEY) return "AI Insights unavailable: Missing API Key.";

  // Initialize the GoogleGenAI client inside the function to ensure the correct environment state.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const summary = {
    total: data.length,
    healthy: data.filter(d => d.Kesehatan === 'Sehat').length,
    avgHeight: (data.reduce((acc, curr) => acc + (Number(curr.Tinggi) || 0), 0) / (data.length || 1)).toFixed(1),
    species: Array.from(new Set(data.map(d => d.Tanaman))).length,
    anomalies: data.filter(d => !d.isValidLocation).length
  };

  try {
    // Generate content using the recommended pattern for text analysis.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analisis data rehabilitasi hutan ini secara singkat dan profesional:
      - Total baris data: ${summary.total}
      - Pohon Sehat: ${summary.healthy}
      - Rata-rata Tinggi: ${summary.avgHeight} cm
      - Jumlah Spesies: ${summary.species}
      - Anomali Koordinat: ${summary.anomalies}

      Berikan 1 insight tentang kesehatan hutan dan 1 saran teknis tentang anomali data (jika ada). Gunakan Bahasa Indonesia formal. Maksimal 200 karakter.`,
      config: {
        temperature: 0.5,
        maxOutputTokens: 150
      }
    });

    return response.text || "Analisis data selesai.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Analisis statistik masal sedang diproses...";
  }
};
