import React, { useState, useMemo } from 'react';
import { TreeData, getSpeciesColor, getImageUrl } from './types';

interface GalleryProps {
  isOpen: boolean;
  onClose: () => void;
  data: TreeData[];
  onSelectTree: (tree: TreeData) => void;
  onBulkDelete?: (ids: string[]) => void;
  treeImageUrlExtractor?: (item: TreeData) => string;
}

// Helper untuk mengekstrak HANYA tanggal (YYYY-MM-DD)
const getDateOnly = (dateStr: any) => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  
  if (str.length >= 10) {
    return str.substring(0, 10);
  }
  return str;
};

export const Gallery: React.FC<GalleryProps> = ({ 
  isOpen, 
  onClose, 
  data, 
  onSelectTree, 
  onBulkDelete 
}) => {
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
  
  // Password protection state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // Extract unique options
  const uniqueSpecies = useMemo(() => [...new Set(data.map(d => d.Tanaman).filter(Boolean))].sort(), [data]);
  const uniqueSupervisors = useMemo(() => [...new Set(data.map(d => d.Pengawas).filter(Boolean))].sort(), [data]);
  
  const uniqueDates = useMemo(() => {
    const dates = data.map(d => getDateOnly(d.Tanggal)).filter(Boolean);
    return [...new Set(dates)].sort();
  }, [data]);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSpecies = speciesFilter ? item.Tanaman === speciesFilter : true;
      const matchSupervisor = supervisorFilter ? item.Pengawas === supervisorFilter : true;
      const matchDate = dateFilter ? getDateOnly(item.Tanggal) === dateFilter : true;
      
      return matchSpecies && matchSupervisor && matchDate;
    });
  }, [data, speciesFilter, supervisorFilter, dateFilter]);

  // Handle item selection for bulk delete
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Password verification
  const verifyPassword = () => {
    if (passwordInput === '1212') {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(false);
      // Proceed with delete
      if (pendingDeleteIds.length > 0 && onBulkDelete) {
        onBulkDelete(pendingDeleteIds);
        if (selectedTree) {
          setSelectedTree(null);
        } else {
          setSelectedItems([]);
        }
        setPendingDeleteIds([]);
      }
    } else {
      setPasswordError(true);
    }
  };

  // Handle bulk delete with password
  const handleBulkDelete = () => {
    if (selectedItems.length > 0 && onBulkDelete) {
      setPendingDeleteIds(selectedItems);
      setShowPasswordModal(true);
    }
  };

  // Handle single delete with password
  const handleSingleDelete = () => {
    if (selectedTree && onBulkDelete) {
      setPendingDeleteIds([String(selectedTree["No Pohon"])]);
      setShowPasswordModal(true);
    }
  };

  // Handle full-screen photo review
  const handlePhotoClick = (tree: TreeData) => {
    setSelectedTree(tree);
  };

  // Close full-screen photo review
  const closePhotoReview = () => {
    setSelectedTree(null);
  };

  if (!isOpen) return null;

  // Full-screen photo review
  if (selectedTree) {
    const healthColor = selectedTree.Kesehatan === 'Sehat' ? '#10b981' : selectedTree.Kesehatan === 'Merana' ? '#f59e0b' : '#ef4444';
    
    return (
      <div className="fixed inset-0 z-[6000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={closePhotoReview}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                #{selectedTree["No Pohon"]}
              </h2>
              <p className="text-sm text-slate-400 font-bold uppercase">
                {selectedTree.Tanaman} • {selectedTree.Pengawas}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSingleDelete}
              className="hidden md:flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Hapus
            </button>
            <button 
              onClick={() => {
                onSelectTree(selectedTree);
                closePhotoReview();
              }}
              className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Lihat di Peta
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Photo Section */}
            <div className="lg:flex-1 flex items-center justify-center p-4 md:p-8 bg-slate-950">
              <div className="relative w-full max-w-4xl">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
                  <img 
                    src={getImageUrl(selectedTree, 'large')} 
                    className="w-full max-h-[60vh] lg:max-h-[80vh] object-contain" 
                    alt={selectedTree.Tanaman}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800';
                    }}
                  />
                  {/* Image overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent pointer-events-none" />
                </div>
                
                {/* Mobile view on map button */}
                <button 
                  onClick={() => {
                    onSelectTree(selectedTree);
                    closePhotoReview();
                  }}
                  className="md:hidden mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Lihat di Peta
                </button>
              </div>
            </div>

            {/* Details Panel */}
            <div className="lg:w-96 bg-slate-900/50 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-white/10 p-4 md:p-6 overflow-y-auto">
              <div className="space-y-4">
                {/* Species Badge */}
                <div className="flex items-center gap-3">
                  <span 
                    className="text-sm font-black text-white px-4 py-2 rounded-full"
                    style={{ background: getSpeciesColor(selectedTree.Tanaman) }}
                  >
                    {selectedTree.Tanaman}
                  </span>
                  <span 
                    className="text-sm font-black text-white px-4 py-2 rounded-full"
                    style={{ background: healthColor }}
                  >
                    {selectedTree.Kesehatan}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/10" />

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Tree ID */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                      No. Pohon
                    </span>
                    <p className="text-lg font-black text-white">#{selectedTree["No Pohon"]}</p>
                  </div>

                  {/* Height */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                      Tinggi
                    </span>
                    <p className="text-lg font-black text-white">{selectedTree.Tinggi} <span className="text-sm text-slate-400">m</span></p>
                  </div>
                </div>

                {/* Supervisor */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                    Pengawas
                  </span>
                  <p className="text-base font-bold text-white">{selectedTree.Pengawas}</p>
                </div>

                {/* Date */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                    Tanggal Tanam
                  </span>
                  <p className="text-base font-bold text-white">{getDateOnly(selectedTree.Tanggal)}</p>
                </div>

                {/* Coordinates */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                    Koordinat GPS
                  </span>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-sm font-bold text-white font-mono">
                      {selectedTree.X}, {selectedTree.Y}
                    </p>
                  </div>
                </div>

                {/* Carbon Data (if available) */}
                {(selectedTree.carbon || selectedTree.co2e || selectedTree.vol) && (
                  <>
                    <div className="h-px bg-white/10" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Data Karbon
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedTree.carbon && (
                        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                            Carbon
                          </span>
                          <p className="text-sm font-black text-emerald-300">{selectedTree.carbon.toFixed(2)}</p>
                        </div>
                      )}
                      {selectedTree.co2e && (
                        <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-center">
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block mb-1">
                            CO₂e
                          </span>
                          <p className="text-sm font-black text-blue-300">{selectedTree.co2e.toFixed(2)}</p>
                        </div>
                      )}
                      {selectedTree.vol && (
                        <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 text-center">
                          <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider block mb-1">
                            Volume
                          </span>
                          <p className="text-sm font-black text-purple-300">{selectedTree.vol.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Link to Drive */}
                {selectedTree["Link Drive"] && !String(selectedTree["Link Drive"]).includes("File tidak ditemukan") && (
                  <div className="pt-2">
                    <a 
                      href={selectedTree["Link Drive"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all border border-white/10"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574h-3.758zm-5.735 1.04l-6.269 10.967 1.883 3.296 1.882 3.297h3.77l-1.893-3.313-1.893-3.313 4.38-7.63 2.19-3.817-1.885-3.297c-1.037-1.813-1.893-3.296-1.903-3.296-.01 0-.112.04-.262.113zm14.056 11.09l-1.88 3.293-1.881 3.293H7.506l-1.893 3.297-1.893 3.296 1.885 3.297 1.885 3.297h7.542l1.893-3.297 1.893-3.297-1.885-3.296-1.885-3.297h3.77l1.88-3.293 1.881-3.293-1.88-3.297-1.88-3.297z"/>
                      </svg>
                      Buka di Google Drive
                    </a>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[5000] bg-white flex flex-col p-6 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 max-w-7xl mx-auto w-full gap-4 relative">
        <div className="md:mr-auto">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Visual Archive</h2>
          <p className="text-blue-600 text-[10px] font-black mt-1 tracking-[0.3em] uppercase">
            Displaying {filteredData.length} of {data.length} Records
          </p>
        </div>
        
        {/* Filters Container */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto z-10">
          <select 
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-[10px] font-bold uppercase rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <option value="">Semua Bibit</option>
            {uniqueSpecies.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-[10px] font-bold uppercase rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <option value="">Semua Pengawas</option>
            {uniqueSupervisors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-[10px] font-bold uppercase rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <option value="">Semua Tanggal</option>
            {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {(speciesFilter || supervisorFilter || dateFilter) && (
            <button 
              onClick={() => { setSpeciesFilter(''); setSupervisorFilter(''); setDateFilter(''); }}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border border-red-200"
            >
              Reset
            </button>
          )}
        </div>

        {/* Bulk delete button */}
        {selectedItems.length > 0 && (
          <button 
            onClick={handleBulkDelete}
            className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg hover:bg-red-700"
          >
            Hapus {selectedItems.length} Item
          </button>
        )}

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-[7000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Verifikasi Password</h3>
                  <p className="text-[10px] text-slate-500 font-bold">Masukkan password untuk menghapus</p>
                </div>
              </div>
              
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                placeholder="Masukkan password..."
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-bold outline-none transition-all ${
                  passwordError 
                    ? 'border-red-500 bg-red-50 text-red-900' 
                    : 'border-slate-200 focus:border-blue-500'
                }`}
                autoFocus
              />
              
              {passwordError && (
                <p className="mt-2 text-[10px] font-bold text-red-600">Password salah! Coba lagi.</p>
              )}
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError(false);
                    setPendingDeleteIds([]);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={verifyPassword}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-xs font-black uppercase hover:bg-red-500 transition-all"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={onClose} 
          className="absolute top-0 right-0 md:static bg-slate-100 hover:bg-slate-200 text-slate-900 p-3 md:p-4 rounded-3xl border border-slate-200 transition-all active:scale-90"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-10">
          {filteredData.map((tree, idx) => (
            <div 
              key={idx} 
              className="group relative aspect-[3/4] bg-white rounded-[2rem] overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-500/50 transition-all shadow-lg"
            >
              {/* Selection checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(String(tree["No Pohon"]))}
                  onChange={() => toggleItemSelection(String(tree["No Pohon"]))}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>

              <img 
                src={getImageUrl(tree)} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" 
                loading="lazy" 
                alt={tree.Tanaman}
                onClick={() => handlePhotoClick(tree)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                <span className="text-[8px] font-black text-white px-2 py-0.5 rounded-full mb-1 inline-block" style={{ background: getSpeciesColor(tree.Tanaman) }}>
                  {tree.Tanaman}
                </span>
                <p className="text-white font-black text-xs uppercase truncate">#{tree["No Pohon"]}</p>
                <div className="flex justify-between items-end mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                   <p className="text-slate-300 text-[8px] font-bold uppercase truncate max-w-[60%]">{tree.Pengawas}</p>
                   <p className="text-slate-400 text-[7px] font-bold uppercase">{getDateOnly(tree.Tanggal)}</p>
                </div>
              </div>
            </div>
          ))}
          
          {filteredData.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-500">
               <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Tidak ada data yang cocok dengan filter</p>
               <button 
                 onClick={() => { setSpeciesFilter(''); setSupervisorFilter(''); setDateFilter(''); }}
                 className="mt-4 text-[9px] font-bold text-blue-500 uppercase hover:underline"
               >
                 Hapus Filter
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
