
import React, { useState } from 'react';
import { TreeData, getSpeciesColor, getImageUrl } from '../types';

interface LiveFeedProps {
  data: TreeData[];
  onSelectItem: (item: TreeData) => void;
  onClose: () => void;
  isVisible: boolean;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({ data, onSelectItem, onClose, isVisible }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isVisible || data.length === 0) return null;
  
  const latest = [...data].reverse().slice(0, isExpanded ? 4 : 1); // Mobile: show only 1, Desktop/Expanded: show 4

  return (
    <div className="fixed bottom-24 sm:bottom-8 right-4 sm:right-16 z-[2000] w-auto sm:w-72 pointer-events-none space-y-2 sm:space-y-3">
      {/* Header dengan tombol tutup/expand */}
      <div className="flex items-center gap-2 mb-2 sm:mb-4 bg-red-600/95 text-white pl-3 sm:pl-4 pr-2 py-1.5 sm:py-2 rounded-full w-fit shadow-2xl animate-pulse ml-auto backdrop-blur-md border border-white/20 pointer-events-auto">
        <div className="live-dot w-2 h-2 sm:w-2.5 sm:h-2.5"></div>
        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] mr-1 sm:mr-2">Live</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1 hover:bg-white/20 rounded-full transition-colors sm:hidden"
          title={isExpanded ? "Sembunyikan" : "Tampilkan"}
        >
          <svg className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
          title="Sembunyikan"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Container List Notifikasi */}
      <div className={`space-y-2 flex flex-col items-end overflow-y-auto no-scrollbar pointer-events-auto ${isExpanded ? 'max-h-[40vh]' : 'max-h-[15vh] sm:max-h-[50vh]'}`}>
        {latest.map((item, idx) => (
          <div 
            key={`${item["No Pohon"]}-${idx}`} 
            onClick={() => onSelectItem(item)}
            className="live-feed-item glass border-l-4 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl w-fit sm:w-full flex items-center gap-2 sm:gap-3 cursor-pointer group hover:scale-[1.02] active:scale-95 transition-all bg-white/90 min-w-[200px] sm:min-w-0"
            style={{ 
              borderLeftColor: getSpeciesColor(item.Tanaman),
              animationDelay: `${idx * 0.1}s`
            }}
          >
            <div className="relative shrink-0">
              <img 
                src={getImageUrl(item, 'small')} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover border border-white/20" 
                alt="thumb"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=100';
                }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center">
                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-white animate-pulse"></div>
              </div>
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex justify-between items-center">
                <p className="text-[7px] sm:text-[8px] font-black uppercase leading-none truncate" style={{ color: getSpeciesColor(item.Tanaman) }}>
                  {item.Pengawas}
                </p>
                <span className="text-[6px] sm:text-[7px] font-black text-slate-400">#{item["No Pohon"]}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-900 truncate mt-0.5">
                {item.Tanaman}
              </p>
              <div className="flex items-center gap-1 mt-0.5 opacity-60 hidden sm:flex">
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter italic">{item.Tanggal}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
