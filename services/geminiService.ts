
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export const analyzeWarehouseData = async (transactions: Transaction[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const summary = transactions.map(t => 
    `${t.date} | ${t.type} | 料件: ${t.materialName}(#${t.materialNumber}) | 摘要: ${t.itemName} | 數量: ${t.quantity} | 金額: ${t.total}`
  ).join('\n');

  const prompt = `
    你是一位專業的倉儲數據分析專家。請根據以下本月的倉儲結算與料件使用數據進行分析：
    
    ${summary}

    請提供以下三方面的見解：
    1. 料件消耗趨勢：觀察特定料號的領用頻率是否過高，是否有囤貨或短缺風險。
    2. 成本結構分析：針對「進貨」、「用料」與「建置」三大類的比例以及零件單價的合理性。
    3. 倉儲優化建議：根據本月數據，針對零件管理與下月採購策略給予具體建議。
    
    請使用專業、簡潔且具建設性的口吻，並以 Markdown 格式輸出。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "抱歉，目前無法生成 AI 分析報告，請確認網路連線或 API Key 設定。";
  }
};
