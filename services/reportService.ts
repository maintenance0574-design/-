
import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

export const exportToExcel = (transactions: Transaction[], yearMonth: string) => {
  // yearMonth 格式為 "YYYY-MM"
  const [year, month] = yearMonth.split('-');
  const monthData = transactions.filter(t => t.date.startsWith(yearMonth));
  
  if (monthData.length === 0) {
    alert(`⚠️ ${year}年${month}月 目前沒有核銷紀錄可供匯出`);
    return;
  }

  const wb = XLSX.utils.book_new();

  const prepareSheetData = (type: TransactionType) => {
    const items = monthData.filter(t => t.type === type);
    if (items.length === 0) return null;

    // 準備資料列
    const rows = items.map(t => ({
      '核銷日期': t.date,
      '機台編號': t.machineNumber || 'N/A',
      '料件名稱': t.materialName,
      '料號 (P/N)': t.materialNumber,
      '數量': t.quantity,
      '單價 (NT$)': t.unitPrice,
      '總金額 (NT$)': t.total,
      '備註': t.note || ''
    }));

    // 計算小計
    const totalAmount = items.reduce((sum, t) => sum + t.total, 0);
    const totalQuantity = items.reduce((sum, t) => sum + t.quantity, 0);

    // 新增總計行
    rows.push({
      '核銷日期': '---',
      '機台編號': '---',
      '料件名稱': `【${type}】小計總額`,
      '料號 (P/N)': '---',
      '數量': totalQuantity,
      '單價 (NT$)': 0,
      '總金額 (NT$)': totalAmount,
      '備註': `共 ${items.length} 筆項目`
    } as any);

    return XLSX.utils.json_to_sheet(rows);
  };

  // 分別為三類建立工作表
  const categories = [TransactionType.INBOUND, TransactionType.USAGE, TransactionType.CONSTRUCTION];
  let hasSheet = false;

  categories.forEach(type => {
    const ws = prepareSheetData(type);
    if (ws) {
      XLSX.utils.book_append_sheet(wb, ws, type);
      hasSheet = true;
    }
  });

  if (!hasSheet) {
    alert("當月資料不完整，無法生成報表");
    return;
  }

  // 匯出檔案
  XLSX.writeFile(wb, `${year}年${month}月_倉管核銷月結報表.xlsx`);
};
