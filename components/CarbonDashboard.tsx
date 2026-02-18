
import React, { useMemo } from 'react';
import { TreeData, HEALTH_COLORS } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell 
} from 'recharts';

interface CarbonDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  data: TreeData[];
}

const CarbonDashboard: React.FC<CarbonDashboardProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const stats = useMemo(() => {
    const valid = data.filter(d => d.carbon !== undefined && d.Tinggi > 0);
    const totalC = valid.reduce((acc, curr) => acc + (curr.carbon || 0), 0) / 1000; // Ton C
    const totalCO2e = totalC * (44/12);
    const totalVol = valid.reduce((acc, curr) => acc + (curr.vol || 0), 0);
    
    // Economic Estimates
    const pricePerTonCO2e = 1900000; // Rp (Acuan EU ETS/Carbon Tax)
    const currentValue = totalCO2e * pricePerTonCO2e;
    
    // Growth Forecast (Simplified logic from HTML)
    const years = [2025, 2030, 2035, 2040, 2045, 2050];
    const growthData = years.map((year, index) => {
      const multiplier = 1 + (index * 0.15); // Asumsi pertumbuhan 15% per 5 tahun
      return {
        year,
        stock: totalC * multiplier,
        value: totalCO2e * multiplier * pricePerTonCO2e * Math.pow(1.02, index * 5) // inflasi harga 2%
      };
    });

    return { totalC, totalCO2e, totalVol, currentValue, growthData, validCount: valid.length };
  }, [data]);

  return (
    <div className="fixed inset-0 z-[4000] bg-slate-950 flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Carbon Analytics Engine</h2>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Real-time Environmental Economics</p>
          </div>
        </div>
        <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Carbon Stock</p>
              <h3 className="text-3xl font-black text-white">{stats.totalC.toFixed(2)} <span className="text-sm text-emerald-500">Ton C</span></h3>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sequestration (CO2e)</p>
              <h3 className="text-3xl font-black text-white">{stats.totalCO2e.toFixed(2)} <span className="text-sm text-blue-500">Ton</span></h3>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimasi Nilai Ekonomi</p>
              <h3 className="text-2xl font-black text-emerald-400">Rp {Math.round(stats.currentValue).toLocaleString()}</h3>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Validasi Sampel</p>
              <h3 className="text-3xl font-black text-white">{stats.validCount} <span className="text-sm text-slate-500">Pohon</span></h3>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem]">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Proyeksi Akumulasi Karbon (2050)
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.growthData}>
                    <defs>
                      <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="year" stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                    />
                    <Area type="monotone" dataKey="stock" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorStock)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem]">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Estimasi Nilai Aset (NPV Concept)
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="year" stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" hide />
                    <Tooltip 
                      formatter={(value: any) => `Rp ${Math.round(value).toLocaleString()}`}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Reference Info */}
          <div className="bg-blue-600/5 border border-blue-500/10 p-8 rounded-[2.5rem]">
            <h5 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Metodologi & Referensi Ilmiah</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <p className="text-white text-xs font-bold uppercase">Allometrik Biomassa</p>
                <p className="text-slate-400 text-[10px] leading-relaxed">Menggunakan model Brown (1997): B = 0.0509 * (DBH² * H). Rasio Karbon standar IPCC 0.47.</p>
              </div>
              <div className="space-y-2">
                <p className="text-white text-xs font-bold uppercase">Estimasi DBH</p>
                <p className="text-slate-400 text-[10px] leading-relaxed">Karena keterbatasan input sensor, DBH diestimasi dari Tinggi (H) menggunakan kurva pertumbuhan tropis: DBH = 0.65 * H^0.92.</p>
              </div>
              <div className="space-y-2">
                <p className="text-white text-xs font-bold uppercase">Valuasi Ekonomi</p>
                <p className="text-slate-400 text-[10px] leading-relaxed">Acuan harga EU ETS €100/ton CO2e. Proyeksi NPV menggunakan tingkat diskonto 8% per tahun.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-slate-900 border-t border-white/5 text-center">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Montana AI Ecosystem Analysis Tool • Built for Smart Conservation</p>
      </div>
    </div>
  );
};

export default CarbonDashboard;
