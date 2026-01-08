
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from './types';
import TransactionForm from './components/TransactionForm';
import Dashboard from './components/Dashboard';
import { analyzeWarehouseData } from './services/geminiService';
import { dbService } from './services/dbService';
import { exportToExcel } from './services/reportService';

// 已更新為您提供的專屬部署網址
const DEFAULT_URL = "https://script.google.com/macros/s/AKfycbzcEs1dizcea8uBRytCpgzslGiMzsEc4DsrxqHc4wdag4yBf0DBOxYl55sR2Fjkn_VT/exec";

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'ai' | 'settings'>('dashboard');
  const [recordFilter, setRecordFilter] = useState<'全部' | TransactionType>('全部');
  const [selectedExportMonth, setSelectedExportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [aiReport, setAiReport] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'local' | 'error' | 'unconfigured'>('unconfigured');
  
  // 初始化檢查：若 localStorage 沒有網址，自動填入預設網址
  useEffect(() => {
    if (!localStorage.getItem('google_sheet_script_url')) {
      localStorage.setItem('google_sheet_script_url', DEFAULT_URL);
    }
  }, []);

  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('google_sheet_script_url') || DEFAULT_URL);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(localStorage.getItem('use_local_only') === 'true');

  const loadData = async () => {
    setIsLoading(true);
    if (useLocalOnly) {
      const localData = JSON.parse(localStorage.getItem('local_transactions') || '[]');
      setTransactions(localData);
      setDbStatus('local');
      setIsLoading(false);
      return;
    }
    if (!dbService.isConfigured()) {
      setDbStatus('unconfigured');
      setIsLoading(false);
      return;
    }
    try {
      const data = await dbService.fetchAll();
      const sorted = (data || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(sorted);
      setDbStatus('connected');
    } catch (e) {
      setDbStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [useLocalOnly]);

  const filteredTransactions = recordFilter === '全部' 
    ? transactions 
    : transactions.filter(t => t.type === recordFilter);

  const handleSaveSettings = () => {
    const url = scriptUrl.trim();
    if (!url.startsWith('https://script.google.com/')) {
      alert("❌ 網址格式錯誤");
      return;
    }
    localStorage.setItem('google_sheet_script_url', url);
    localStorage.setItem('use_local_only', 'false');
    window.location.reload();
  };

  const applyDefaultUrl = () => {
    setScriptUrl(DEFAULT_URL);
    localStorage.setItem('google_sheet_script_url', DEFAULT_URL);
    alert("✅ 已填入預設連結，請點擊「儲存並啟用」以完成生效。");
  };

  const handleAddTransaction = async (newTx: Transaction): Promise<boolean> => {
    if (useLocalOnly) {
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('local_transactions', JSON.stringify(updated));
      return true;
    }
    if (!dbService.isConfigured()) {
      alert("⚠️ 請先在『連線設定』中配置正確的網址");
      setActiveTab('settings');
      return false;
    }
    const success = await dbService.save(newTx);
    if (success) {
      setTransactions(prev => [newTx, ...prev]);
      return true;
    }
    return false;
  };

  const handleDelete = async (id: string, type: TransactionType) => {
    if (!window.confirm("確定刪除此筆紀錄？")) return;
    if (useLocalOnly) {
      const updated = transactions.filter(x => x.id !== id);
      setTransactions(updated);
      localStorage.setItem('local_transactions', JSON.stringify(updated));
    } else {
      const success = await dbService.delete(id, type);
      if (success) {
        setTransactions(prev => prev.filter(x => x.id !== id));
      } else {
        alert("刪除失敗，請檢查網路連線。");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-slate-950 text-white p-8 flex flex-col shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">倉</div>
          <div>
            <h1 className="text-xl font-bold">倉管月結系統</h1>
            <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Custom Sync V8.6</p>
          </div>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 font-bold shadow-lg' : 'text-slate-400 hover:bg-slate-900'}`}>📊 數據儀表板</button>
          <button onClick={() => setActiveTab('records')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'records' ? 'bg-indigo-600 font-bold shadow-lg' : 'text-slate-400 hover:bg-slate-900'}`}>📄 分類流水帳</button>
          <button onClick={() => setActiveTab('ai')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-indigo-600 font-bold shadow-lg' : 'text-slate-400 hover:bg-slate-900'}`}>✨ AI 庫存分析</button>
          <div className="mt-8 pt-8 border-t border-slate-900">
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white text-slate-950 font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-900'}`}>⚙️ 連線設定</button>
          </div>
        </nav>

        <div className="mt-8 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'local' ? 'bg-indigo-400' : 'bg-rose-500'}`}></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {dbStatus === 'connected' ? '雲端同步中' : dbStatus === 'local' ? '本地模式' : '連線異常'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-bold mb-1">本月結算總額</p>
          <p className="text-2xl font-black">NT$ {transactions.reduce((s,t)=>s+t.total,0).toLocaleString()}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        {isLoading && activeTab !== 'settings' ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-bold">正在讀取庫存...</p>
            </div>
          </div>
        ) : activeTab === 'records' ? (
          <div className="space-y-10 pb-20">
            {/* 報表匯出中心 */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm">📈</div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">月份報表產生器</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">選取月份並匯出分頁 Excel 報表</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input 
                  type="month" 
                  value={selectedExportMonth}
                  onChange={(e) => setSelectedExportMonth(e.target.value)}
                  className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button 
                  onClick={() => exportToExcel(transactions, selectedExportMonth)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                >
                  <span>📊</span> 匯出月結報表
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
              {/* List UI (same as before) */}
              <div className="p-10 border-b border-slate-100 bg-slate-50/30">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <h2 className="text-2xl font-black text-slate-900">分類核銷流水帳</h2>
                  <div className="flex bg-white p-1 rounded-2xl shadow-inner border border-slate-100 overflow-x-auto max-w-full">
                    <button onClick={() => setRecordFilter('全部')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${recordFilter === '全部' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>📂 全部彙整</button>
                    {Object.values(TransactionType).map((f) => (
                      <button key={f} onClick={() => setRecordFilter(f)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${recordFilter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>📄 {f}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-6">日期 / 工作表</th>
                      <th className="px-8 py-6">料件資訊</th>
                      <th className="px-8 py-6">項目摘要</th>
                      <th className="px-8 py-6 text-right">數量</th>
                      <th className="px-8 py-6 text-right text-indigo-600">總計</th>
                      <th className="px-8 py-6 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold">尚無任何核銷紀錄</td></tr>
                    ) : filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-slate-500 mb-1">{t.date}</p>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${t.type === TransactionType.INBOUND ? 'bg-indigo-100 text-indigo-700' : t.type === TransactionType.USAGE ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{t.type}</span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-bold text-slate-800">{t.materialName}</p>
                          <p className="text-[10px] text-indigo-500 font-black mt-1">NO: {t.materialNumber}</p>
                        </td>
                        <td className="px-8 py-6 text-sm text-slate-700 font-medium">{t.itemName}</td>
                        <td className="px-8 py-6 text-right font-bold text-slate-600">{t.quantity}</td>
                        <td className="px-8 py-6 text-right font-black text-indigo-600 whitespace-nowrap">NT$ {t.total.toLocaleString()}</td>
                        <td className="px-8 py-6 text-center">
                          <button onClick={() => handleDelete(t.id, t.type)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all mx-auto">🗑️</button>
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
              <div className="xl:col-span-4"><TransactionForm onAdd={handleAddTransaction} /></div>
              <div className="xl:col-span-8 bg-white rounded-[2.5rem] shadow-xl p-10 border border-slate-50 overflow-hidden">
                <h3 className="text-xl font-black mb-6 text-slate-900">近期異動紀錄</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xs font-black shadow-sm text-slate-400">{String(t.materialNumber).slice(-2)}</div>
                        <div>
                          <p className="font-bold text-slate-900">{t.materialName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.type} · NO: {t.materialNumber}</p>
                        </div>
                      </div>
                      <p className="font-black text-indigo-600">NT$ {t.total.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="max-w-4xl mx-auto pb-20">
            <div className="bg-white p-10 lg:p-16 rounded-[3rem] shadow-xl border border-slate-100">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black text-slate-900">Google Sheet 分流設定</h2>
                <button onClick={applyDefaultUrl} className="text-indigo-600 font-bold hover:underline text-sm">🔄 套用系統預設網址</button>
              </div>
              <div className="space-y-12">
                <section>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">1</span>
                    <h3 className="text-xl font-bold text-slate-900">當前部署網址</h3>
                  </div>
                  <input 
                    type="url" 
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none font-mono text-sm mb-6"
                    value={scriptUrl}
                    onChange={e => setScriptUrl(e.target.value)}
                    placeholder="輸入 https://script.google.com/..."
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={async () => {
                        setIsTesting(true);
                        const res = await dbService.testConnection(scriptUrl);
                        setTestResult(res);
                        setIsTesting(false);
                      }}
                      className="py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200"
                    >
                      {isTesting ? "測試中..." : "🔍 測試分流連線"}
                    </button>
                    <button onClick={handleSaveSettings} className="py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg">🚀 儲存並啟用</button>
                  </div>
                  {testResult && (
                    <div className={`mt-4 p-4 rounded-xl text-sm font-bold ${testResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {testResult.message}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
