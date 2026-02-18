/**
 * Storage utility for saving and loading analysis results
 * Auto-save enabled with 1-day cache duration
 */

import { TreeData } from '../types';

// Storage keys
const STORAGE_KEYS = {
  LATEST_ANALYSIS: 'montana_analysis_latest',
  ANALYSIS_HISTORY: 'montana_analysis_history',
  DATA_SOURCE_CONFIG: 'montana_data_source_config',
  LAST_FETCH_TIME: 'montana_last_fetch_time',
};

// Cache duration: 1 day in milliseconds
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 86400000 ms

export interface SavedAnalysis {
  id: string;
  timestamp: number;
  name: string;
  data: AnalysisResult;
  treeCount: number;
  totalCarbon: number;
  totalCO2e: number;
  dataSource: 'local' | 'online' | 'hybrid';
}

export interface AnalysisResult {
  speciesChartData: any[];
  rangeData: any[];
  tallest: TreeData[];
  total: number;
  scatterData: any[];
  volumeStats: { total: number; avg: number; max: number };
  dbhStats: { avg: number; max: number };
  biomassStats: { total: number; avg: number; max: number; co2e: number; avgCO2e: number };
  carbonStats: { total: number; avg: number; potential: number; fillPercentage: number };
  growthStats: { annualCarbonGrowth: number; annualCO2eGrowth: number };
  economicStats: { currentValue: number; potentialValue: number; npv: number };
  regressionStats: { slope: number; intercept: number; rSquared: number };
  advancedStats: {
    p10Height: number;
    p90Height: number;
    p10DBH: number;
    p90DBH: number;
    p10Carbon: number;
    p90Carbon: number;
    heightSkewness: number;
    dbhSkewness: number;
    carbonSkewness: number;
    sturgesBins: number;
  };
  histograms: { height: any[]; dbh: any[]; volume: any[] };
  topByVolume: any[];
  topByBiomass: any[];
  topByCarbon: any[];
}

export interface DataSourceConfig {
  mode: 'local' | 'online' | 'hybrid';
  onlineUrl?: string;
  cacheDuration: number; // in minutes, default 1440 (1 day)
  autoSave: boolean;
  lastUpdated?: number;
}

// Default configuration
export const defaultDataSourceConfig: DataSourceConfig = {
  mode: 'local',
  cacheDuration: 1440, // 1 day in minutes
  autoSave: true,
};

/**
 * Save analysis result to localStorage (auto-save)
 */
export const saveAnalysisToStorage = (
  analysis: AnalysisResult,
  dataSource: 'local' | 'online' | 'hybrid' = 'local',
  name?: string
): SavedAnalysis => {
  try {
    const timestamp = Date.now();
    const savedAnalysis: SavedAnalysis = {
      id: `analysis_${timestamp}`,
      timestamp,
      name: name || `Analisis ${new Date(timestamp).toLocaleString('id-ID')}`,
      data: analysis,
      treeCount: analysis.total,
      totalCarbon: analysis.carbonStats.total,
      totalCO2e: analysis.biomassStats.co2e,
      dataSource,
    };

    // Save as latest
    localStorage.setItem(STORAGE_KEYS.LATEST_ANALYSIS, JSON.stringify(savedAnalysis));

    // Add to history
    const history = getAnalysisHistory();
    history.unshift(savedAnalysis);
    
    // Keep only last 10 analyses to prevent storage bloat
    const trimmedHistory = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.ANALYSIS_HISTORY, JSON.stringify(trimmedHistory));

    console.log('[Storage] Analysis saved successfully:', savedAnalysis.id);
    return savedAnalysis;
  } catch (error) {
    console.error('[Storage] Failed to save analysis:', error);
    throw new Error('Gagal menyimpan analisis ke storage');
  }
};

/**
 * Load latest analysis from localStorage
 */
export const loadLatestAnalysis = (): SavedAnalysis | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LATEST_ANALYSIS);
    if (!data) return null;

    const parsed: SavedAnalysis = JSON.parse(data);
    
    // Check if cache is still valid (1 day)
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_DURATION) {
      console.log('[Storage] Latest analysis expired (older than 1 day)');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[Storage] Failed to load latest analysis:', error);
    return null;
  }
};

/**
 * Get analysis history
 */
export const getAnalysisHistory = (): SavedAnalysis[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ANALYSIS_HISTORY);
    if (!data) return [];
    
    const history: SavedAnalysis[] = JSON.parse(data);
    
    // Filter out expired entries (older than 1 day)
    const validHistory = history.filter(item => {
      const age = Date.now() - item.timestamp;
      return age <= CACHE_DURATION;
    });
    
    // Update storage if some entries were removed
    if (validHistory.length !== history.length) {
      localStorage.setItem(STORAGE_KEYS.ANALYSIS_HISTORY, JSON.stringify(validHistory));
    }
    
    return validHistory;
  } catch (error) {
    console.error('[Storage] Failed to load history:', error);
    return [];
  }
};

/**
 * Load specific analysis by ID
 */
export const loadAnalysisById = (id: string): SavedAnalysis | null => {
  try {
    const history = getAnalysisHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('[Storage] Failed to load analysis by ID:', error);
    return null;
  }
};

/**
 * Delete specific analysis
 */
export const deleteAnalysis = (id: string): boolean => {
  try {
    const history = getAnalysisHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.ANALYSIS_HISTORY, JSON.stringify(filtered));
    
    // If deleted item was the latest, clear latest
    const latest = loadLatestAnalysis();
    if (latest && latest.id === id) {
      localStorage.removeItem(STORAGE_KEYS.LATEST_ANALYSIS);
      // Set new latest if available
      if (filtered.length > 0) {
        localStorage.setItem(STORAGE_KEYS.LATEST_ANALYSIS, JSON.stringify(filtered[0]));
      }
    }
    
    console.log('[Storage] Analysis deleted:', id);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete analysis:', error);
    return false;
  }
};

/**
 * Clear all analysis data
 */
export const clearAllAnalysisData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.LATEST_ANALYSIS);
    localStorage.removeItem(STORAGE_KEYS.ANALYSIS_HISTORY);
    console.log('[Storage] All analysis data cleared');
  } catch (error) {
    console.error('[Storage] Failed to clear data:', error);
  }
};

/**
 * Save data source configuration
 */
export const saveDataSourceConfig = (config: DataSourceConfig): void => {
  try {
    const configWithTimestamp = {
      ...config,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCE_CONFIG, JSON.stringify(configWithTimestamp));
    console.log('[Storage] Data source config saved:', config.mode);
  } catch (error) {
    console.error('[Storage] Failed to save config:', error);
  }
};

/**
 * Load data source configuration
 */
export const loadDataSourceConfig = (): DataSourceConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DATA_SOURCE_CONFIG);
    if (!data) return defaultDataSourceConfig;
    
    const parsed: DataSourceConfig = JSON.parse(data);
    return { ...defaultDataSourceConfig, ...parsed };
  } catch (error) {
    console.error('[Storage] Failed to load config:', error);
    return defaultDataSourceConfig;
  }
};

/**
 * Check if cached data is still valid
 */
export const isCacheValid = (): boolean => {
  try {
    const latest = loadLatestAnalysis();
    if (!latest) return false;
    
    const age = Date.now() - latest.timestamp;
    return age <= CACHE_DURATION;
  } catch (error) {
    return false;
  }
};

/**
 * Get storage usage info
 */
export const getStorageInfo = (): { used: number; remaining: number; percent: number } => {
  try {
    let used = 0;
    for (const key in STORAGE_KEYS) {
      const item = localStorage.getItem(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]);
      if (item) used += item.length * 2; // UTF-16 encoding
    }
    
    // Estimate remaining (localStorage limit is typically 5-10 MB)
    const limit = 5 * 1024 * 1024; // 5 MB
    const remaining = limit - used;
    const percent = (used / limit) * 100;
    
    return { used, remaining, percent };
  } catch (error) {
    return { used: 0, remaining: 0, percent: 0 };
  }
};

/**
 * Export analysis to JSON file
 */
export const exportAnalysisToJSON = (analysis: SavedAnalysis): string => {
  return JSON.stringify(analysis, null, 2);
};

/**
 * Import analysis from JSON
 */
export const importAnalysisFromJSON = (jsonString: string): SavedAnalysis | null => {
  try {
    const parsed = JSON.parse(jsonString);
    // Validate structure
    if (parsed.id && parsed.timestamp && parsed.data) {
      return parsed as SavedAnalysis;
    }
    return null;
  } catch (error) {
    console.error('[Storage] Failed to import JSON:', error);
    return null;
  }
};
