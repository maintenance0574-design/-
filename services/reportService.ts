
import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

export const exportToExcel = (transactions: Transaction[], yearMonth: string) => {
  const [year, month] = yearMonth.split('-');
  
  // 1. 過濾該月份資料
  const monthData = transactions.filter(t => t.date.startsWith(yearMonth));
  
  if (monthData.length === 0) {
    alert(`⚠️ ${year}年${month}月 沒有任何紀錄可供匯出`);
    return;
  }

  // 2. 建立活頁簿
  const wb = XLSX.utils.book_new();

  // 3. 定義處理函數：轉換資料並增加小計
  const prepareSheetData = (type: TransactionType) => {
    const items = monthData.filter(t => t.type === type);
    if (items.length === 0) return null;

    const rows = items.map(t => ({
      '日期': t.date,
      '料件名稱': t.materialName,
      '料號': t.materialNumber,
      '項目摘要': t.itemName,
      '數量': t.quantity,
      '單價': t.unitPrice,
      '總計': t.total,
      '備註': t.note || ''
    }));

    // 計算小計
    const totalAmount = items.reduce((sum, t) => sum + t.total, 0);
    rows.push({
      '日期': '---',
      '料件名稱': '總計小計',
      '料號': '---',
      '項目摘要': '---',
      '數量': 0,
      '單價': 0,
      '總計': totalAmount,
      '備註': '本類別月結總額'
    } as any);

    return XLSX.utils.json_to_sheet(rows);
  };

  // 4. 分類加入 Sheets
  const types = [TransactionType.INBOUND, TransactionType.USAGE, TransactionType.CONSTRUCTION];
  types.forEach(type => {
    const ws = prepareSheetData(type);
    if (ws) {
      XLSX.utils.book_append_sheet(wb, ws, type);
    }
  });

  // 5. 匯出檔案
  XLSX.writeFile(wb, `${year}年${month}月_倉管核銷報表.xlsx`);
};
