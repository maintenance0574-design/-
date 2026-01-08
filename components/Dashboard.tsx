
import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { 
  ResponsiveContainer, 
  XAxis, YAxis, Tooltip,
  AreaChart, Area, CartesianGrid,
  Defs, LinearGradient
} from 'recharts';

interface Props {
  transactions: Transaction[];
}

const COLORS = {
  [TransactionType.INBOUND]: '#6366f1',
  [TransactionType.USAGE]: '#f43f5e',
  [TransactionType.CONSTRUCTION]: '#f59e0b'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    return (
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-xl">
        <p className="text-xs font-black text-slate-400 mb-3 uppercase tracking-tighter">{label} 支出統計</p>
        <div className="space-y-2">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs font-bold text-slate-300">{entry.name}</span>
              </div>
              <span className="text-xs font-black">NT$ {entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
          <span className="text-xs font-black text-indigo-400">當月總計</span>
          <span className="text-sm font-black text-white">NT$ {total.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<Props> = ({ transactions }) => {
  const stats = transactions.reduce((acc, curr) => {
    if (curr.type === TransactionType.INBOUND) acc.inbound += curr.total;
    if (curr.type === TransactionType.USAGE) acc.usage += curr.total;
    if (curr.type === TransactionType.CONSTRUCTION) acc.construction += curr.total;
    return acc;
  }, { inbound: 0, usage: 0, construction: 0 });

  const trendData = useMemo(() => {
    const monthsMap: Record<string, any> = {};
    transactions.forEach(t => {
      const monthKey = t.date.substring(0, 7);
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          month: monthKey,
          [TransactionType.INBOUND]: 0,
          [TransactionType.USAGE]: 0,
          [TransactionType.CONSTRUCTION]: 0,
        };
      }
      monthsMap[monthKey][t.type] += t.total;
    });
    return Object.values(monthsMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        ...item,
        displayMonth: `${item.month.split('-')[1]}月`
      }));
  }, [transactions]);

  const formatCurrency = (val: number) => `NT$ ${val.toLocaleString()}`;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between group hover:border-indigo-500/30 transition-all cursor-default">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">進貨結算</p>
            <p className="text-2xl font-black text-black group-hover:text-indigo-600 transition-colors">{formatCurrency(stats.inbound)}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:rotate-6 transition-transform">📥</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between group hover:border-rose-500/30 transition-all cursor-default">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">用料核銷</p>
            <p className="text-2xl font-black text-black group-hover:text-rose-600 transition-colors">{formatCurrency(stats.usage)}</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:rotate-6 transition-transform">♻️</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between group hover:border-amber-500/30 transition-all cursor-default">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">建置支出</p>
            <p className="text-2xl font-black text-black group-hover:text-amber-600 transition-colors">{formatCurrency(stats.construction)}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:rotate-6 transition-transform">🏗️</div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative">
         <div className="flex justify-between items-center mb-10">
           <h3 className="text-xl font-black text-black tracking-tight">年度支出趨勢分析</h3>
           <div className="flex gap-4">
             {Object.entries(COLORS).map(([type, color]) => (
               <div key={type} className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                 <span className="text-[10px] font-black text-slate-500 uppercase">{type}</span>
               </div>
             ))}
           </div>
         </div>
         <div className="h-80 -ml-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[TransactionType.INBOUND]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS[TransactionType.INBOUND]} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[TransactionType.USAGE]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS[TransactionType.USAGE]} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorConstruction" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[TransactionType.CONSTRUCTION]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS[TransactionType.CONSTRUCTION]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayMonth" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                tickFormatter={(val) => `NT$${val >= 1000 ? (val / 1000) + 'k' : val}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
              <Area 
                type="monotone" 
                name={TransactionType.INBOUND}
                dataKey={TransactionType.INBOUND} 
                stroke={COLORS[TransactionType.INBOUND]} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorInbound)" 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                name={TransactionType.USAGE}
                dataKey={TransactionType.USAGE} 
                stroke={COLORS[TransactionType.USAGE]} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorUsage)" 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                name={TransactionType.CONSTRUCTION}
                dataKey={TransactionType.CONSTRUCTION} 
                stroke={COLORS[TransactionType.CONSTRUCTION]} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorConstruction)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
