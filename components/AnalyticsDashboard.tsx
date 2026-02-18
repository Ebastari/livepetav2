
import React, { useMemo } from 'react';
import { TreeData, HEALTH_COLORS } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ScatterChart, Scatter, Line, ComposedChart, Cell, Legend
} from 'recharts';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  data: TreeData[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const stats = useMemo(() => {
    const valid = data.filter(d => Number(d.Tinggi) >= 10); // Filter 10cm - 10000cm
    const n = valid.length;
    if (n === 0) return null;

    // 1. Statistik Tinggi (m)
    const heights = valid.map(d => Number(d.Tinggi) / 100);
    const sumH = heights.reduce((a, b) => a + b, 0);
    const meanH = sumH / n;
    const sortedH = [...heights].sort((a, b) => a - b);
    const medianH = n % 2 === 0 ? (sortedH[n/2 - 1] + sortedH[n/2]) / 2 : sortedH[Math.floor(n/2)];
    const sdH = Math.sqrt(heights.reduce((a, b) => a + Math.pow(b - meanH, 2), 0) / n);

    // 2. Kalkulasi Karbon & Volume
    const totalC_kg = valid.reduce((acc, curr) => acc + (curr.carbon || 0), 0);
    const totalC_ton = totalC_kg / 1000;
    const totalCO2e_ton = totalC_ton * (44/12);
    const totalVol_m3 = valid.reduce((acc, curr) => acc + (curr.vol || 0), 0);
    
    // Potensi Maksimal (C_Life)
    const cLifeMax_ton = (n * 240) / 1000; // Asumsi 240kg per pohon
    const deltaC_ton = Math.max(cLifeMax_ton - totalC_ton, 0);

    // Valuasi
    const carbonPrice = 1900000; // Rp / ton CO2e
    const woodPrice = 1500000; // Rp / m3 Sengon
    const currentValueCarbon = totalCO2e_ton * carbonPrice;
    const currentValueWood = totalVol_m3 * woodPrice;

    // 3. Regresi R2 (Tinggi vs Karbon)
    const points = valid.map(d => ({ 
      x: Number(d.Tinggi) / 100, 
      y: d.carbon || 0,
      id: d["No Pohon"]
    }));
    
    const sumX = points.reduce((a, b) => a + b.x, 0);
    const sumY = points.reduce((a, b) => a + b.y, 0);
    const sumXY = points.reduce((a, b) => a + (b.x * b.y), 0);
    const sumX2 = points.reduce((a, b) => a + (b.x * b.x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const yMean = sumY / n;
    const ssRes = points.reduce((a, b) => a + Math.pow(b.y - (slope * b.x + intercept), 2), 0);
    const ssTot = points.reduce((a, b) => a + Math.pow(b.y - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    const regressionLine = [
      { x: Math.min(...points.map(p => p.x)), y: slope * Math.min(...points.map(p => p.x)) + intercept },
      { x: Math.max(...points.map(p => p.x)), y: slope * Math.max(...points.map(p => p.x)) + intercept }
    ];

    // 4. Histogram Data
    const bins = 10;
    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    const width = (maxH - minH) / bins;
    const histogram = Array.from({ length: bins }, (_, i) => {
      const start = minH + i * width;
      const end = start + width;
      return {
        range: `${start.toFixed(1)}-${end.toFixed(1)}m`,
        count: heights.filter(h => h >= start && h < end).length
      };
    });

    // 5. Forecast 2050 (NPV Concept)
    const years = [2025, 2030, 2035, 2040, 2045, 2050];
    const growthRate = 0.08; // 8% per tahun
    const forecast = years.map((year, i) => {
      const t = (year - 2025);
      const projC = totalC_ton + (totalC_ton * growthRate * t);
      const projPrice = carbonPrice * Math.pow(1.02, t);
      return {
        year,
        carbon: projC,
        value: projC * (44/12) * projPrice
      };
    });

    // 6. Scatter by ID
    const scatterByID = valid.map(d => ({
      id: String(d["No Pohon"]),
      y: Number(d.Tinggi) / 100
    })).sort((a,b) => a.id.localeCompare(b.id));

    return {
      n, meanH, medianH, sdH, totalC_ton, totalCO2e_ton, totalVol_m3,
      cLifeMax_ton, deltaC_ton, currentValueCarbon, currentValueWood,
      rSquared, slope, intercept, regressionLine, points,
      histogram, forecast, scatterByID
    };
  }, [data]);

  if (!stats) return null;

  return (
    <div className="fixed inset-0 z-[4000] bg-slate-950 flex flex-col animate-in fade-in duration-500 overflow-hidden font-sans text-slate-200">
      {/* Header */}
      <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Montana Carbon Analytics</h2>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.3em]">Scientific Environmental Metrics & Economic Forecasting</p>
          </div>
        </div>
        <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all border border-white/10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-10">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 shadow-xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mean Tinggi (m)</p>
                <h3 className="text-3xl font-black text-white">{stats.meanH.toFixed(2)}</h3>
                <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">SD: {stats.sdH.toFixed(2)} | Med: {stats.medianH.toFixed(2)}</div>
             </div>
             <div className="bg-emerald-600/10 p-6 rounded-[2rem] border border-emerald-500/20 shadow-xl">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Karbon (Ton C)</p>
                <h3 className="text-3xl font-black text-white">{stats.totalC_ton.toFixed(2)}</h3>
                <div className="mt-2 text-[9px] font-bold text-emerald-400 uppercase">{stats.totalCO2e_ton.toFixed(2)} Ton CO2e</div>
             </div>
             <div className="bg-blue-600/10 p-6 rounded-[2rem] border border-blue-500/20 shadow-xl">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">NPV Valuasi Karbon</p>
                <h3 className="text-2xl font-black text-white">Rp {Math.round(stats.currentValueCarbon).toLocaleString()}</h3>
                <div className="mt-2 text-[9px] font-bold text-blue-400 uppercase">International Acuan EU ETS</div>
             </div>
             <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 shadow-xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Potensi Masa Depan</p>
                <h3 className="text-3xl font-black text-white">{stats.cLifeMax_ton.toFixed(2)} <span className="text-xs">Ton</span></h3>
                <div className="mt-2 text-[9px] font-bold text-emerald-500 uppercase">Delta: {stats.deltaC_ton.toFixed(2)} Ton</div>
             </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Histogram Distribusi Tinggi
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="range" stroke="#475569" fontSize={9} fontWeight="bold" />
                    <YAxis stroke="#475569" fontSize={9} fontWeight="bold" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '10px' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Carbon Value Forecast (s.d. 2050)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.forecast}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="year" stroke="#475569" fontSize={9} fontWeight="bold" />
                    <YAxis stroke="#475569" fontSize={9} fontWeight="bold" hide />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Regression Chart R2 */}
          <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Regresi Tinggi vs Karbon (R²)
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scientific Correlation: y = {stats.slope.toFixed(3)}x {stats.intercept >= 0 ? '+' : ''} {stats.intercept.toFixed(3)}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-orange-400 tracking-tighter">R² = {stats.rSquared.toFixed(4)}</div>
                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Koefisien Determinasi</div>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis type="number" dataKey="x" name="Tinggi" unit="m" stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                  <YAxis type="number" dataKey="y" name="Karbon" unit="kg" stroke="#475569" fontSize={10} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px' }} />
                  <Scatter name="Data Aktual" data={stats.points} fill="#3b82f6" fillOpacity={0.6} />
                  <Line type="monotone" data={stats.regressionLine} dataKey="y" stroke="#f97316" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scatter by ID - Horizontal Scroll */}
          <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 overflow-hidden">
             <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6">Profil Individual: Tinggi per ID Pohon</h4>
             <div className="overflow-x-auto pb-4 custom-scrollbar">
               <div style={{ width: Math.max(stats.scatterByID.length * 40, 800), height: 350 }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.scatterByID}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="id" stroke="#475569" fontSize={8} interval={0} angle={-90} textAnchor="end" height={60} />
                      <YAxis stroke="#475569" fontSize={9} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px' }} />
                      <Bar dataKey="y" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>

          {/* Bottom Card: Wood Volume & Reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center">
              <h5 className="text-xs font-black text-white uppercase tracking-widest mb-4">Bibliografi & Metodologi</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-slate-500 leading-relaxed font-medium">
                <p><b>[1] Brown (1997):</b> Estimating Biomass. Rumus: B = 0.0509 * (DBH² * H). Rasio Karbon IPCC 0.47.</p>
                <p><b>[2] Chave (2005):</b> DBH tropis diestimasi dari Tinggi (H): DBH = 0.65 * H^0.92.</p>
                <p><b>[3] Valuasi Kayu:</b> Acuan harga pasar kayu Sengon (Paraserianthes falcataria) Rp 1.5jt/m³.</p>
                <p><b>[4] Valuasi Karbon:</b> Berdasarkan bursa karbon / Carbon Tax Rp 1.9jt/ton CO2e.</p>
              </div>
            </div>
            <div className="bg-orange-600/10 border border-orange-500/20 p-8 rounded-[2.5rem] text-right">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Estimasi Nilai Kayu</p>
              <h4 className="text-3xl font-black text-white">Rp {Math.round(stats.currentValueWood).toLocaleString()}</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Total Vol: {stats.totalVol_m3.toFixed(3)} m³</p>
            </div>
          </div>

        </div>
      </div>
      
      <div className="p-4 bg-slate-900 border-t border-white/5 text-center shrink-0">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Montana AI Dashboard • Scientific Forest Real-time Monitoring</p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
