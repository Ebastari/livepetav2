import React, { useState, useEffect } from 'react';
import { 
  saveAnalysisToStorage, 
  loadLatestAnalysis, 
  getAnalysisHistory,
  deleteAnalysis,
  loadDataSourceConfig,
  saveDataSourceConfig,
  isCacheValid,
  getStorageInfo,
  SavedAnalysis,
  DataSourceConfig,
  defaultDataSourceConfig
} from '../utils/storage';
import {
  fetchTreeData,
  setDataSourceMode,
  isOffline
} from '../utils/dataSource';
import { TreeData } from '../types';

interface StorageControlsProps {
  analysis: any;
  data: TreeData[];
  onDataChange?: (data: TreeData[]) => void;
  onLoadAnalysis?: (analysis: SavedAnalysis) => void;
}

const StorageControls: React.FC<StorageControlsProps> = ({ 
  analysis, 
  data, 
  onDataChange,
  onLoadAnalysis 
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [dataSourceConfig, setDataSourceConfig] = useState<DataSourceConfig>(defaultDataSourceConfig);
  const [isOnline, setIsOnline] = useState(!isOffline());
  const [storageInfo, setStorageInfo] = useState(getStorageInfo());
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load initial data
    const history = getAnalysisHistory();
    setSavedAnalyses(history);
    setDataSourceConfig(loadDataSourceConfig());
    setStorageInfo(getStorageInfo());
    
    const latest = loadLatestAnalysis();
    if (latest) {
      setLastSaved(new Date(latest.timestamp).toLocaleString('id-ID'));
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save when analysis changes
  useEffect(() => {
    if (analysis && dataSourceConfig.autoSave && data.length > 0) {
      const timeoutId = setTimeout(() => {
        handleSaveAnalysis();
      }, 2000); // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  }, [analysis, data, dataSourceConfig.autoSave]);

  const handleSaveAnalysis = () => {
    if (!analysis) return;
    
    try {
      const saved = saveAnalysisToStorage(
        analysis, 
        dataSourceConfig.mode as 'local' | 'online' | 'hybrid',
        `Analisis ${new Date().toLocaleString('id-ID')}`
      );
      setLastSaved(new Date(saved.timestamp).toLocaleString('id-ID'));
      setSavedAnalyses(getAnalysisHistory());
      setStorageInfo(getStorageInfo());
      showMessage('✅ Analisis tersimpan otomatis');
    } catch (error) {
      showMessage('❌ Gagal menyimpan analisis');
    }
  };

  const handleManualSave = () => {
    if (!analysis) {
      showMessage('⚠️ Tidak ada data untuk disimpan');
      return;
    }
    
    try {
      const saved = saveAnalysisToStorage(
        analysis, 
        dataSourceConfig.mode as 'local' | 'online' | 'hybrid',
        `Analisis Manual ${new Date().toLocaleString('id-ID')}`
      );
      setLastSaved(new Date(saved.timestamp).toLocaleString('id-ID'));
      setSavedAnalyses(getAnalysisHistory());
      setStorageInfo(getStorageInfo());
      showMessage('✅ Analisis berhasil disimpan');
    } catch (error) {
      showMessage('❌ Gagal menyimpan analisis');
    }
  };

  const handleLoadAnalysis = (saved: SavedAnalysis) => {
    if (onLoadAnalysis) {
      onLoadAnalysis(saved);
      showMessage(`📂 "${saved.name}" dimuat`);
    }
  };

  const handleDeleteAnalysis = (id: string) => {
    if (deleteAnalysis(id)) {
      setSavedAnalyses(getAnalysisHistory());
      setStorageInfo(getStorageInfo());
      showMessage('🗑️ Analisis dihapus');
    }
  };

  const handleDataSourceChange = async (mode: 'local' | 'online' | 'hybrid') => {
    setIsLoading(true);
    setDataSourceMode(mode, dataSourceConfig.onlineUrl);
    setDataSourceConfig({ ...dataSourceConfig, mode });
    
    if (mode !== 'local' && onDataChange) {
      const result = await fetchTreeData(true);
      if (result.data.length > 0) {
        onDataChange(result.data);
        showMessage(result.message);
      } else {
        showMessage(result.message || 'Gagal memuat data');
      }
    }
    
    setIsLoading(false);
  };

  const toggleAutoSave = () => {
    const newConfig = { ...dataSourceConfig, autoSave: !dataSourceConfig.autoSave };
    saveDataSourceConfig(newConfig);
    setDataSourceConfig(newConfig);
    showMessage(`Auto-save ${newConfig.autoSave ? 'aktif' : 'nonaktif'}`);
  };

  const handleClearAll = () => {
    if (confirm('Yakin ingin menghapus semua data tersimpan?')) {
      localStorage.removeItem('montana_analysis_latest');
      localStorage.removeItem('montana_analysis_history');
      setSavedAnalyses([]);
      setStorageInfo(getStorageInfo());
      setLastSaved(null);
      showMessage('🗑️ Semua data dihapus');
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="relative">
      {/* Status Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        }`}>
          {isOnline ? '● Online' : '● Offline'}
        </div>
        
        {lastSaved && (
          <div className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
            💾 {lastSaved}
          </div>
        )}
        
        <button 
          onClick={() => setShowPanel(!showPanel)}
          className="ml-auto bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl border border-white/20 transition-all text-sm font-bold flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
          </svg>
          Storage & Data
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-bold text-center animate-pulse">
          {message}
        </div>
      )}

      {/* Control Panel */}
      {showPanel && (
        <div className="mb-6 bg-slate-900/90 p-6 rounded-3xl border border-white/10 space-y-6">
          {/* Data Source Selection */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"/> Sumber Data
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {(['local', 'hybrid', 'online'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleDataSourceChange(mode)}
                  disabled={isLoading}
                  className={`p-3 rounded-xl border-2 transition-all text-sm font-bold ${
                    dataSourceConfig.mode === mode 
                      ? mode === 'local' ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : mode === 'hybrid' ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {mode === 'local' && '📁 Local'}
                  {mode === 'hybrid' && '🔄 Hybrid'}
                  {mode === 'online' && '🌐 Online'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-save Toggle */}
          <div className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAutoSave}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  dataSourceConfig.autoSave ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  dataSourceConfig.autoSave ? 'translate-x-7' : 'translate-x-1'
                }`}/>
              </button>
              <div>
                <div className="text-sm font-bold text-white">Auto-save</div>
                <div className="text-[10px] text-slate-400">
                  {dataSourceConfig.autoSave ? 'Aktif (cache 1 hari)' : 'Nonaktif'}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Storage</div>
              <div className="text-sm font-bold text-white">
                {storageInfo.percent.toFixed(1)}% used
              </div>
            </div>
          </div>

          {/* Manual Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleManualSave}
              className="flex-1 px-4 py-3 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
              </svg>
              Simpan Sekarang
            </button>
            
            <button
              onClick={handleClearAll}
              className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-all"
            >
              🗑️ Hapus Semua
            </button>
          </div>

          {/* Saved Analyses List */}
          {savedAnalyses.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"/> 
                Riwayat ({savedAnalyses.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedAnalyses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                        {item.treeCount}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.timestamp).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadAnalysis(item)}
                        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition-all"
                      >
                        Muat
                      </button>
                      <button
                        onClick={() => handleDeleteAnalysis(item.id)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StorageControls;
