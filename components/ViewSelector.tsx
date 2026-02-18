
import React from 'react';

interface ViewSelectorProps {
  onSelect: (mode: 'pc' | 'mobile') => void;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-emerald-600/20 blur-[120px] rounded-full" />
      
      <div className="relative glass p-8 md:p-12 rounded-[3rem] border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-2xl w-full text-center animate-in zoom-in fade-in duration-700">
        <div className="mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            Montana <span className="text-blue-600">Mission Control</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Pilih Mode Optimal Untuk Perangkat Anda</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => onSelect('pc')}
            className="group relative bg-white border border-slate-200 p-8 rounded-[2rem] hover:border-blue-500 hover:shadow-2xl transition-all duration-500"
          >
            <div className="mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Desktop Mode</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Terbaik untuk analisis mendalam & layar lebar</p>
          </button>

          <button 
            onClick={() => onSelect('mobile')}
            className="group relative bg-white border border-slate-200 p-8 rounded-[2rem] hover:border-emerald-500 hover:shadow-2xl transition-all duration-500"
          >
            <div className="mb-4 text-slate-400 group-hover:text-emerald-600 transition-colors">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Mobile Mode</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Navigasi cepat & ramah satu tangan</p>
          </button>
        </div>

        <p className="mt-8 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Montana AI Ecosystem • v2.5.0</p>
      </div>
    </div>
  );
};
