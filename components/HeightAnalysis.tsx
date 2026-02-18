
import React, { useMemo, useState } from 'react';
import { TreeData, getSpeciesColor } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, ScatterChart, Scatter, ZAxis, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import StorageControls from './StorageControls';

interface HeightAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  data: TreeData[];
  onDataChange?: (data: TreeData[]) => void;
}

// A. Calculate DBH from Height: DBH (cm) = 0.65 × H^0.92 (H in cm)
const calculateDBH = (heightCm: number): number => {
  if (heightCm <= 0) return 0;
  return 0.65 * Math.pow(heightCm, 0.92);
};

// B. Calculate Volume: Volume (m³) = 0.00039 × H^2.43 (H in meters)
const calculateVolume = (heightCm: number): number => {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100; // Convert cm to meters
  return 0.00039 * Math.pow(heightM, 2.43);
};

// C. Calculate Biomass: Biomass (kg) = 0.0509 × (DBH² × H) (DBH in cm, H in cm)
const calculateBiomass = (dbhCm: number, heightCm: number): number => {
  if (dbhCm <= 0 || heightCm <= 0) return 0;
  return 0.0509 * (Math.pow(dbhCm, 2) * heightCm);
};

// D. Calculate Carbon: Carbon (kg) = Biomass × 0.47
const calculateCarbon = (biomassKg: number): number => {
  return biomassKg * 0.47;
};

// E. Calculate CO2 Equivalent: CO2e (kg) = Carbon × (44/12) = Carbon × 3.67
const calculateCO2e = (carbonKg: number): number => {
  return carbonKg * 3.67;
};

// F. Calculate CO2e in tonnes
const calculateCO2eTonnes = (carbonKg: number): number => {
  return calculateCO2e(carbonKg) / 1000;
};

// G. Economic valuation simplified
const CARBON_PRICE_IDR = 1900000; // Rp per ton CO2e
const MAX_CARBON_PER_TREE_KG = 240; // Maximum carbon stock per tree (kg C)

const HeightAnalysis: React.FC<HeightAnalysisProps> = ({ isOpen, onClose, data, onDataChange }) => {
  if (!isOpen) return null;
  
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const analysis = useMemo(() => {
    const valid = data.filter(d => Number(d.Tinggi) > 0);
    if (valid.length === 0) return null;

    // 1. Species Average Height
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

    // 2. Height Ranges (Histogram)
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

    // 3. Top 10 Tallest
    const tallest = [...valid].sort((a, b) => Number(b.Tinggi) - Number(a.Tinggi)).slice(0, 10);

    // 4. Scatter Data: ID Pohon (unique ID) vs Tinggi with allometric calculations
    const scatterData = valid.map(d => {
      const height = Number(d.Tinggi);
      const dbh = calculateDBH(height);
      const volume = calculateVolume(height);
      const biomass = calculateBiomass(dbh, height);
      const carbon = calculateCarbon(biomass);
      const co2eKg = calculateCO2e(carbon);
      const co2eTonnes = co2eKg / 1000;
      
      return {
        id: d.ID || String(d['No Pohon']), // Use unique ID if available, fallback to No Pohon
        displayId: d.ID ? d.ID.substring(0, 8) + '...' : String(d['No Pohon']), // Truncated for display
        height,
        dbh: Math.round(dbh * 100) / 100,              // Round to 2 decimal places
        volume: Math.round(volume * 10000) / 10000,   // Round to 4 decimal places
        biomass: Math.round(biomass * 100) / 100,     // Round to 2 decimal places
        carbon: Math.round(carbon * 100) / 100,       // Round to 2 decimal places
        co2e: Math.round(co2eTonnes * 10000) / 10000, // Round to 4 decimal places (tonnes)
        species: d.Tanaman
      };
    }).sort((a, b) => {
      // Sort by ID (chronological if ID is timestamp-based)
      return String(a.id).localeCompare(String(b.id));
    });

    // 5. Volume Statistics
    const totalVolume = scatterData.reduce((acc, curr) => acc + curr.volume, 0);
    const avgVolume = totalVolume / scatterData.length;
    const maxVolume = Math.max(...scatterData.map(d => d.volume));

    // 6. DBH Statistics
    const dbhValues = scatterData.map(d => d.dbh);
    const avgDBH = dbhValues.reduce((a, b) => a + b, 0) / dbhValues.length;
    const maxDBH = Math.max(...dbhValues);

    // 7. Biomass Statistics
    const totalBiomass = scatterData.reduce((acc, curr) => acc + curr.biomass, 0);
    const avgBiomass = totalBiomass / scatterData.length;
    const maxBiomass = Math.max(...scatterData.map(d => d.biomass));

    // 8. Carbon Stock Statistics
    const totalCarbon = scatterData.reduce((acc, curr) => acc + curr.carbon, 0);
    const avgCarbon = totalCarbon / scatterData.length;
    const totalCO2e = scatterData.reduce((acc, curr) => acc + curr.co2e, 0);
    const avgCO2e = totalCO2e / scatterData.length;

    // 9. Carbon Stock Potential (simplified)
    const maxPotentialCarbon = valid.length * MAX_CARBON_PER_TREE_KG;
    const carbonFillPercentage = (totalCarbon / maxPotentialCarbon) * 100;

    // 10. Economic Valuation (simplified)
    const currentCarbonValue = totalCO2e * CARBON_PRICE_IDR;
    const potentialCarbonValue = calculateCO2eTonnes(maxPotentialCarbon) * CARBON_PRICE_IDR;

    // 11. Top 5 by Volume (reduced from 10)
    const topByVolume = [...scatterData].sort((a, b) => b.volume - a.volume).slice(0, 5);

    // 12. Top 5 by Carbon (reduced from 10)
    const topByCarbon = [...scatterData].sort((a, b) => b.carbon - a.carbon).slice(0, 5);

    const result = { 
      speciesChartData, 
      rangeData, 
      tallest: tallest.slice(0, 5), // Reduced to top 5
      total: valid.length,
      scatterData: scatterData.slice(0, 50), // Limit scatter data points
      volumeStats: { total: totalVolume, avg: avgVolume, max: maxVolume },
      dbhStats: { avg: avgDBH, max: maxDBH },
      biomassStats: { total: totalBiomass, avg: avgBiomass, max: maxBiomass, co2e: totalCO2e, avgCO2e },
      carbonStats: { total: totalCarbon, avg: avgCarbon, potential: maxPotentialCarbon, fillPercentage: carbonFillPercentage },
      economicStats: { currentValue: currentCarbonValue, potentialValue: potentialCarbonValue },
      topByVolume,
      topByCarbon
    };
    
    // Store result for storage controls
    setAnalysisResult(result);
    
    return result;
  }, [data]);

  if (!analysis) return null;

  return (
    <div className="fixed inset-0 z-[5500] bg-slate-950/95 backdrop-blur-2xl flex flex-col p-6 md:p-10 animate-in fade-in slide-in-from-right-10 duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-5">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-2xl shadow-blue-600/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Height Stratification</h2>
            <p className="text-blue-400 text-[10px] font-black tracking-[0.4em] uppercase">Vertical Forest Structure Analysis</p>
          </div>
        </div>
        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-3xl border border-white/20 transition-all active:scale-90">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full pr-4 space-y-8">
        {/* Storage Controls */}
        <StorageControls 
          analysis={analysisResult} 
          data={data}
          onDataChange={onDataChange}
        />
        
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
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Variansi Spesies</h4>
            <div className="text-5xl font-black text-white">{analysis.speciesChartData.length} <span className="text-sm text-orange-500">Takson</span></div>
          </div>
        </div>

        {/* Carbon Stock Overview - Simplified */}
        <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900/50 p-6 rounded-3xl border border-emerald-500/20">
          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Stok Karbon & Potensi
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Karbon</h5>
              <div className="text-2xl font-black text-white">{analysis.carbonStats.total.toFixed(1)} <span className="text-xs text-emerald-500">kg</span></div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Potensi</h5>
              <div className="text-2xl font-black text-white">{analysis.carbonStats.potential.toFixed(0)} <span className="text-xs text-blue-500">kg</span></div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Fill Rate</h5>
              <div className="text-2xl font-black text-white">{analysis.carbonStats.fillPercentage.toFixed(1)}%</div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Nilai Karbon</h5>
              <div className="text-2xl font-black text-white">Rp {(analysis.economicStats.currentValue / 1000000).toFixed(1)} <span className="text-xs text-amber-500">jt</span></div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Average per Species */}
          <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Rerata Tinggi per Spesies (cm)
            </h4>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.speciesChartData} layout="vertical">
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" horizontal={false} />
                  <XAxis type="number" stroke="#475569" fontSize={10} fontWeight="bold" />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} fontWeight="bold" width={80} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '10px' }}
                  />
                  <Bar dataKey="avg" radius={[0, 10, 10, 0]}>
                    {analysis.speciesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Histogram */}
          <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> Distribusi Kelas Tinggi
            </h4>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.rangeData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" />
                  <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '10px' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Scatter Diagram: ID Pohon vs Tinggi */}
        <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5">
          <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" /> 
            Scatter Diagram: ID Pohon vs Tinggi
          </h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="id" 
                  type="category" 
                  name="ID Pohon" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickCount={20}
                />
                <YAxis 
                  dataKey="height" 
                  type="number" 
                  name="Tinggi" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight="bold"
                  unit="cm"
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '10px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Scatter 
                  data={analysis.scatterData} 
                  fill="#8b5cf6"
                  shape="circle"
                >
                  {analysis.scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getSpeciesColor(entry.species)} />
                  ))}
                </Scatter>
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allometric Analysis Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rata-rata DBH</h4>
            <div className="text-3xl font-black text-white">{analysis.dbhStats.avg.toFixed(2)} <span className="text-sm text-blue-500">cm</span></div>
            <p className="text-[9px] text-slate-400 mt-2">DBH = 0.65 × H⁰·⁹²</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Volume</h4>
            <div className="text-3xl font-black text-white">{analysis.volumeStats.total.toFixed(4)} <span className="text-sm text-purple-500">m³</span></div>
            <p className="text-[9px] text-slate-400 mt-2">V = 0.00039 × H²·⁴³</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Biomasa</h4>
            <div className="text-3xl font-black text-white">{analysis.biomassStats.total.toFixed(2)} <span className="text-sm text-orange-500">kg</span></div>
            <p className="text-[9px] text-slate-400 mt-2">B = 0.0509 × (DBH² × H)</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total CO₂e</h4>
            <div className="text-3xl font-black text-white">{analysis.biomassStats.co2e.toFixed(4)} <span className="text-sm text-cyan-500">ton</span></div>
            <p className="text-[9px] text-slate-400 mt-2">CO₂e = C × 3.67</p>
          </div>
        </div>

        {/* Simplified Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Rata-rata DBH</h5>
            <div className="text-xl font-black text-white">{analysis.dbhStats.avg.toFixed(2)} <span className="text-xs text-blue-500">cm</span></div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Volume</h5>
            <div className="text-xl font-black text-white">{analysis.volumeStats.total.toFixed(3)} <span className="text-xs text-purple-500">m³</span></div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Biomasa</h5>
            <div className="text-xl font-black text-white">{analysis.biomassStats.total.toFixed(1)} <span className="text-xs text-orange-500">kg</span></div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <h5 className="text-[10px] font-black text-slate-500 uppercase mb-1">Total CO₂e</h5>
            <div className="text-xl font-black text-white">{analysis.biomassStats.co2e.toFixed(3)} <span className="text-xs text-cyan-500">ton</span></div>
          </div>
        </div>

        {/* Top 5 Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top 5 by Volume */}
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4">Top 5 Volume</h4>
            <div className="space-y-2">
              {analysis.topByVolume.map((tree, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-white">#{idx+1} {tree.species}</span>
                  <span className="text-xs font-black text-purple-400">{tree.volume.toFixed(4)} m³</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 by Carbon */}
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">Top 5 Karbon</h4>
            <div className="space-y-2">
              {analysis.topByCarbon.map((tree, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-white">#{idx+1} {tree.species}</span>
                  <span className="text-xs font-black text-emerald-400">{tree.carbon.toFixed(2)} kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Tallest */}
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Top 5 Tertinggi</h4>
            <div className="space-y-2">
              {analysis.tallest.map((tree, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-white">#{idx+1} {tree.Tanaman}</span>
                  <span className="text-xs font-black text-blue-400">{tree.Tinggi} cm</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-slate-600 text-[8px] font-black uppercase tracking-[0.5em] opacity-40">
        AI Structural Analysis Engine • Montana Ecosystem Monitoring
      </div>
    </div>
  );
};

export default HeightAnalysis;
