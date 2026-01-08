
import React from 'react';
import { Transaction, TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Props {
  transactions: Transaction[];
}

const COLORS = {
  [TransactionType.INBOUND]: '#6366f1', // Indigo
  [TransactionType.USAGE]: '#f43f5e',   // Rose
  [TransactionType.CONSTRUCTION]: '#f59e0b' // Amber
};

const Dashboard: React.FC<Props> = ({ transactions }) => {
  const stats = transactions.reduce((acc, curr) => {
    if (curr.type === TransactionType.INBOUND) acc.inbound += curr.total;
    if (curr.type === TransactionType.USAGE) acc.usage += curr.total;
    if (curr.type === TransactionType.CONSTRUCTION) acc.construction += curr.total;
    return acc;
  }, { inbound: 0, usage: 0, construction: 0 });

  const pieData = [
    { name: '進貨核銷', value: stats.inbound, color: COLORS[TransactionType.INBOUND] },
    { name: '領料用料', value: stats.usage, color: COLORS[TransactionType.USAGE] },
    { name: '倉儲建置', value: stats.construction, color: COLORS[TransactionType.CONSTRUCTION] }
  ].filter(d => d.value > 0);

  const formatCurrency = (val: number) => `NT$ ${val.toLocaleString()}`;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Inbound Card */}
        <div className="group bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-2 duration-500 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl shadow-sm">📥</div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">本月進貨總額</p>
            </div>
            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">{formatCurrency(stats.inbound)}</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-50/50 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
        </div>

        {/* Usage Card */}
        <div className="group bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-2 duration-500 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-xl shadow-sm">♻️</div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">本月用料總額</p>
            </div>
            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">{formatCurrency(stats.usage)}</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-rose-50/50 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
        </div>

        {/* Construction Card */}
        <div className="group bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-2 duration-500 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-xl shadow-sm">🏗️</div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">本月建置總額</p>
            </div>
            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">{formatCurrency(stats.construction)}</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-50/50 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-900 tracking-tight underline decoration-indigo-500 decoration-4 underline-offset-8">費用結構分析</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">按金額比例</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  formatter={(value: number) => formatCurrency(value)} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-900 tracking-tight underline decoration-rose-500 decoration-4 underline-offset-8">支出對比矩陣</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">橫向成本分析</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#64748b' }} width={80} />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                   formatter={(value: number) => formatCurrency(value)} 
                />
                <Bar dataKey="value" radius={[0, 15, 15, 0]} barSize={40}>
                  {pieData.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
