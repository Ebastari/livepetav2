/**
 * Data source utility for fetching tree data from various sources
 * Supports: local, online, and hybrid modes
 */

import { TreeData } from '../types';
import { 
  loadDataSourceConfig, 
  saveDataSourceConfig, 
  isCacheValid, 
  loadLatestAnalysis,
  defaultDataSourceConfig 
} from './storage';

export interface FetchResult {
  data: TreeData[];
  source: 'local' | 'online' | 'cache';
  timestamp: number;
  message?: string;
}

export interface OnlineDataResponse {
  trees: TreeData[];
  metadata?: {
    totalCount: number;
    lastUpdated: string;
    version: string;
  };
}

/**
 * Fetch data based on configured mode
 */
export const fetchTreeData = async (
  forceRefresh: boolean = false
): Promise<FetchResult> => {
  const config = loadDataSourceConfig();
  
  switch (config.mode) {
    case 'local':
      return fetchFromLocal();
    
    case 'online':
      return fetchFromOnline(config.onlineUrl, forceRefresh);
    
    case 'hybrid':
      return fetchHybrid(config.onlineUrl, forceRefresh);
    
    default:
      return fetchFromLocal();
  }
};

/**
 * Fetch from local storage (cached analysis)
 */
const fetchFromLocal = async (): Promise<FetchResult> => {
  try {
    const cached = loadLatestAnalysis();
    
    if (cached && cached.data && cached.data.scatterData) {
      // Reconstruct TreeData from scatter data
      const treeData: TreeData[] = cached.data.scatterData.map((item: any) => ({
        ID: item.id,
        'No Pohon': item.id,
        Tanaman: item.species,
        Tinggi: item.height,
        Kesehatan: 'Sehat', // Default
        Pengawas: 'Unknown', // Default
        Tanggal: new Date(cached.timestamp).toISOString(),
        'Link Drive': '',
        X: 0,
        Y: 0,
        dbh: item.dbh,
        volume: item.volume,
        biomass: item.biomass,
        carbonStock: item.carbon,
        co2Equivalent: item.co2e * 1000, // Convert back to kg
      }));

      return {
        data: treeData,
        source: 'cache',
        timestamp: cached.timestamp,
        message: `Data dimuat dari cache (${cached.treeCount} pohon)`,
      };
    }

    return {
      data: [],
      source: 'local',
      timestamp: Date.now(),
      message: 'Tidak ada data tersimpan di local storage',
    };
  } catch (error) {
    console.error('[DataSource] Failed to load from local:', error);
    return {
      data: [],
      source: 'local',
      timestamp: Date.now(),
      message: 'Gagal memuat data dari local storage',
    };
  }
};

/**
 * Fetch from online endpoint
 */
const fetchFromOnline = async (
  url?: string,
  forceRefresh: boolean = false
): Promise<FetchResult> => {
  if (!url) {
    return {
      data: [],
      source: 'online',
      timestamp: Date.now(),
      message: 'URL online tidak dikonfigurasi',
    };
  }

  try {
    // Check cache first if not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      const cached = loadLatestAnalysis();
      if (cached) {
        const treeData: TreeData[] = cached.data.scatterData.map((item: any) => ({
          ID: item.id,
          'No Pohon': item.id,
          Tanaman: item.species,
          Tinggi: item.height,
          Kesehatan: 'Sehat',
          Pengawas: 'Unknown',
          Tanggal: new Date(cached.timestamp).toISOString(),
          'Link Drive': '',
          X: 0,
          Y: 0,
          dbh: item.dbh,
          volume: item.volume,
          biomass: item.biomass,
          carbonStock: item.carbon,
          co2Equivalent: item.co2e * 1000,
        }));

        return {
          data: treeData,
          source: 'cache',
          timestamp: cached.timestamp,
          message: 'Data dimuat dari cache (valid)',
        };
      }
    }

    // Fetch from online
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: OnlineDataResponse = await response.json();
    
    // Transform to TreeData format
    const treeData: TreeData[] = result.trees.map((tree, index) => ({
      ...tree,
      ID: tree.ID || `online_${Date.now()}_${index}`,
    }));

    return {
      data: treeData,
      source: 'online',
      timestamp: Date.now(),
      message: `Data berhasil diambil dari online (${treeData.length} pohon)`,
    };

  } catch (error) {
    console.error('[DataSource] Failed to fetch from online:', error);
    
    // Fallback to cache if available
    const cached = loadLatestAnalysis();
    if (cached) {
      const treeData: TreeData[] = cached.data.scatterData.map((item: any) => ({
        ID: item.id,
        'No Pohon': item.id,
        Tanaman: item.species,
        Tinggi: item.height,
        Kesehatan: 'Sehat',
        Pengawas: 'Unknown',
        Tanggal: new Date(cached.timestamp).toISOString(),
        'Link Drive': '',
        X: 0,
        Y: 0,
        dbh: item.dbh,
        volume: item.volume,
        biomass: item.biomass,
        carbonStock: item.carbon,
        co2Equivalent: item.co2e * 1000,
      }));

      return {
        data: treeData,
        source: 'cache',
        timestamp: cached.timestamp,
        message: 'Gagal mengambil data online, menggunakan cache',
      };
    }

    return {
      data: [],
      source: 'online',
      timestamp: Date.now(),
      message: `Gagal mengambil data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Hybrid mode: Try cache first, then online if needed
 */
const fetchHybrid = async (
  url?: string,
  forceRefresh: boolean = false
): Promise<FetchResult> => {
  // If forcing refresh or cache invalid, fetch online
  if (forceRefresh || !isCacheValid()) {
    if (url) {
      return fetchFromOnline(url, forceRefresh);
    }
  }

  // Try cache first
  const cached = loadLatestAnalysis();
  if (cached) {
    const treeData: TreeData[] = cached.data.scatterData.map((item: any) => ({
      ID: item.id,
      'No Pohon': item.id,
      Tanaman: item.species,
      Tinggi: item.height,
      Kesehatan: 'Sehat',
      Pengawas: 'Unknown',
      Tanggal: new Date(cached.timestamp).toISOString(),
      'Link Drive': '',
      X: 0,
      Y: 0,
      dbh: item.dbh,
      volume: item.volume,
      biomass: item.biomass,
      carbonStock: item.carbon,
      co2Equivalent: item.co2e * 1000,
    }));

    return {
      data: treeData,
      source: 'cache',
      timestamp: cached.timestamp,
      message: `Data dimuat dari cache (${cached.treeCount} pohon)`,
    };
  }

  // No cache, try online if URL available
  if (url) {
    return fetchFromOnline(url, forceRefresh);
  }

  return {
    data: [],
    source: 'local',
    timestamp: Date.now(),
    message: 'Tidak ada data tersedia (cache kosong, URL tidak dikonfigurasi)',
  };
};

/**
 * Set data source mode
 */
export const setDataSourceMode = (
  mode: 'local' | 'online' | 'hybrid',
  onlineUrl?: string
): void => {
  const currentConfig = loadDataSourceConfig();
  saveDataSourceConfig({
    ...currentConfig,
    mode,
    onlineUrl: onlineUrl || currentConfig.onlineUrl,
  });
};

/**
 * Get current data source info
 */
export const getDataSourceInfo = (): {
  mode: string;
  url?: string;
  autoSave: boolean;
  cacheValid: boolean;
} => {
  const config = loadDataSourceConfig();
  return {
    mode: config.mode,
    url: config.onlineUrl,
    autoSave: config.autoSave,
    cacheValid: isCacheValid(),
  };
};

/**
 * Prefetch data for offline use
 */
export const prefetchForOffline = async (url: string): Promise<boolean> => {
  try {
    const result = await fetchFromOnline(url, true);
    return result.source === 'online' && result.data.length > 0;
  } catch (error) {
    console.error('[DataSource] Prefetch failed:', error);
    return false;
  }
};

/**
 * Check if running in offline mode
 */
export const isOffline = (): boolean => {
  return !navigator.onLine;
};

/**
 * Listen for online/offline events
 */
export const setupConnectivityListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};
