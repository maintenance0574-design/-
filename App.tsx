
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from './types';
import TransactionForm from './components/TransactionForm';
import Dashboard from './components/Dashboard';
import { analyzeWarehouseData } from './services/geminiService';
import { dbService } from './services/dbService';

const GOOGLE_SCRIPT_CODE = `// 倉儲系統專用腳本 V4.0 - 支援多工作表分類
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = ["進貨", "用料", "建置"];
  var allData = [];
  
  sheetNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(["id", "date", "type", "itemName", "quantity", "unitPrice", "total", "note"]);
      return;
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    
    var headers = data.shift();
    var json = data.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) { obj[header] = row[i]; });
      return obj;
    });
    allData = allData.concat(json);
  });
  
  return createJsonOutput(allData);
}

function doPost(e) {
  var params = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (params.action === 'insert') {
    var sheetName = params.data.type;
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["id", "date", "type", "itemName", "quantity", "unitPrice", "total", "note"]);
    }
    sheet.appendRow([params.data.id, params.data.date, params.data.type, params.data.itemName, params.data.quantity, params.data.unitPrice, params.data.total, params.data.note]);
  } else if (params.action === 'delete') {
    // 優先搜尋指定的類別工作表，若無則搜尋全部
    var sheetNames = params.type ? [params.type] : ["進貨", "用料", "建置"];
    sheetNames.forEach(function(name) {
      var sheet = ss.getSheetByName(name);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) { sheet.deleteRow(i + 1); break; }
      }
    });
  }
  return createJsonOutput({status: "Success"});
}

function createJsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'ai' | 'settings'>('dashboard');
  const [aiReport, setAiReport] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'local' | 'error' | 'unconfigured'>('unconfigured');
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('google_sheet_script_url') || '');
  const [testResult, setTestResult] = useState<{success: boolean, message: string, detail?: string} | null>(null);
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
      setActiveTab('settings');
      setIsLoading(false);
      return;
    }

    try {
      const data = await dbService.fetchAll();
      // 按日期排序
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(sorted);
      setDbStatus('connected');
    } catch (e) {
      setDbStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [useLocalOnly]);

  const handleSaveSettings = () => {
    const url = scriptUrl.trim();
    if (!url.startsWith('https://script.google.com/')) {
      alert("❌ 網址格式不正確");
      return;
    }
    localStorage.setItem('google_sheet_script_url', url);
    localStorage.setItem('use_local_only', 'false');
    window.location.reload();
  };

  const handleAddTransaction = async (newTx: Transaction) => {
    if (useLocalOnly || dbStatus !== 'connected') {
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('local_transactions', JSON.stringify(updated));
      if (dbStatus === 'connected') await dbService.save(newTx);
    } else {
      const success = await dbService.save(newTx);
      if (success) setTransactions(prev => [newTx, ...prev]);
    }
  };

  const handleDelete = async (id: string, type: TransactionType) => {
    if (!window.confirm("確定刪除此筆紀錄？")) return;
    
    if (useLocalOnly) {
      const updated = transactions.filter(x => x.id !== id);
      setTransactions(updated);
      localStorage.setItem('local_transactions', JSON.stringify(updated));
    } else {
      if (await dbService.delete(id, type)) {
        setTransactions(prev => prev.filter(x => x.id !== id));
      } else {
        alert("刪除失敗，請檢查網路。");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
      <aside className="w-full lg:w-80 bg-slate-950 text-white p-8 flex flex-col shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">倉</div>
          <div>
            <h1 className="text-xl font-bold">倉管月結系統</h1>
            <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Multi-Sheet V4</p>
          </div>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 font-bold shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-900'}`}>📊 數據儀表板</button>
          <button onClick={() => setActiveTab('records')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'records' ? 'bg-indigo-600 font-bold' : 'text-slate-400 hover:bg-slate-900'}`}>📄 分類流水帳</button>
          <button onClick={() => setActiveTab('ai')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-indigo-600 font-bold' : 'text-slate-400 hover:bg-slate-900'}`}>✨ AI 庫存分析</button>
          <div className="mt-8 pt-8 border-t border-slate-900">
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-6 py-4 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white text-slate-950 font-bold' : 'text-slate-500 hover:bg-slate-900'}`}>⚙️ 連線設定</button>
          </div>
        </nav>

        <div className="mt-8 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dbStatus === 'connected' ? '已連線雲端' : '本地儲存模式'}</span>
          </div>
          <p className="text-xs text-slate-500 font-bold mb-1">本月合計支出</p>
          <p className="text-2xl font-black">NT$ {transactions.reduce((s,t)=>s+t.total,0).toLocaleString()}</p>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        {activeTab === 'settings' ? (
          <div className="max-w-4xl mx-auto space-y-10 pb-20">
            <div className="bg-white p-10 lg:p-16 rounded-[3rem] shadow-xl border border-slate-100">
              <h2 className="text-3xl font-black text-slate-900 mb-6">Google Sheet 分類連線精靈</h2>
              <p className="text-slate-500 mb-8">此版本將自動在您的試算表建立「進貨」、「用料」、「建置」三個分頁。</p>
              
              <div className="space-y-12">
                <section>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">1</span>
                    <h3 className="text-xl font-bold">複製分類腳本代碼</h3>
                  </div>
                  <div className="relative group">
                    <pre className="bg-slate-900 text-indigo-300 p-6 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
                      {GOOGLE_SCRIPT_CODE}
                    </pre>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE); alert("代碼已複製！"); }}
                      className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      📋 點擊複製
                    </button>
                  </div>
                </section>

                <section className="pt-10 border-t border-slate-100">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">2</span>
                    <h3 className="text-xl font-bold text-slate-900">輸入部署網址</h3>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="url" 
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none font-mono text-sm"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={scriptUrl}
                      onChange={e => setScriptUrl(e.target.value)}
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
                        {isTesting ? "連線測試中..." : "🔍 測試連線"}
                      </button>
                      <button onClick={handleSaveSettings} className="py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200">
                        🚀 儲存並啟用
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div className={`mt-6 p-6 rounded-2xl border-2 ${testResult.success ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      <p className={`font-black mb-1 ${testResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>{testResult.success ? '✅ 連線成功！' : '❌ 連線失敗'}</p>
                      <p className="text-xs text-slate-600">{testResult.message}</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {activeTab === 'dashboard' && (
              <>
                <Dashboard transactions={transactions} />
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  <div className="xl:col-span-4"><TransactionForm onAdd={handleAddTransaction} /></div>
                  <div className="xl:col-span-8 bg-white rounded-[2.5rem] shadow-xl p-10 border border-slate-50">
                    <h3 className="text-xl font-black mb-6 text-slate-900">近期結算紀錄</h3>
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map(t => (
                        <div key={t.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all">
                          <div>
                            <p className="font-bold text-slate-900">{t.itemName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.date} · <span className="text-indigo-600">{t.type}</span></p>
                          </div>
                          <p className="font-black text-indigo-600">NT$ {t.total.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'records' && (
              <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <h2 className="text-2xl font-black text-slate-900">單據流水帳 (跨頁彙整)</h2>
                  <button onClick={loadData} className="px-6 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-sm font-bold">刷新數據</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-6">日期</th>
                        <th className="px-8 py-6">工作頁(類別)</th>
                        <th className="px-8 py-6">品項名稱</th>
                        <th className="px-8 py-6 text-right">總額</th>
                        <th className="px-8 py-6 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6 text-sm font-bold text-slate-500">{t.date}</td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                              t.type === TransactionType.INBOUND ? 'bg-indigo-100 text-indigo-700' :
                              t.type === TransactionType.USAGE ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>{t.type}</span>
                          </td>
                          <td className="px-8 py-6 font-bold text-slate-800">{t.itemName}</td>
                          <td className="px-8 py-6 text-right font-black text-indigo-600">NT$ {t.total.toLocaleString()}</td>
                          <td className="px-8 py-6 text-center">
                            <button onClick={() => handleDelete(t.id, t.type)} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="max-w-4xl mx-auto space-y-10">
                <div className="bg-indigo-600 p-16 rounded-[3rem] text-white text-center shadow-xl">
                  <h2 className="text-3xl font-black mb-4">Gemini 數據洞察</h2>
                  <p className="text-indigo-100 mb-8 opacity-80 font-medium">基於「進貨、用料、建置」三大工作表進行深度分析</p>
                  <button 
                    onClick={async () => {
                      setIsAnalyzing(true);
                      const report = await analyzeWarehouseData(transactions);
                      setAiReport(report);
                      setIsAnalyzing(false);
                    }} 
                    disabled={isAnalyzing || transactions.length === 0}
                    className="bg-white text-indigo-600 px-12 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? "分析中..." : "產生分析報告"}
                  </button>
                </div>
                {aiReport && (
                  <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8">
                    <div className="prose prose-slate max-w-none">
                      <div className="whitespace-pre-wrap font-medium text-slate-700 leading-relaxed">{aiReport}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
