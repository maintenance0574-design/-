
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, TransactionType } from './types';
import TransactionForm from './components/TransactionForm';
import Dashboard from './components/Dashboard';
import { analyzeWarehouseData } from './services/geminiService';
import { dbService } from './services/dbService';
import { exportToExcel } from './services/reportService';

const DEFAULT_URL = "https://script.google.com/macros/s/AKfycbz1TWDZceLQyPwa6I1veMw-g1iSU_09rY4yVWP2aGHgvbf8YcucGSUWuUMnvsA8ZLPF/exec";

const getTaipeiDate = (dateInput?: string | Date): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [localOverrides, setLocalOverrides] = useState<Record<string, {tx: Transaction, timestamp: number}>>({});
  const overridesRef = useRef<Record<string, {tx: Transaction, timestamp: number}>>({});

  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'ai' | 'settings'>(
    (localStorage.getItem('ui_active_tab') as any) || 'dashboard'
  );
  
  const [recordFilter, setRecordFilter] = useState<'全部' | TransactionType>('全部');
  
  const [monthSearch, setMonthSearch] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }); 

  const [aiReport, setAiReport] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Transaction | null>(null);

  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('google_sheet_script_url') || DEFAULT_URL);

  useEffect(() => {
    overridesRef.current = localOverrides;
    localStorage.setItem('ui_active_tab', activeTab);
  }, [localOverrides, activeTab]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (silent) setIsRefreshing(true);
    try {
      if (!dbService.isConfigured()) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      const data = await dbService.fetchAll();
      const nextOverrides = { ...overridesRef.current };
      const sanitized = data.map(t => {
        const id = String(t.id).trim();
        if (nextOverrides[id]) delete nextOverrides[id];
        return { ...t, id, date: getTaipeiDate(t.date), total: Number(t.total) || 0 };
      });
      setLocalOverrides(nextOverrides);
      setTransactions(sanitized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      if (Object.keys(overridesRef.current).length > 0) loadData(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleAction = async (tx: Transaction, action: 'save' | 'update') => {
    const id = String(tx.id).trim();
    setLocalOverrides(prev => ({ ...prev, [id]: { tx, timestamp: Date.now() } }));
    let ok = action === 'save' ? await dbService.save(tx) : await dbService.update(tx);
    if (action === 'save') setTransactions(prev => [tx, ...prev]);
    setTimeout(() => loadData(true), 2000);
    return ok;
  };

  const handleExport = () => {
    exportToExcel(transactions, monthSearch);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesCategory = recordFilter === '全部' || t.type === recordFilter;
    const matchesMonth = !monthSearch || t.date.startsWith(monthSearch);
    return matchesCategory && matchesMonth;
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f1f5f9]">
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-2xl font-black mb-2 text-black">確認刪除紀錄？</h3>
            <p className="text-slate-500 mb-8">此操作將從雲端「{confirmDeleteTarget.type}」分頁中永久移除。</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteTarget(null)} className="flex-1 py-4 bg-slate-100 rounded-xl font-bold text-slate-600 transition-colors hover:bg-slate-200">取消</button>
              <button onClick={async () => { await dbService.delete(confirmDeleteTarget.id, confirmDeleteTarget.type); setConfirmDeleteTarget(null); loadData(true); }} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold transition-all hover:bg-rose-700">確認刪除</button>
            </div>
          </div>
        </div>
      )}

      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl my-8">
            <TransactionForm 
              onSave={(tx) => handleAction(tx, 'update')} 
              initialData={editingTransaction} 
              onCancel={() => setEditingTransaction(null)}
            />
          </div>
        </div>
      )}

      <aside className="w-full lg:w-80 bg-slate-900 text-white p-8 flex flex-col shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg rotate-3">倉</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">倉管智慧月結</h1>
            <p className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Standard Edition</p>
          </div>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 font-bold shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-800'}`}>📊 營運儀表板</button>
          <button onClick={() => setActiveTab('records')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'records' ? 'bg-indigo-600 font-bold shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-800'}`}>📄 歷史核銷紀錄</button>
          <button onClick={() => setActiveTab('ai')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-indigo-600 font-bold shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-800'}`}>✨ AI 智慧顧問</button>
          <div className="mt-8 pt-8 border-t border-slate-800">
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white text-black font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}>⚙️ 系統參數設定</button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold animate-pulse">正在同步雲端分類數據...</p>
          </div>
        ) : activeTab === 'records' ? (
          <div className="space-y-10 pb-20">
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-200/60">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-wrap justify-between items-center gap-6">
                <div>
                  <h2 className="text-xl font-black text-black">全部分類流水帳</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">共 {filteredTransactions.length} 筆項目</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <input 
                    type="month" 
                    value={monthSearch} 
                    onChange={e => setMonthSearch(e.target.value)} 
                    className="text-xs font-black border border-slate-200 bg-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 ring-indigo-500/10" 
                  />
                  
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setRecordFilter('全部')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${recordFilter === '全部' ? 'bg-white text-black shadow-sm' : 'text-slate-500'}`}>全部</button>
                    {Object.values(TransactionType).map(f => (
                      <button key={f} onClick={() => setRecordFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${recordFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{f}</button>
                    ))}
                  </div>

                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-xs"
                  >
                    匯出報表
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b">
                    <tr>
                      <th className="px-8 py-5">結算日期</th>
                      <th className="px-8 py-5">料件與機台</th>
                      <th className="px-8 py-5 text-right">數量</th>
                      <th className="px-8 py-5 text-right">總金額</th>
                      <th className="px-8 py-5 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map(t => (
                      <tr key={t.id} className="group hover:bg-slate-50/80 transition-all">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-black">{t.date}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black mt-1 ${t.type === TransactionType.INBOUND ? 'bg-indigo-100 text-indigo-700' : t.type === TransactionType.USAGE ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{t.type}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-800 text-white flex items-center justify-center rounded-lg text-[10px] font-black shadow-sm">{t.machineNumber || '--'}</div>
                            <div>
                              <p className="font-bold text-black text-sm">{t.materialName}</p>
                              <p className="text-[10px] text-slate-400 font-bold">P/N: {t.materialNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-black">{t.quantity}</td>
                        <td className="px-8 py-5 text-right font-black text-indigo-600">NT$ {t.total.toLocaleString()}</td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditingTransaction(t)} className="p-2 bg-white shadow-sm border rounded-lg hover:border-indigo-500 text-indigo-500 transition-all">✏️</button>
                            <button onClick={() => setConfirmDeleteTarget(t)} className="p-2 bg-white shadow-sm border rounded-lg hover:border-rose-500 text-rose-500 transition-all">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-10">
            <Dashboard transactions={transactions} />
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              <div className="xl:col-span-4"><TransactionForm onSave={(tx) => handleAction(tx, 'save')} /></div>
              <div className="xl:col-span-8 bg-white rounded-[2.5rem] shadow-xl p-10 border border-slate-200/60">
                <h3 className="text-xl font-black text-black mb-8">最新動態摘要</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 7).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xs font-black border shadow-sm text-indigo-600">
                           {t.type.charAt(0)}
                         </div>
                         <div>
                           <p className="font-bold text-black text-sm">{t.materialName}</p>
                           <p className="text-[10px] text-slate-400 font-bold">{t.type} · {t.date}</p>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-600 text-sm">NT$ {t.total.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase">{t.machineNumber || 'General'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'ai' ? (
          <div className="max-w-4xl mx-auto space-y-10">
             <div className="bg-slate-900 p-16 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <h2 className="text-3xl font-black mb-4">Gemini AI 營運洞察</h2>
              <p className="text-slate-400 mb-10 max-w-md mx-auto font-medium">基於歷史數據分析各機台損耗與採購建議。</p>
              <button 
                onClick={async () => { setIsAnalyzing(true); setAiReport(await analyzeWarehouseData(transactions)); setIsAnalyzing(false); }} 
                className="bg-indigo-600 px-12 py-5 rounded-2xl font-black hover:bg-indigo-700 shadow-xl transition-all active:scale-95"
              >
                {isAnalyzing ? "正在解析數據模型..." : "生成智慧分析報告"}
              </button>
            </div>
            {aiReport && (
              <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-200/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap font-medium leading-relaxed text-black">{aiReport}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white p-16 rounded-[3rem] shadow-xl border border-slate-200/60">
            <h2 className="text-2xl font-black text-black mb-12 flex items-center gap-3">
              <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
              連線參數設定
            </h2>
            <div className="space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Google Apps Script API 網址</label>
                <input 
                  type="url" 
                  value={scriptUrl} 
                  onChange={e => setScriptUrl(e.target.value)} 
                  className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-black" 
                />
              </div>
              <button 
                onClick={() => { localStorage.setItem('google_sheet_script_url', scriptUrl); window.location.reload(); }} 
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl hover:bg-black transition-all active:scale-[0.98]"
              >
                儲存設定並重啟系統
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
