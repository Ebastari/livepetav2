import React from 'react';
import { TreeData, getSpeciesColor } from '../types';

interface SpeciesLegendProps {
  data: TreeData[];
  isVisible: boolean;
  activeFilter: string | null;
  onToggleFilter: (species: string) => void;
}

export const SpeciesLegend: React.FC<SpeciesLegendProps> = ({ data, isVisible, activeFilter, onToggleFilter }) => {
  if (!isVisible || data.length === 0) return null;

  const speciesCounts = data.reduce((acc, curr) => {
    const name = curr.Tanaman || 'Lainnya';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Fix: Explicitly cast count values to number to satisfy arithmetic operation requirements in strict TypeScript environments
  const sortedSpecies = Object.entries(speciesCounts).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <div className="fixed bottom-32 left-6 z-[1000] animate-in slide-in-from-left-10 duration-500 pointer-events-none">
      <div className="glass-dark bg-slate-900/95 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] pointer-events-auto min-w-[200px]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            Legenda Bibit
          </h4>
          {activeFilter && (
            <button 
              onClick={() => onToggleFilter(activeFilter)}
              className="text-[8px] font-black text-red-400 uppercase tracking-tighter hover:text-red-300"
            >
              Reset
            </button>
          )}
        </div>
        
        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
          {sortedSpecies.map(([name, count]) => {
            const isActive = activeFilter === name;
            const isAnyActive = activeFilter !== null;
            
            return (
              <button 
                key={name} 
                onClick={() => onToggleFilter(name)}
                className={`flex items-center justify-between w-full p-2 rounded-xl transition-all ${isActive ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'} ${isAnyActive && !isActive ? 'opacity-40 scale-95 grayscale' : 'opacity-100 scale-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full shadow-lg border-2 border-white/30" 
                    style={{ backgroundColor: getSpeciesColor(name) }}
                  />
                  <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                    {name}
                  </span>
                </div>
                <span className={`text-[9px] font-black ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="mt-5 pt-3 border-t border-white/5 text-center">
          <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em]">Klik untuk filter peta</p>
        </div>
      </div>
    </div>
  );
};