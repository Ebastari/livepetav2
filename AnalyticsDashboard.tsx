
import React, { useMemo } from 'react';
import { TreeData } from './types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Scatter, Line, ComposedChart, ScatterChart
} from 'recharts';

interface Props { isOpen: boolean; onClose: () => void; data: TreeData[]; }

export const AnalyticsDashboard: React.FC<Props> = ({ isOpen, onClose, data }) => {
  const stats = useMemo(() => {
    const valid = data.filter(d => Number(d.Tinggi) > 0);
    if (!valid.length) return null;

    const heights = valid.map(d => Number(d.Tinggi) / 100);
    const meanH = heights.reduce((a, b) => a + b, 0) / valid.length;
    const totalC = valid.reduce((a, b) => a + (b.carbon || 0), 0) / 1000;
    const totalCO2e = totalC * (44/12);
    
    // Regression points
    const points = valid.map(d => ({ x: Number(d.Tinggi) / 100, y: d.carbon || 0 }));
    const n = points.length;
    const sumX = points.reduce((a, b) => a + b.x, 0);
    const sumY = points.reduce((a, b) => a + b.y, 0);
    const sumXY = points.reduce((a, b) => a + (b.x * b.y), 0);
    const sumX2 = points.reduce((a, b) => a + (b.x * b.x), 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const regLine = [
      { x: Math.min(...points.map(p => p.x)), y: slope * Math.min(...points.map(p => p.x)) + intercept },
      { x: Math.max(...points.map(p => p.x)), y: slope * Math.max(...points.map(p => p.x)) + intercept }
    ];

    const histogram = Array.from({ length: 6 }, (_, i) => ({
      range: `${i * 2}-${(i + 1) * 2}m`,
      count: heights.filter(h => h >= i * 2 && h < (i + 1) * 2).length
    }));

    const forecast = [2025, 2030, 2035, 2040, 2045, 2050].map((year, i) => ({
      year,
      val: totalCO2e * Math.pow(1.1, i)
    }));

    return { meanH, totalC, totalCO2e, regLine, points, histogram, forecast, total: valid.length };
  }, [data]);

  if (!isOpen || !stats) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-slate-950 flex flex-col p-8 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Carbon Analytics Engine</h2>
          <p className="text-emerald-400 text-[10px] font-black tracking-widest uppercase">Science-Based Forest Monitoring</p>
        </div>
        <button onClick={onClose} className="bg-white/5 p-4 rounded-3xl border border-white/10 text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Carbon</p>
            <h3 className="text-4xl font-black text-emerald-400">{stats.totalC.toFixed(2)} <span className="text-sm">Ton C</span></h3>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CO2 Equivalent</p>
            <h3 className="text-4xl font-black text-blue-400">{stats.totalCO2e.toFixed(2)} <span className="text-sm">Ton</span></h3>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mean Height</p>
            <h3 className="text-4xl font-black text-white">{stats.meanH.toFixed(2)} <span className="text-sm">m</span></h3>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Economic Value</p>
            <h3 className="text-2xl font-black text-emerald-400">Rp {(stats.totalCO2e * 1900000).toLocaleString()}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 h-80">
            <h4 className="text-xs font-black text-white uppercase mb-4">Regression: Height vs Carbon</h4>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis type="number" dataKey="x" stroke="#475569" fontSize={10} name="Tinggi (m)" />
                <YAxis type="number" dataKey="y" stroke="#475569" fontSize={10} name="Karbon (kg)" />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px' }} />
                <Scatter name="Actual" data={stats.points} fill="#3b82f6" fillOpacity={0.6} />
                <Line type="monotone" data={stats.regLine} dataKey="y" stroke="#f59e0b" strokeWidth={3} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 h-80">
            <h4 className="text-xs font-black text-white uppercase mb-4">Height Distribution (Histogram)</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.histogram}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="range" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 h-80">
          <h4 className="text-xs font-black text-white uppercase mb-4">Carbon Forecast (Towards 2050)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.forecast}>
              <defs><linearGradient id="clr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="#475569" fontSize={10} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={4} fill="url(#clr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
