
export interface TreeData {
  ID?: string;
  "No Pohon": string | number;
  "Tanaman": string;
  "Kesehatan": 'Sehat' | 'Merana' | 'Mati';
  "Tinggi": number;
  "Pengawas": string;
  "Tanggal": string;
  "Link Drive": string;
  "X": string | number;
  "Y": string | number;
  carbon?: number;
  co2e?: number;
  vol?: number;
  isValidLocation?: boolean;
  // Allometric calculation fields
  dbh?: number;        // Diameter Breast Height (cm)
  volume?: number;     // Volume kayu (m³)
  biomass?: number;    // Biomassa (kg)
  carbonStock?: number; // Karbon (kg)
  co2Equivalent?: number; // CO₂e (kg)
}

// Added HealthStatus enum and HEALTH_COLORS to fix export errors in components
export enum HealthStatus {
  HEALTHY = 'Sehat',
  SICK = 'Merana',
  DEAD = 'Mati'
}

export const HEALTH_COLORS: Record<string, string> = {
  'Sehat': '#10b981',
  'Merana': '#f59e0b',
  'Mati': '#ef4444'
};

export const SPECIES_PALETTE: Record<string, string> = {
  'Sengon': '#3b82f6',
  'Jati': '#8b5cf6',
  'Mahoni': '#10b981',
  'Trembesi': '#f59e0b',
  'Pulai': '#ec4899',
  'Lainnya': '#64748b'
};

export const getSpeciesColor = (name: string) => {
  if (SPECIES_PALETTE[name]) return SPECIES_PALETTE[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  const color = "#" + "00000".substring(0, 6 - c.length) + c;
  return color;
};

export const getImageUrl = (item: TreeData, size: 'small' | 'large' = 'large') => {
  const source = String(item["Link Drive"] || "").trim();
  if (!source || source.includes("File tidak ditemukan") || source === '-' || source === 'N/A') {
    return '';
  }

  let fileId = '';

  // Extract file ID from various Google Drive URL formats
  if (source.includes('drive.google.com')) {
    const match = source.match(/\/d\/([a-zA-Z0-9_-]+)/) || source.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    }
  } else if (source.includes('lh3.googleusercontent.com')) {
    return source;
  } else if (source.startsWith('http')) {
    return source;
  } else if (/^[a-zA-Z0-9_-]{10,}$/.test(source)) {
    fileId = source;
  }

  if (fileId) {
    const w = size === 'small' ? 'w200' : 'w800';
    // lh3 URL langsung return 200 image/jpeg, CORS OK, tanpa redirect
    return `https://lh3.googleusercontent.com/d/${fileId}=${w}`;
  }

  return '';
};
