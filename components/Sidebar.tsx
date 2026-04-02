
import React, { useState, useMemo } from 'react';
import { TreeData, HealthStatus, getSpeciesColor } from '../types';

interface SidebarProps {
  data: TreeData[];
  selectedTrees: TreeData[] | null;
  activeSpeciesFilter: string | null;
  onToggleSpeciesFilter: (species: string) => void;
  onSearch: (query: string) => void;
  onToggleBoundary: () => void;
  showBoundary: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ data, selectedTrees, activeSpeciesFilter, onToggleSpeciesFilter, onSearch, onToggleBoundary, showBoundary }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Tampilkan data seleksi jika ada, kalau tidak tampilkan semua
  const displayData = selectedTrees ?? data;
  const isFiltered = selectedTrees !== null;

  const stats = useMemo(() => {
    const total = displayData.length;
    const healthy = displayData.filter(d => d.Kesehatan === HealthStatus.HEALTHY).length;
    const sick = displayData.filter(d => d.Kesehatan === HealthStatus.SICK).length;
    const dead = displayData.filter(d => d.Kesehatan === HealthStatus.DEAD).length;

    const speciesCounts = displayData.reduce((acc, curr) => {
      const name = curr.Tanaman || 'Lainnya';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]);

    return { total, healthy, sick, dead, sortedSpecies };
  }, [displayData]);

  const healthyPercent = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 w-full pointer-events-none sm:fixed sm:top-28 sm:left-6 sm:bottom-6 sm:w-80 sm:z-[1000] sm:gap-4">
      {/* Mobile Compact Header */}
      <div className="sm:hidden bg-slate-900/95 backdrop-blur-xl p-3 rounded-2xl shadow-2xl pointer-events-auto border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-xl">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black text-white uppercase">{stats.total} Pohon · {stats.sortedSpecies.length} Jenis</p>
            <p className="text-[8px] font-bold text-emerald-400">{healthyPercent}% Sehat</p>
          </div>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
        >
          <svg className={`w-5 h-5 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className={`bg-slate-900/95 backdrop-blur-xl p-4 rounded-3xl sm:rounded-[2rem] shadow-2xl pointer-events-auto border border-white/10 sm:block ${isExpanded ? 'block' : 'hidden'}`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Cari ID atau Jenis..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-11 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-500 transition-all"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {/* Main Stats Panel */}
      <div className={`bg-slate-900/95 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl sm:rounded-[2.5rem] shadow-2xl pointer-events-auto overflow-y-auto custom-scrollbar border border-white/10 flex-1 space-y-4 sm:space-y-5 sm:block ${isExpanded ? 'block max-h-[60vh]' : 'hidden'}`}>
        
        {/* Boundary Toggle */}
        <div className="hidden sm:flex bg-white/5 text-white p-4 rounded-[1.8rem] items-center justify-between border border-white/10 shadow-lg hover:bg-white/10 transition-all">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Batas Area</p>
          </div>
          <button 
            onClick={onToggleBoundary}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${showBoundary ? 'bg-blue-600' : 'bg-slate-800'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-500 ${showBoundary ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {/* Ringkasan Populasi */}
        <div>
          {isFiltered && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-3 py-2 mb-3 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Area Terseleksi</span>
            </div>
          )}
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-4xl font-black text-white tracking-tighter leading-none">{stats.total.toLocaleString()}</h2>
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Pohon</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400">
            {stats.sortedSpecies.length} jenis tanaman
          </p>
          {/* Health Bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden flex">
              {stats.total > 0 && (
                <>
                  <div className="h-full bg-emerald-500" style={{ width: `${(stats.healthy/stats.total)*100}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${(stats.sick/stats.total)*100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${(stats.dead/stats.total)*100}%` }} />
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <span className="text-[8px] font-black text-emerald-400 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {stats.healthy} Sehat
            </span>
            <span className="text-[8px] font-black text-amber-400 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> {stats.sick} Merana
            </span>
            <span className="text-[8px] font-black text-red-400 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {stats.dead} Mati
            </span>
          </div>
        </div>

        {/* Legenda Jenis Pohon — clickable */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Jenis Pohon
            </h4>
            {activeSpeciesFilter && (
              <button 
                onClick={() => onToggleSpeciesFilter(activeSpeciesFilter)}
                className="text-[8px] font-black text-red-400 uppercase tracking-tight hover:text-red-300 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          
          <div className="space-y-1 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
            {stats.sortedSpecies.map(([name, count]) => {
              const isActive = activeSpeciesFilter === name;
              const isAnyActive = activeSpeciesFilter !== null;
              const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';
              
              return (
                <button 
                  key={name} 
                  onClick={() => onToggleSpeciesFilter(name)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'} ${isAnyActive && !isActive ? 'opacity-30' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-3 h-3 rounded-full shadow-lg border-2 border-white/30 shrink-0" 
                      style={{ backgroundColor: getSpeciesColor(name) }}
                    />
                    <span className={`text-[10px] font-black uppercase tracking-tight ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                      {name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>{pct}%</span>
                    <span className={`text-[10px] font-black tabular-nums ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          
          <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em] text-center mt-3">Klik jenis untuk filter peta</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
