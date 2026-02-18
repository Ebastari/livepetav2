
import React, { useState, useEffect } from 'react';

interface EditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<boolean>;
  initialPohonId?: string;
}

export const EditPanel: React.FC<EditPanelProps> = ({ isOpen, onClose, onDelete, initialPohonId }) => {
  const [password, setPassword] = useState('');
  const [pohonId, setPohonId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (initialPohonId) {
      setPohonId(initialPohonId.toString().trim());
    }
  }, [initialPohonId, isOpen]);

  if (!isOpen) return null;

  const isPasswordCorrect = password === '1212';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordCorrect) return;
    
    if (window.confirm(`Hapus data Pohon ID: ${pohonId}?`)) {
      setIsDeleting(true);
      setMessage({ type: 'info', text: 'Menghubungi server...' });
      
      const success = await onDelete(pohonId.trim());
      setIsDeleting(false);
      
      if (success) {
        setMessage({ type: 'success', text: 'Berhasil! Data telah dihapus.' });
        setTimeout(() => {
          onClose();
          setPassword('');
          setPohonId('');
          setMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setMessage({ type: 'error', text: 'Gagal! Periksa ID atau koneksi Anda.' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="bg-slate-900 p-8 text-center relative">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="bg-red-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Otoritas Hapus</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">Gunakan password admin untuk akses</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Password (1212)</label>
              <input 
                type="password" 
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="****"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-center"
              />
            </div>
            
            <div className={isPasswordCorrect ? 'opacity-100' : 'opacity-40 pointer-events-none transition-opacity'}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">No Pohon (Target)</label>
              <input 
                type="text" 
                value={pohonId}
                onChange={(e) => setPohonId(e.target.value)}
                placeholder="ID Pohon..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-center"
                disabled={!isPasswordCorrect}
              />
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-2xl text-[10px] font-black uppercase text-center animate-pulse ${
              message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 
              message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit"
            disabled={!isPasswordCorrect || !pohonId || isDeleting}
            className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${isPasswordCorrect && pohonId ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-red-500/30 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isDeleting ? 'Memproses...' : 'Hapus Selamanya'}
          </button>
        </form>
      </div>
    </div>
  );
};
