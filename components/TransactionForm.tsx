
import React, { useState } from 'react';
import { TransactionType, Transaction } from '../types';

interface Props {
  onAdd: (transaction: Transaction) => Promise<boolean>;
}

const TransactionForm: React.FC<Props> = ({ onAdd }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.INBOUND,
    materialName: '',
    materialNumber: '',
    itemName: '',
    quantity: 1,
    unitPrice: 0,
    note: ''
  });

  const generateSafeId = () => {
    return 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form: handleSubmit triggered");

    // 基本欄位驗證
    if (!formData.materialName.trim() || !formData.itemName.trim()) {
      alert("⚠️ 請完整填寫料件名稱與項目摘要");
      return;
    }

    try {
      setIsSyncing(true);
      
      const qty = Number(formData.quantity) || 0;
      const price = Number(formData.unitPrice) || 0;

      const newTransaction: Transaction = {
        ...formData,
        quantity: qty,
        unitPrice: price,
        id: generateSafeId(),
        total: qty * price
      };
      
      console.log("Form: Sending data to App component...", newTransaction);
      const result = await onAdd(newTransaction);
      
      if (result) {
        setIsSuccess(true);
        console.log("Form: Save successful");
        setTimeout(() => setIsSuccess(false), 2000);

        // 重設表單
        setFormData({
          ...formData,
          materialName: '',
          materialNumber: '',
          itemName: '',
          quantity: 1,
          unitPrice: 0,
          note: ''
        });
      } else {
        alert("❌ 儲存失敗！\n1. 請檢查網路連線\n2. 前往『連線設定』確認網址是否正確");
      }
    } catch (error) {
      console.error("Form: Critical Error", error);
      alert("⚠️ 系統發生錯誤，請稍後再試。");
    } finally {
      // 確保無論成功失敗，都要恢復按鈕狀態
      setIsSyncing(false);
    }
  };

  const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-300 text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium";
  const labelClasses = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">新增核銷紀錄</h3>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>單據日期</label>
            <input 
              type="date" 
              required
              className={inputClasses}
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div>
            <label className={labelClasses}>核銷類別</label>
            <select 
              className={inputClasses}
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}
            >
              {Object.values(TransactionType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>料件名稱</label>
            <input 
              type="text" 
              placeholder="例如: 伺服馬達"
              required
              className={inputClasses}
              value={formData.materialName}
              onChange={e => setFormData({...formData, materialName: e.target.value})}
            />
          </div>
          <div>
            <label className={labelClasses}>料號 (PN)</label>
            <input 
              type="text" 
              placeholder="例如: MTR-001"
              required
              className={inputClasses}
              value={formData.materialNumber}
              onChange={e => setFormData({...formData, materialNumber: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className={labelClasses}>項目 / 摘要名稱</label>
          <input 
            type="text" 
            placeholder="輸入結算說明..."
            required
            className={inputClasses}
            value={formData.itemName}
            onChange={e => setFormData({...formData, itemName: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>數量</label>
            <input 
              type="number" 
              min="1"
              required
              className={inputClasses}
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
            />
          </div>
          <div>
            <label className={labelClasses}>單價 (TWD)</label>
            <input 
              type="number" 
              min="0"
              required
              className={inputClasses}
              value={formData.unitPrice}
              onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})}
            />
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
          : "bg-slate-900 hover:bg-black text-white shadow-slate-900/10"
        }`}
      >
        {isSyncing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            正在同步至 Google Sheets...
          </>
        ) : isSuccess ? (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            同步成功
          </>
        ) : (
          <>
            <span>💾</span> 儲存結算資料
          </>
        )}
      </button>
    </form>
  );
};

export default TransactionForm;
