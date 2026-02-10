import { GoogleGenAI } from "@google/genai";
import { FlightLog } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key 缺失。请选择一个付费 API Key。");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeFlightHistory = async (logs: FlightLog[]): Promise<string> => {
  try {
    const ai = getClient();
    
    // Prepare a summary of the logs for the model
    const recentLogs = logs.slice(0, 20);
    const logSummary = JSON.stringify(recentLogs.map(log => ({
      date: log.date,
      type: log.type,
      duration: log.flightTime.toFixed(1) + 'h',
      mood: log.mood || 'unknown',
      notes: log.notes
    })));

    const prompt = `
      你是一位经验丰富的飞行部总飞行师（Chief Pilot），也是一位导师。
      请根据以下飞行员的近期飞行日志数据进行分析。
      
      请提供一段简短、专业的中文总结。
      内容包括：
      1. 总结近期飞行强度和规律。
      2. 关注飞行员的心情(Mood)变化和身心状态。
      3. 根据其日程安排，提供一条具体的安全建议或健康管理建议。
      
      语气要保持专业、鼓励且干练，像机长之间的对话。不要太长。
      
      飞行日志数据:
      ${logSummary}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "暂时无法生成分析。";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "分析服务暂不可用，请检查网络或 API Key。";
  }
};