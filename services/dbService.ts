
import { Transaction, TransactionType } from "../types";

const getScriptUrl = () => localStorage.getItem('google_sheet_script_url') || '';

export const dbService = {
  isConfigured(): boolean {
    const url = getScriptUrl();
    return url.startsWith('https://script.google.com/') && url.includes('/exec');
  },

  async testConnection(targetUrl: string): Promise<{success: boolean, message: string}> {
    const url = targetUrl.trim();
    if (url.includes('/dev')) return { success: false, message: "❌ 網址錯誤：請使用 /exec 結尾的正式網址。" };
    
    try {
      console.log("Testing connection to:", url);
      const response = await fetch(`${url}?t=${Date.now()}`, { method: 'GET' });
      const text = await response.text();
      
      if (text.includes('<!DOCTYPE html>')) {
        if (text.includes('Google Accounts')) return { success: false, message: "❌ 權限不足：請將部署設定為「所有人 (Anyone)」。" };
        return { success: false, message: "❌ 錯誤：網址無效或試算表未公開。" };
      }
      
      return { success: true, message: "✅ 已成功連線至分類分流資料庫！" };
    } catch (e) {
      console.error("Connection test failed:", e);
      return { success: false, message: "❌ 連線異常：請檢查網路或確認是否已「部署為 Web App」。" };
    }
  },

  async fetchAll(): Promise<Transaction[]> {
    const url = getScriptUrl();
    if (!url) return [];
    try {
      const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("Fetch all failed:", e);
      throw e;
    }
  },

  async save(transaction: Transaction): Promise<boolean> {
    const url = getScriptUrl();
    if (!url) return false;
    try {
      console.log("Attempting to save transaction:", transaction);
      // 在 no-cors 模式下，簡化 headers 提高成功率
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'insert', data: transaction })
      });
      console.log("POST request sent successfully (no-cors)");
      return true;
    } catch (e) {
      console.error("Database save crash:", e);
      return false;
    }
  },

  async delete(id: string, type: TransactionType): Promise<boolean> {
    const url = getScriptUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'delete', id: id, type: type })
      });
      return true;
    } catch (e) {
      console.error("Database delete crash:", e);
      return false;
    }
  }
};
