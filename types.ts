
export enum TransactionType {
  INBOUND = '進貨',
  USAGE = '用料',
  CONSTRUCTION = '建置'
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  materialName: string;    // 料件名稱
  materialNumber: string;  // 料號
  itemName: string;        // 項目/摘要名稱
  quantity: number;
  unitPrice: number;
  total: number;
  note: string;
}

export interface MonthlyStats {
  inboundTotal: number;
  usageTotal: number;
  constructionTotal: number;
  grandTotal: number;
}
