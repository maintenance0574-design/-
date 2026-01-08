
import React, { useState } from 'react';
import { TransactionType, Transaction } from '../types';

interface Props {
  onAdd: (transaction: Transaction) => void;
}

const TransactionForm: React.FC<Props> = ({ onAdd }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.INBOUND,
    itemName: '',
    quantity: 1,
    unitPrice: 0,
    note: ''
  });

  const generateSafeId = () => {
    return 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim()) return;

    // 確保數字欄位是真的數字，如果是空字串就給 0
    const qty = Number(formData.quantity) || 0;
    const price = Number(formData.unitPrice) || 0;

    const newTransaction: Transaction = {
      ...formData,
      quantity: qty,
      unitPrice: price,
      id: generateSafeId(),
      total: qty * price
    };
    
    onAdd(newTransaction);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);

    setFormData({
      ...formData,
      itemName: '',
      quantity: 1,
      unitPrice: 0,
      note: ''
    });
  };

  const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-300 text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium";
  const labelClasses = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
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

        <div>
          <label className={labelClasses}>品項/項目名稱</label>
          <input 
            type="text" 
            placeholder="請輸入正式品項名稱..."
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
              onChange={e => setFormData({...formData, quantity: e.target.value as any})}
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
              onChange={e => setFormData({...formData, unitPrice: e.target.value as any})}
            />
          </div>
        </div>

        <div>
          <label className={labelClasses}>詳細備註 (選填)</label>
          <textarea 
            placeholder="輸入規格、廠商或其他資訊..."
            className={`${inputClasses} min-h-[100px] resize-none`}
            rows={3}
            value={formData.note}
            onChange={e => setFormData({...formData, note: e.target.value})}
          />
        </div>
      </div>

      <button 
        type="submit"
        disabled={isSuccess}
        className={`mt-10 w-full font-black py-5 rounded-[1.5rem] transition-all duration-300 shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
          isSuccess 
          ? "bg-emerald-500 text-white shadow-emerald-500/20" 
          : "bg-slate-900 hover:bg-black text-white shadow-slate-900/10 hover:shadow-slate-900/30"
        }`}
      >
        {isSuccess ? (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            已成功儲存至雲端
          </>
        ) : (
          <>
            <span>➕</span> 提交核銷紀錄
          </>
        )}
      </button>
    </form>
  );
};

export default TransactionForm;
