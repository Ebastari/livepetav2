
import React, { useMemo, useState } from 'react';
import { TreeData, HEALTH_COLORS, getImageUrl } from '../types';

interface SelectionStatsProps {
  data: TreeData[];
  onClose: () => void;
  onFocusTree?: (tree: TreeData) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export const SelectionStats: React.FC<SelectionStatsProps> = ({ data, onClose, onFocusTree, onBulkDelete }) => {
  const [showList, setShowList] = useState(false);

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

    // Group by species
    const speciesCounts = data.reduce((acc, curr) => {
      acc[curr.Tanaman] = (acc[curr.Tanaman] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalTrees, avgHeight, totalCarbon, healthCounts, speciesCounts };
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
    <div className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 z-[3000] w-[95%] max-w-2xl animate-in slide-in-from-bottom-10 duration-500">
      <div className="glass-dark bg-slate-900/95 backdrop-blur-2xl p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.7)] flex flex-col gap-4 sm:gap-6 max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter leading-none">Hasil Seleksi Area</h2>
            <p className="text-[9px] sm:text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1 sm:mt-2">{stats.totalTrees} Pohon Terseleksi · {Object.keys(stats.speciesCounts).length} Jenis</p>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white/5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Populasi</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{stats.totalTrees} <span className="text-[9px] text-slate-400">Poh</span></h3>
          </div>
          <div className="bg-white/5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Mean Tinggi</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{Math.round(stats.avgHeight)} <span className="text-[9px] text-slate-400">CM</span></h3>
          </div>
          <div className="bg-emerald-500/10 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-emerald-500/20">
            <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Total Karbon</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{stats.totalCarbon.toFixed(1)} <span className="text-[9px] text-slate-400">KG</span></h3>
          </div>
          <div className="bg-blue-500/10 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-blue-500/20">
            <p className="text-[8px] font-black text-blue-500 uppercase mb-1">Sehat</p>
            <h3 className="text-xl sm:text-2xl font-black text-white">{stats.healthCounts['Sehat'] || 0} <span className="text-[9px] text-slate-400">Poh</span></h3>
          </div>
        </div>

        {/* Species Breakdown */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {Object.entries(stats.speciesCounts).sort((a, b) => b[1] - a[1]).map(([species, count]) => (
            <span key={species} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[9px] font-black text-white uppercase">
              {species} <span className="text-blue-400 ml-1">{count}</span>
            </span>
          ))}
        </div>

        {/* Toggle Detail List */}
        <button 
          onClick={() => setShowList(!showList)} 
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${showList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
          {showList ? 'Sembunyikan Detail' : `Lihat Detail ${stats.totalTrees} Pohon`}
        </button>

        {/* Tree Detail List */}
        {showList && (
          <div className="overflow-y-auto max-h-[40vh] space-y-2 pr-1 custom-scrollbar">
            {data.map((tree, i) => (
              <div 
                key={`${tree["No Pohon"]}-${i}`} 
                className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 flex items-center gap-3 transition-all cursor-pointer group"
                onClick={() => onFocusTree?.(tree)}
              >
                <img 
                  src={getImageUrl(tree, 'small')} 
                  alt={tree.Tanaman}
                  className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-white/10 group-hover:border-blue-500/50 transition-all"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-white truncate">
                      #{tree["No Pohon"]}
                    </p>
                    <span className="text-[9px] font-black text-blue-400 uppercase truncate">{tree.Tanaman}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[8px] text-slate-400 font-bold">Tinggi: {tree.Tinggi}cm</span>
                    <span className="text-[8px] text-slate-400 font-bold">Karbon: {(tree.carbon || 0).toFixed(2)}kg</span>
                    <span className="text-[8px] text-slate-400 font-bold">{tree.Pengawas}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: HEALTH_COLORS[tree.Kesehatan] || '#3b82f6' }} 
                    title={tree.Kesehatan}
                  />
                  <span className="text-[8px] font-black uppercase" style={{ color: HEALTH_COLORS[tree.Kesehatan] || '#3b82f6' }}>
                    {tree.Kesehatan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onBulkDelete && (
            <button 
              onClick={() => {
                if (window.confirm(`Yakin hapus ${stats.totalTrees} pohon yang terseleksi?\n\nPassword: ketik 1212 untuk konfirmasi`)) {
                  const pwd = window.prompt('Masukkan password admin:');
                  if (pwd === '1212') {
                    const ids = data.map(t => String(t["No Pohon"]));
                    onBulkDelete(ids);
                    onClose();
                  } else {
                    alert('Password salah!');
                  }
                }
              }} 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 sm:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Hapus {stats.totalTrees} Pohon
            </button>
          )}
          <button onClick={onClose} className="flex-1 bg-white text-slate-900 py-3 sm:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">Selesai Seleksi</button>
        </div>
      </div>
    </div>
  );
};
