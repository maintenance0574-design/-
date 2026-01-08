
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export const analyzeWarehouseData = async (transactions: Transaction[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const summary = transactions.map(t => 
    `${t.date} | ${t.type} | ${t.itemName} | 數量: ${t.quantity} | 金額: ${t.total}`
  ).join('\n');

  const prompt = `
    你是一位專業的倉儲數據分析專家。請根據以下本月的倉儲結算數據進行分析：
    
    ${summary}

    請提供以下三方面的見解：
    1. 支出預算分析：針對「進貨」、「用料」與「建置」三大類的比例是否合理。
    2. 營運效率建議：是否有異常頻繁的領料或過高的建置成本。
    3. 下月庫存優化：根據本月趨勢，給予下個月的採購或管理建議。
    
    請使用專業且具建設性的口吻，並以 Markdown 格式輸出。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "抱歉，目前無法生成 AI 分析報告，請稍後再試。";
  }
};
