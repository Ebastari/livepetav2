
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
  if (!source || source.includes("File tidak ditemukan")) {
    return 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400';
  }

  let fileId = source;

  // Check if it's a full URL and extract the ID
  if (source.includes('drive.google.com')) {
    const match = source.match(/\/d\/([a-zA-Z0-9_-]+)/) || source.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    }
  } else if (source.startsWith('http')) {
    // It might be a direct image link, so just return it.
    return source;
  }

  // If we have a file ID, construct the thumbnail URL
  if (fileId) {
    const width = size === 'small' ? 'w200' : 'w800';
    return `https://lh3.googleusercontent.com/d/${fileId}=${width}`;
  }

  // Fallback for any other case
  return 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400';
};
