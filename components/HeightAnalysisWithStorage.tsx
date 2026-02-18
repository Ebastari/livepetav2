import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { TreeData, getSpeciesColor } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, ScatterChart, Scatter, Legend
} from 'recharts';
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
  DataSourceConfig
} from '../utils/storage';
import {
  fetchTreeData,
  setDataSourceMode,
  getDataSourceInfo,
  isOffline,
  setupConnectivityListeners
} from '../utils/dataSource';

interface HeightAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  data: TreeData[];
  onDataChange?: (data: TreeData[]) => void;
}

// [Allometric calculation functions remain the same]
const calculateDBH = (heightCm: number): number => {
  if (heightCm <= 0) return 0;
  return 0.65 * Math.pow(heightCm, 0.92);
};

const calculateVolume = (heightCm: number): number => {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return 0.00039 * Math.pow(heightM, 2.43);
};

const calculateBiomass = (dbhCm: number, heightCm: number): number => {
  if (dbhCm <= 0 || heightCm <= 0) return 0;
  return 0.0509 * (Math.pow(dbhCm, 2) * heightCm);
};

const calculateCarbon = (biomassKg: number): number => {
  return biomassKg * 0.47;
};

const calculateCO2e = (carbonKg: number): number => {
  return carbonKg * 3.67;
};

const calculateCO2eTonnes = (carbonKg: number): number => {
  return calculateCO2e(carbonKg) / 1000;
};

const CARBON_PRICE_IDR = 1900000;
const CARBON_PRICE_GROWTH_RATE = 0.015;
const DISCOUNT_RATE = 0.08;
const PROJECT_YEARS = 25;
const MAX_CARBON_PER_TREE_KG = 240;

const calculateCarbonNPV = (currentCarbonKg: number, years: number = PROJECT_YEARS): number => {
  const currentCO2eTonnes = calculateCO2eTonnes(currentCarbonKg);
  const currentValue = currentCO2eTonnes * CARBON_PRICE_IDR;
  const futureCO2eTonnes = calculateCO2eTonnes(MAX_CARBON_PER_TREE_KG);
  const futureValue = futureCO2eTonnes * CARBON_PRICE_IDR * Math.pow(1 + CARBON_PRICE_GROWTH_RATE, years);
  const npv = futureValue / Math.pow(1 + DISCOUNT_RATE, years);
  return npv;
};

const HeightAnalysis: React.FC<HeightAnalysisProps> = ({ isOpen, onClose, data, onDataChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [dataSourceConfig, setDataSourceConfig] = useState<DataSourceConfig>(loadDataSourceConfig());
  const [isOnline, setIsOnline] = useState(!isOffline());
  const [storageInfo, setStorageInfo] = useState(getStorageInfo());
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);

  // Setup connectivity listeners
  useEffect(() => {
    const cleanup = setupConnectivityListeners(
      () => {
        setIsOnline(true);
        setLoadMessage('Koneksi online tersedia');
        setTimeout(() => setLoadMessage(null), 3000);
      },
      () => {
        setIsOnline(false);
        setLoadMessage('Mode offline - menggunakan data tersimpan');
        setTimeout(() => setLoadMessage(null), 3000);
      }
    );
    return cleanup;
  }, []);

  // Load saved analyses on mount
  useEffect(() => {
    if (isOpen) {
      const history = getAnalysisHistory();
      setSavedAnalyses(history);
      setStorageInfo(getStorageInfo());
      
      const latest = loadLatestAnalysis();
      if (latest) {
        setLastSaved(new Date(latest.timestamp).toLocaleString('id-ID'));
      }
    }
  }, [isOpen]);

  // Auto-save when analysis completes
  const autoSaveAnalysis = useCallback((analysis: any) => {
    if (dataSourceConfig.autoSave && analysis) {
      try {
        const saved = saveAnalysisToStorage(
          analysis, 
          dataSourceConfig.mode as 'local' | 'online' | 'hybrid',
          `Analisis ${new Date().toLocaleString('id-ID')}`
        );
        setLastSaved(new Date(saved.timestamp).toLocaleString('id-ID'));
        setSavedAnalyses(getAnalysisHistory());
        setStorageInfo(getStorageInfo());
        console.log('[HeightAnalysis] Auto-saved successfully');
      } catch (error) {
        console.error('[HeightAnalysis] Auto-save failed:', error);
      }
    }
  }, [dataSourceConfig.autoSave, dataSourceConfig.mode]);

  // Handle data source change
  const handleDataSourceChange = async (mode: 'local' | 'online' | 'hybrid', url?: string) => {
    setIsLoading(true);
    setDataSourceMode(mode, url);
    setDataSourceConfig({ ...dataSourceConfig, mode, onlineUrl: url });
    
    if (mode !== 'local' && onDataChange) {
      const result = await fetchTreeData(true);
      if (result.data.length > 0) {
        onDataChange(result.data);
        setLoadMessage(result.message);
      } else {
        setLoadMessage(result.message || 'Gagal memuat data');
      }
      setTimeout(() => setLoadMessage(null), 5000);
    }
    
    setIsLoading(false);
  };

  // Load saved analysis
  const handleLoadAnalysis = (analysis: SavedAnalysis) => {
    if (onDataChange && analysis.data.scatterData) {
      const treeData: TreeData[] = analysis.data.scatterData.map((item: any) => ({
        ID: item.id,
        'No Pohon': item.id,
        Tanaman: item.species,
        Tinggi: item.height,
        Kesehatan: 'Sehat',
        Pengawas: 'Unknown',
        Tanggal: new Date(analysis.timestamp).toISOString(),
        'Link Drive': '',
        X: 0,
        Y: 0,
        dbh: item.dbh,
        volume: item.volume,
        biomass: item.biomass,
        carbonStock: item.carbon,
        co2Equivalent: item.co2e * 1000,
      }));
      
      onDataChange(treeData);
      setLoadMessage(`Analisis "${analysis.name}" dimuat (${analysis.treeCount} pohon)`);
      setTimeout(() => setLoadMessage(null), 3000);
    }
  };

  // Delete saved analysis
  const handleDeleteAnalysis = (id: string) => {
    if (deleteAnalysis(id)) {
      setSavedAnalyses(getAnalysisHistory());
      setStorageInfo(getStorageInfo());
      setLoadMessage('Analisis dihapus');
      setTimeout(() => setLoadMessage(null), 3000);
    }
  };

  // Toggle auto-save
  const toggleAutoSave = () => {
    const newConfig = { ...dataSourceConfig, autoSave: !dataSourceConfig.autoSave };
    saveDataSourceConfig(newConfig);
    setDataSourceConfig(newConfig);
    setLoadMessage(`Auto-save ${newConfig.autoSave ? 'aktif' : 'nonaktif'}`);
    setTimeout(() => setLoadMessage(null), 3000);
  };

  // Clear all data
  const handleClearAllData = () => {
    if (confirm('Yakin ingin menghapus semua data tersimpan?')) {
      localStorage.removeItem('montana_analysis_latest');
      localStorage.removeItem('montana_analysis_history');
      setSavedAnalyses([]);
      setStorageInfo(getStorageInfo());
      setLastSaved(null);
      setLoadMessage('Semua data dihapus');
      setTimeout(() => setLoadMessage(null), 3000);
    }
  };

  if (!isOpen) return null;

  // [Analysis calculation - same as before]
  const analysis = useMemo(() => {
    const valid = data.filter(d => Number(d.Tinggi) > 0);
    if (valid.length === 0) return null;

    // ... [All the analysis calculations from previous version]
    // Species Average Height
    const speciesMap: Record<string, { total: number, count: number, min: number, max: number }> = {};
    valid.forEach(d => {
      const h = Number(d.Tinggi);
      if (!speciesMap[d.Tanaman]) {
        speciesMap[d.Tanaman] = { total: 0, count: 0, min: h, max: h };
      }
      speciesMap[d.Tanaman].total += h;
      speciesMap[d.Tanaman].count += 1;
      speciesMap[d.Tanaman].min = Math.min(speciesMap[d.Tanaman].min, h);
      speciesMap[d.Tanaman].max = Math.max(speciesMap[d.Tanaman].max, h);
    });

    const speciesChartData = Object.entries(speciesMap).map(([name, stats]) => ({
      name,
      avg: Math.round(stats.total / stats.count),
      min: stats.min,
      max: stats.max,
      count: stats.count,
      color: getSpeciesColor(name)
    })).sort((a, b) => b.avg - a.avg);

    // Height Ranges
    const ranges = [
      { label: '0-50cm', min: 0, max: 50 },
      { label: '51-100cm', min: 51, max: 100 },
      { label: '101-200cm', min: 101, max: 200 },
      { label: '201-350cm', min: 201, max: 350 },
      { label: '>350cm', min: 351, max: 99999 }
    ];

    const rangeData = ranges.map(r => ({
      name: r.label,
      count: valid.filter(d => Number(d.Tinggi) >= r.min && Number(d.Tinggi) <= r.max).length
    }));

    const tallest = [...valid].sort((a, b) => Number(b.Tinggi) - Number(a.Tinggi)).slice(0, 10);

    // Scatter Data with allometric calculations
    const scatterData = valid.map(d => {
      const height = Number(d.Tinggi);
      const dbh = calculateDBH(height);
      const volume = calculateVolume(height);
      const biomass = calculateBiomass(dbh, height);
      const carbon = calculateCarbon(biomass);
      const co2eKg = calculateCO2e(carbon);
      const co2eTonnes = co2eKg / 1000;
      
      return {
        id: d.ID || String(d['No Pohon']),
        displayId: d.ID ? d.ID.substring(0, 8) + '...' : String(d['No Pohon']),
        height,
        dbh: Math.round(dbh * 100) / 100,
        volume: Math.round(volume * 10000) / 10000,
        biomass: Math.round(biomass * 100) / 100,
        carbon: Math.round(carbon * 100) / 100,
        co2e: Math.round(co2eTonnes * 10000) / 10000,
        species: d.Tanaman
      };
    }).sort((a, b) => String(a.id).localeCompare(String(b.id)));

    // Statistics calculations
    const totalVolume = scatterData.reduce((acc, curr) => acc + curr.volume, 0);
    const avgVolume = totalVolume / scatterData.length;
    const maxVolume = Math.max(...scatterData.map(d => d.volume));

    const dbhValues = scatterData.map(d => d.dbh);
    const avgDBH = dbhValues.reduce((a, b) => a + b, 0) / dbhValues.length;
    const maxDBH = Math.max(...dbhValues);

    const totalBiomass = scatterData.reduce((acc, curr) => acc + curr.biomass, 0);
    const avgBiomass = totalBiomass / scatterData.length;
    const maxBiomass = Math.max(...scatterData.map(d => d.biomass));

    const totalCarbon = scatterData.reduce((acc, curr) => acc + curr.carbon, 0);
    const avgCarbon = totalCarbon / scatterData.length;
    const totalCO2e = scatterData.reduce((acc, curr) => acc + curr.co2e, 0);
    const avgCO2e = totalCO2e / scatterData.length;

    const maxPotentialCarbon = valid.length * MAX_CARBON_PER_TREE_KG;
    const carbonFillPercentage = (totalCarbon / maxPotentialCarbon) * 100;

    const avgTreeAge = 1;
    const annualCarbonGrowth = (maxPotentialCarbon - totalCarbon) / (PROJECT_YEARS - avgTreeAge);
    const annualCO2eGrowth = calculateCO2eTonnes(annualCarbonGrowth);

    const currentCarbonValue = totalCO2e * CARBON_PRICE_IDR;
    const potentialCarbonValue = calculateCO2eTonnes(maxPotentialCarbon) * CARBON_PRICE_IDR;
    const npvValue = valid.length * calculateCarbonNPV(totalCarbon / valid.length);

    const topByVolume = [...scatterData].sort((a, b) => b.volume - a.volume).slice(0, 10);
    const topByBiomass = [...scatterData].sort((a, b) => b.biomass - a.biomass).slice(0, 10);
    const topByCarbon = [...scatterData].sort((a, b) => b.carbon - a.carbon).slice(0, 10);

    // Regression Analysis
    const n = scatterData.length;
    const sumH = scatterData.reduce((acc, d) => acc + d.height, 0);
    const sumC = scatterData.reduce((acc, d) => acc + d.carbon, 0);
    const sumHC = scatterData.reduce((acc, d) => acc + d.height * d.carbon, 0);
    const sumH2 = scatterData.reduce((acc, d) => acc + d.height * d.height, 0);
    
    const slope = (n * sumHC - sumH * sumC) / (n * sumH2 - sumH * sumH);
    const intercept = (sumC - slope * sumH) / n;
    
    const meanC = sumC / n;
    const ssTotal = scatterData.reduce((acc, d) => acc + Math.pow(d.carbon - meanC, 2), 0);
    const ssResidual = scatterData.reduce((acc, d) => {
      const predicted = slope * d.height + intercept;
      return acc + Math.pow(d.carbon - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // Advanced Statistics
    const sortedHeights = [...scatterData].sort((a, b) => a.height - b.height).map(d => d.height);
    const sortedDBH = [...dbhValues].sort((a, b) => a - b);
    const sortedCarbon = [...scatterData].sort((a, b) => a.carbon - b.carbon).map(d => d.carbon);
    
    const getPercentile = (arr: number[], p: number) => {
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, Math.min(index, arr.length - 1))];
    };
    
    const p10Height = getPercentile(sortedHeights, 10);
    const p90Height = getPercentile(sortedHeights, 90);
    const p10DBH = getPercentile(sortedDBH, 10);
    const p90DBH = getPercentile(sortedDBH, 90);
    const p10Carbon = getPercentile(sortedCarbon, 10);
    const p90Carbon = getPercentile(sortedCarbon, 90);

    const calculateSkewness = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
      const stdDev = Math.sqrt(variance);
      return arr.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / arr.length;
    };
    
    const heightSkewness = calculateSkewness(sortedHeights);
    const dbhSkewness = calculateSkewness(sortedDBH);
    const carbonSkewness = calculateSkewness(sortedCarbon);

    const sturgesBins = Math.ceil(Math.log2(n) + 1);
    
    const createHistogram = (values: number[], bins: number, min: number, max: number) => {
      const binWidth = (max - min) / bins;
      const histogram = Array(bins).fill(0).map((_, i) => ({
        range: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
        count: 0,
        midPoint: min + (i + 0.5) * binWidth
      }));
      
      values.forEach(v => {
        const binIndex = Math.min(Math.floor((v - min) / binWidth), bins - 1);
        if (binIndex >= 0) histogram[binIndex].count++;
      });
      
      return histogram;
    };
    
    const heightHistogram = createHistogram(
      scatterData.map(d => d.height), 
      sturgesBins, 
      Math.min(...scatterData.map(d => d.height)), 
      Math.max(...scatterData.map(d => d.height))
    );
    
    const dbhHistogram = createHistogram(
      dbhValues, 
      sturgesBins, 
      Math.min(...dbhValues), 
      Math.max(...dbhValues)
    );
    
    const volumeHistogram = createHistogram(
      scatterData.map(d => d.volume), 
      sturgesBins, 
      0, 
      maxVolume
    );

    const result = { 
      speciesChartData, 
      rangeData, 
      tallest, 
      total: valid.length,
      scatterData,
      volumeStats: { total: totalVolume, avg: avgVolume, max: maxVolume },
      dbhStats: { avg: avgDBH, max: maxDBH },
      biomassStats: { total: totalBiomass, avg: avgBiomass, max: maxBiomass, co2e: totalCO2e, avgCO2e },
      carbonStats: { total: totalCarbon, avg: avgCarbon, potential: maxPotentialCarbon, fillPercentage: carbonFillPercentage },
      growthStats: { annualCarbonGrowth, annualCO2eGrowth },
      economicStats: { currentValue: currentCarbonValue, potentialValue: potentialCarbonValue, npv: npvValue },
      regressionStats: { slope, intercept, rSquared },
      advancedStats: { 
        p10Height, p90Height, p10DBH, p90DBH, p10Carbon, p90Carbon,
        heightSkewness, dbhSkewness, carbonSkewness,
        sturgesBins
      },
      histograms: { height: heightHistogram, dbh: dbhHistogram, volume: volumeHistogram },
      topByVolume,
      topByBiomass,
      topByCarbon
    };

    // Auto-save after analysis completes
    autoSaveAnalysis(result);

    return result;
  }, [data, autoSaveAnalysis]);

  if (!analysis) return null;

  return (
    <div className="fixed inset-0 z-[5500] bg-slate-950/95 backdrop-blur-2xl flex flex-col p-6 md:p-10 animate-in fade-in slide-in-from-right-10 duration-500 overflow-hidden">
      {/* Header with Controls */}
      <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-5">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-2xl shadow-blue-600/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Height Stratification</h2>
            <p className="text-blue-400 text-[10px] font-black tracking-[0.4em] uppercase">Vertical Forest Structure Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Indicators */}
          <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {isOnline ? '● Online' : '● Offline'}
          </div>
          
          {lastSaved && (
            <div className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              Tersimpan: {lastSaved}
            </div>
          )}
          
          {/* Settings Button */}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl border border-white/20 transition-all"
            title="Pengaturan Data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
          
          {/* History Button */}
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl border border-white/20 transition-all"
            title="Riwayat Analisis"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
          
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-3xl border border-white/20 transition-all active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Loading/Message Banner */}
      {(isLoading || loadMessage) && (
        <div className={`max-w-7xl mx-auto w-full mb-4 p-4 rounded-2xl text-center text-sm font-bold ${
          isLoading ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          {isLoading ? '⏳ Memuat data...' : loadMessage}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-7xl mx-auto w-full mb-6 bg-slate-900/80 p-6 rounded-3xl border border-white/10">
          <h3 className="text-lg font-black text-white uppercase mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            </svg>
            Pengaturan Data Source
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <button
              onClick={() => handleDataSourceChange('local')}
              className={`p-4 rounded-2xl border-2 transition-all ${
                dataSourceConfig.mode === 'local' 
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-bold mb-1">📁 Local Only</div>
              <div className="text-[10px] opacity-70">Gunakan data dari file lokal/cache</div>
            </button>
            
            <button
              onClick={() => handleDataSourceChange('hybrid')}
              className={`p-4 rounded-2xl border-2 transition-all ${
                dataSourceConfig.mode === 'hybrid' 
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-bold mb-1">🔄 Hybrid</div>
              <div className="text-[10px] opacity-70">Cache dulu, fetch online jika perlu</div>
            </button>
            
            <button
              onClick={() => handleDataSourceChange('online', dataSourceConfig.onlineUrl)}
              className={`p-4 rounded-2xl border-2 transition-all ${
                dataSourceConfig.mode === 'online' 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-bold mb-1">🌐 Online</div>
              <div className="text-[10px] opacity-70">Selalu ambil dari server</div>
            </button>
          </div>

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
              <span className="text-sm font-bold text-white">
                Auto-save {dataSourceConfig.autoSave ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Storage Usage</div>
              <div className="text-sm font-bold text-white">{storageInfo.percent.toFixed(1)}% ({(storageInfo.used / 1024).toFixed(1)} KB)</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleClearAllData}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-all"
            >
              🗑️ Hapus Semua Data
            </button>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="max-w-7xl mx-auto w-full mb-6 bg-slate-900/80 p-6 rounded-3xl border border-white/10 max-h-64 overflow-y-auto">
          <h3 className="text-lg font-black text-white uppercase mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Riwayat Analisis Tersimpan ({savedAnalyses.length})
          </h3>
          
          {savedAnalyses.length === 0 ? (
            <div className="text-center text-slate-500 py-8">Belum ada analisis tersimpan</div>
          ) : (
            <div className="space-y-2">
              {savedAnalyses.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                      {item.treeCount}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleString('id-ID')} • {item.totalCarbon.toFixed(1)} kg C
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
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content - Original Analysis UI */}
      <div className="flex-1 overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full pr-4 space-y-8">
        {/* [Rest of the original UI components remain the same] */}
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Populasi Teranalisis</h4>
            <div className="text-5xl font-black text-white">{analysis.total} <span className="text-sm text-blue-500">Unit</span></div>
          </div>
          <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rata-rata Tinggi Global</h4>
            <div className="text-5xl font-black text-white">
              {Math.round(analysis.speciesChartData.reduce((acc, curr) => acc + (curr.avg * curr.count), 0) / analysis.total)} 
              <span className="text-sm text-emerald-500 uppercase ml-2">cm</span>
            </div>
          </div>
          <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
            <h4 className
