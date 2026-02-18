
import React from 'react';
import { TreeData, getSpeciesColor, getImageUrl } from '../types';

interface LastPointNotificationProps {
  tree: TreeData | null;
  onClose: () => void;
  onFocus: (tree: TreeData) => void;
  onDeleteRequest: (id: string) => void;
}

export const LastPointNotification: React.FC<LastPointNotificationProps> = ({ tree, onClose, onFocus, onDeleteRequest }) => {
  if (!tree) return null;

  return (
    <div className="fixed bottom-32 sm:bottom-10 left-1/2 -translate-x-1/2 z-[4500] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="glass-dark bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Header Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
            Detail Pohon
          </div>
        </div>

        {/* Small Close Button (Top Right) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl border border-white/10 transition-all active:scale-90"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-2">
          <div className="relative h-48 w-full rounded-[2rem] overflow-hidden">
            <img 
              src={getImageUrl(tree, 'large')} 
              className="w-full h-full object-cover" 
              alt="Seedling"
              onError={(e: any) => {
                e.target.src = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
          </div>

          <div className="p-5 -mt-10 relative z-20">
            <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-black text-lg uppercase italic tracking-tighter leading-none">
                    {tree.Tanaman}
                  </h3>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
                    ID #{tree["No Pohon"]}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-white px-2 py-1 rounded-lg" style={{ background: getSpeciesColor(tree.Tanaman) }}>
                    {tree.Kesehatan}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase">Pengawas</p>
                  <p className="text-[10px] font-bold text-white uppercase">{tree.Pengawas}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-500 uppercase">Tinggi</p>
                  <p className="text-[10px] font-bold text-white">{tree.Tinggi} CM</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => onFocus(tree)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Lihat Lokasi
                </button>
                <button 
                  onClick={() => onDeleteRequest(String(tree["No Pohon"]))}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Data
                </button>
              </div>
              <button 
                onClick={onClose}
                className="w-full bg-white text-slate-900 py-3 rounded-xl font-black text-[8px] uppercase tracking-widest shadow-md transition-all active:scale-95 border border-slate-200"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
