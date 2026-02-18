# TODO: Perbaikan HeightAnalysis Component

## Task List - ✅ COMPLETED

### 1. Update types.ts ✅
- [x] Tambahkan field `ID` ke interface TreeData
- [x] Tambahkan field opsional untuk hasil perhitungan (dbh, volume, biomass, carbon)

### 2. Update HeightAnalysis.tsx - Perhitungan Allometrik ✅
- [x] Update fungsi calculateVolume (verifikasi H dalam meter)
- [x] Tambahkan fungsi calculateDBH: `DBH = 0.65 × H^0.92`
- [x] Update fungsi calculateBiomass: `Biomass = 0.0509 × (DBH² × H)`
- [x] Update fungsi calculateCarbon: `Carbon = Biomass × 0.47`
- [x] Update fungsi calculateCO2e: `CO2e = Carbon × 3.67`

### 3. Update Scatter Diagram ✅
- [x] Ganti dari "No Pohon" ke field "ID" untuk sumbu X
- [x] Pastikan ID unik digunakan sebagai identifier

### 4. Tambahkan Analisis Stok Karbon ✅
- [x] Hitung total karbon saat ini (C_now)
- [x] Hitung potensi karbon seumur hidup (240 kg per pohon)
- [x] Tampilkan statistik stok karbon dengan progress bar

### 5. Tambahkan Pertumbuhan Karbon Tahunan ✅
- [x] Hitung delta C per tahun
- [x] Proyeksi pertumbuhan karbon (25 tahun)

### 6. Tambahkan Valuasi Ekonomi ✅
- [x] Hitung nilai karbon saat ini (harga Rp 1.900.000/ton)
- [x] Proyeksi NPV dengan discount rate 8%
- [x] Pertumbuhan harga karbon 1.5% per tahun

### 7. Tambahkan Analisis Regresi ✅
- [x] Regresi linear Tinggi vs Karbon
- [x] Hitung R² dan Pearson r

### 8. Tambahkan Statistik Lanjutan ✅
- [x] Histogram dengan Sturges Rule (Bins = log₂(n) + 1)
- [x] Percentile (P10–P90) untuk Tinggi, DBH, dan Karbon
- [x] Skewness calculation

### 9. UI/UX Improvements ✅
- [x] Tambahkan section Carbon Stock Overview dengan visualisasi
- [x] Tambahkan section Economic Valuation (NPV)
- [x] Tambahkan section Allometric Analysis
- [x] Tambahkan section Regression Analysis
- [x] Tambahkan section Advanced Statistics
- [x] Tambahkan 3 histogram (Tinggi, DBH, Volume)
- [x] Tambahkan Top 10 by Carbon ranking

## Summary of Changes

### File: `types.ts`
- Added `ID?: string` field to TreeData interface
- Added allometric calculation fields: `dbh`, `volume`, `biomass`, `carbonStock`, `co2Equivalent`

### File: `components/HeightAnalysis.tsx`
**New Functions:**
- `calculateDBH()` - Allometric equation for diameter
- `calculateVolume()` - Volume equation (H in meters)
- `calculateBiomass()` - Biomass allometric equation
- `calculateCarbon()` - Carbon content calculation
- `calculateCO2e()` - CO2 equivalent calculation
- `calculateCO2eTonnes()` - Convert to tonnes
- `calculateCarbonNPV()` - NPV calculation for carbon value

**New Analysis Features:**
1. **Scatter Diagram**: Now uses unique `ID` field instead of `No Pohon`
2. **Carbon Stock Overview**: Total carbon, potential (240kg/tree), fill rate with progress bar
3. **Economic Valuation**: Current value, potential value, NPV (25 years, 8% discount)
4. **Annual Growth**: Projected CO2e growth per year
5. **Regression Analysis**: Linear model C = mH + b with R²
6. **Advanced Statistics**: P10/P90 percentiles, skewness for height/DBH/carbon
7. **Histograms**: Sturges Rule bins for height, DBH, and volume
8. **Rankings**: Top 10 by Volume, Biomass, and Carbon (with truncated IDs)

**Constants Added:**
- `CARBON_PRICE_IDR = 1900000`
- `CARBON_PRICE_GROWTH_RATE = 0.015` (1.5%)
- `DISCOUNT_RATE = 0.08` (8%)
- `PROJECT_YEARS = 25`
- `MAX_CARBON_PER_TREE_KG = 240`
