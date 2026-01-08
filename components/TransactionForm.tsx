
import React, { useState, useEffect } from 'react';
import { TransactionType, Transaction } from '../types';

interface Props {
  onSave: (transaction: Transaction) => Promise<boolean>;
  initialData?: Transaction;
  onCancel?: () => void;
  title?: string;
}

const getTaipeiToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

const TransactionForm: React.FC<Props> = ({ onSave, initialData, onCancel, title }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    date: getTaipeiToday(),
    type: TransactionType.INBOUND,
    materialName: '',
    materialNumber: '',
    machineNumber: '',
    quantity: 1,
    unitPrice: 0,
    note: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date || getTaipeiToday(),
        type: initialData.type || TransactionType.INBOUND,
        materialName: String(initialData.materialName || ''),
        materialNumber: String(initialData.materialNumber || ''),
        machineNumber: String(initialData.machineNumber || ''),
        quantity: Number(initialData.quantity) || 0,
        unitPrice: Number(initialData.unitPrice) || 0,
        note: String(initialData.note || '')
      });
    }
  }, [initialData]);

  const generateSafeId = () => {
    return 'TX' + getTaipeiToday().replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.materialName.trim()) { alert("⚠️ 請輸入料件名稱"); return; }

    try {
      setIsSyncing(true);
      const qty = Number(formData.quantity) || 0;
      const price = Number(formData.unitPrice) || 0;

      const transactionToSave: Transaction = {
        ...formData,
        id: initialData?.id ? String(initialData.id).trim() : generateSafeId(),
        quantity: qty,
        unitPrice: price,
        total: qty * price,
        date: formData.date
      };
      
      const result = await onSave(transactionToSave);
      
      if (result) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          if (onCancel && initialData) onCancel(); 
        }, 1200);

        if (!initialData) {
          setFormData({
            ...formData,
            materialName: '',
            materialNumber: '',
            machineNumber: '',
            quantity: 1,
            unitPrice: 0,
            note: ''
          });
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-300 text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium";
  const labelClasses = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1";

  return (
    <form onSubmit={handleSubmit} className={`bg-white p-10 ${initialData ? '' : 'rounded-[2.5rem] shadow-xl border border-slate-200/60'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">
            {title || (initialData ? "編輯紀錄內容" : "新增核銷結算")}
          </h3>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-rose-600 transition-colors font-bold text-sm">關閉視窗</button>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>單據日期</label>
            <input type="date" required className={inputClasses} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>核銷類別</label>
            <select className={inputClasses} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TransactionType})} disabled={!!initialData}>
              {Object.values(TransactionType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <div className="relative">
            <label className={labelClasses}>料件名稱</label>
            <input type="text" placeholder="輸入名稱 (如: 氣缸)" required className={inputClasses} value={formData.materialName} onChange={e => setFormData({...formData, materialName: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>料號 (P/N)</label>
            <input type="text" placeholder="零件編號" className={inputClasses} value={formData.materialNumber} onChange={e => setFormData({...formData, materialNumber: e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>機台編號</label>
            <input type="text" placeholder="對應機台" className={inputClasses} value={formData.machineNumber} onChange={e => setFormData({...formData, machineNumber: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>數量</label>
            <input type="number" min="1" required className={inputClasses} value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
          </div>
          <div>
            <label className={labelClasses}>單價</label>
            <input type="number" min="0" required className={inputClasses} value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
          </div>
        </div>
      </div>

      <button 
        type="submit"
        disabled={isSyncing || isSuccess}
        className={`mt-10 w-full font-black py-5 rounded-[1.5rem] transition-all duration-300 shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
          isSuccess 
          ? "bg-emerald-500 text-white shadow-emerald-500/20" 
          : isSyncing
          ? "bg-slate-400 text-white cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10"
        }`}
      >
        {isSyncing ? "數據封裝傳送中..." : isSuccess ? "✅ 同步至雲端完成" : (initialData ? "儲存更新內容" : "確認核銷並存檔")}
      </button>
    </form>
  );
};

export default TransactionForm;
