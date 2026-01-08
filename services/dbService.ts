
import { Transaction, TransactionType } from "../types";

const DEFAULT_URL = "https://script.google.com/macros/s/AKfycbz1TWDZceLQyPwa6I1veMw-g1iSU_09rY4yVWP2aGHgvbf8YcucGSUWuUMnvsA8ZLPF/exec";

const getScriptUrl = () => localStorage.getItem('google_sheet_script_url') || DEFAULT_URL;

const toTaipeiISO = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
};

export const dbService = {
  isConfigured(): boolean {
    const url = getScriptUrl();
    return url && url.includes('/exec');
  },

  async fetchAll(): Promise<Transaction[]> {
    const url = getScriptUrl();
    if (!url) return [];
    try {
      const response = await fetch(`${url}?t=${Date.now()}_${Math.random()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await response.json();
      
      if (!Array.isArray(data)) return [];

      return data.map((item: any, index: number) => {
        const rawId = (item.id !== undefined && String(item.id).trim() !== "") 
          ? String(item.id).trim() 
          : `row-${index + 2}`;
        
        return {
          id: rawId,
          date: toTaipeiISO(item.date || new Date()),
          type: (item.type || TransactionType.INBOUND) as TransactionType,
          materialName: String(item.materialName || '未命名料件'),
          materialNumber: String(item.materialNumber || ''),
          machineNumber: String(item['機台編號'] || item.machineNumber || ''),
          operator: '', // 移除執行人員
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          total: Number(item.total) || 0,
          note: String(item.note || '')
        };
      });
    } catch (e) {
      console.error("Cloud DB Fetch Error:", e);
      return [];
    }
  },

  async save(transaction: Transaction): Promise<boolean> {
    return this.postToCloud('insert', transaction.id, transaction.type, transaction);
  },

  async update(transaction: Transaction): Promise<boolean> {
    return this.postToCloud('update', transaction.id, transaction.type, transaction);
  },

  async delete(id: string, type: TransactionType): Promise<boolean> {
    return this.postToCloud('delete', id, type, {});
  },

  async postToCloud(action: string, id: string, type: string, transaction: any): Promise<boolean> {
    const url = getScriptUrl();
    if (!url) return false;
    try {
      const payload = {
        action: action,
        id: String(id).trim(),
        type: type,
        data: action === 'delete' ? {} : {
          id: String(id).trim(),
          date: toTaipeiISO(transaction.date),
          type: transaction.type,
          materialName: String(transaction.materialName),
          materialNumber: String(transaction.materialNumber),
          "機台編號": String(transaction.machineNumber),
          quantity: Number(transaction.quantity),
          unitPrice: Number(transaction.unitPrice),
          total: Number(transaction.total),
          note: String(transaction.note)
        }
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (e) {
      console.error("Cloud Post Error:", e);
      return false;
    }
  }
};
