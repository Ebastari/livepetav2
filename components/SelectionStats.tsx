
import React, { useMemo } from 'react';
import { TreeData } from '../types';

interface SelectionStatsProps {
  data: TreeData[];
  onClose: () => void;
}

export const SelectionStats: React.FC<SelectionStatsProps> = ({ data, onClose }) => {
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    
    const totalTrees = data.length;
    const avgHeight = data.reduce((acc, curr) => acc + Number(curr.Tinggi), 0) / totalTrees;
    const totalCarbon = data.reduce((acc, curr) => acc + (curr.carbon || 0), 0);
    
    // Group by health
    const healthCounts = data.reduce((acc, curr) => {
      acc[curr.Kesehatan] = (acc[curr.Kesehatan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalTrees, avgHeight, totalCarbon, healthCounts };
  }, [data]);

  if (!stats) return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-bottom-10 duration-300">
      <div className="glass-dark bg-slate-900/95 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col items-center gap-4">
        <p className="text-white text-xs font-black uppercase tracking-widest opacity-60">Tidak ada pohon di dalam area seleksi</p>
        <button onClick={onClose} className="bg-white text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Tutup</button>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[3000] w-[90%] max-w-xl animate-in slide-in-from-bottom-10 duration-500">
      <div className="glass-dark bg-slate-900/95 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.7)] flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">Statistik Area Seleksi</h2>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-2">Agregasi Data Spasial Berbasis Poligon</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Populasi</p>
            <h3 className="text-2xl font-black text-white">{stats.totalTrees} <span className="text-[10px] text-slate-400">Poh</span></h3>
          </div>
          <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Mean Tinggi</p>
            <h3 className="text-2xl font-black text-white">{Math.round(stats.avgHeight)} <span className="text-[10px] text-slate-400">CM</span></h3>
          </div>
          <div className="bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20">
            <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Total Karbon</p>
            <h3 className="text-2xl font-black text-white">{stats.totalCarbon.toFixed(1)} <span className="text-[10px] text-slate-400">KG</span></h3>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-3xl border border-blue-500/20">
            <p className="text-[8px] font-black text-blue-500 uppercase mb-1">Sehat</p>
            <h3 className="text-2xl font-black text-white">{stats.healthCounts['Sehat'] || 0} <span className="text-[10px] text-slate-400">Poh</span></h3>
          </div>
        </div>

        <div className="flex gap-2">
           <button onClick={onClose} className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">Selesai Seleksi</button>
        </div>
      </div>
    </div>
  );
};
