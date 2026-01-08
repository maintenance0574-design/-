
export enum TransactionType {
  INBOUND = '進貨',
  USAGE = '用料',
  CONSTRUCTION = '建置'
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  itemName: string;
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
