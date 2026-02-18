
import React, { useState } from 'react';
import { TreeData, HealthStatus } from '../types';

interface SidebarProps {
  data: TreeData[];
  onSearch: (query: string) => void;
  aiInsight: string;
  isAiLoading: boolean;
  onToggleBoundary: () => void;
  showBoundary: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ data, onSearch, aiInsight, isAiLoading, onToggleBoundary, showBoundary }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const stats = {
    total: data.length,
    healthy: data.filter(d => d.Kesehatan === HealthStatus.HEALTHY).length
  };

  // Calculate healthy percentage with safety check
  const healthyPercent = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 w-full pointer-events-none sm:fixed sm:top-28 sm:left-6 sm:bottom-6 sm:w-80 sm:z-[1000] sm:gap-4">
      {/* Mobile Compact Header - Always visible on mobile */}
      <div className="sm:hidden bg-slate-900/95 backdrop-blur-xl p-3 rounded-2xl shadow-2xl pointer-events-auto border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-xl">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black text-white uppercase">{stats.total} Pohon</p>
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

      {/* Search Bar - Hidden on mobile when collapsed */}
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

      {/* Main Stats Panel - High Contrast Dark Glass */}
      <div className={`bg-slate-900/95 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl sm:rounded-[2.5rem] shadow-2xl pointer-events-auto overflow-y-auto custom-scrollbar border border-white/10 flex-1 space-y-4 sm:space-y-7 pointer-events-auto sm:block ${isExpanded ? 'block max-h-[60vh]' : 'hidden'}`}>
        
        {/* Boundary Control */}
        <div className="hidden sm:flex bg-white/5 text-white p-5 rounded-[1.8rem] items-center justify-between border border-white/10 shadow-lg group hover:bg-white/10 transition-all">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Master Layer</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Batas Area Proyek</p>
          </div>
          <button 
            onClick={onToggleBoundary}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${showBoundary ? 'bg-blue-600' : 'bg-slate-800'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-500 ${showBoundary ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {/* Population Stats - Desktop only (mobile shown in compact header) */}
        <div className="hidden sm:block">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Total Populasi Pohon</span>
          <h2 className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2 leading-none">
            {stats.total} 
            <span className="text-xs text-blue-500 font-black uppercase tracking-widest italic">Pohon</span>
          </h2>
          <div className="flex items-center gap-2 mt-3">
             <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${stats.total > 0 ? (stats.healthy/stats.total)*100 : 0}%` }}
                />
             </div>
             <span className="text-[9px] font-black text-emerald-500 uppercase">{healthyPercent}% Sehat</span>
          </div>
        </div>

        {/* AI Diagnostics Box */}
        <div className="bg-emerald-600/10 border border-emerald-500/20 p-4 sm:p-6 rounded-[2rem] shadow-inner">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI Diagnostics</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-300 leading-relaxed italic opacity-90">
            {isAiLoading ? "Menganalisis pola spasial..." : aiInsight || "Hubungkan satelit untuk insight terbaru."}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="pt-3 sm:pt-4 space-y-2 sm:space-y-3 border-t border-white/5">
           <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500">Update Terakhir</span>
              <span className="text-white">Hari Ini, 15:40</span>
           </div>
           <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500">Akurasi GPS</span>
              <span className="text-blue-400"> 2.5 Meter</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
