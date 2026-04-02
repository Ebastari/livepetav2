/**
 * IndexedDB cache untuk data pohon
 * - Simpan data saat pertama kali fetch
 * - Load instan dari cache saat kunjungan berikutnya
 * - Background refresh tetap jalan
 */

import { TreeData } from '../types';

const DB_NAME = 'montana_tree_cache';
const DB_VERSION = 1;
const STORE_NAME = 'trees';
const META_STORE = 'meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_cacheId', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Simpan seluruh data pohon ke IndexedDB */
export async function saveTrees(data: TreeData[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');

  // Clear old data
  tx.objectStore(STORE_NAME).clear();

  // Insert semua data
  const store = tx.objectStore(STORE_NAME);
  for (const item of data) {
    store.put({ ...item, _cacheId: undefined });
  }

  // Simpan timestamp
  tx.objectStore(META_STORE).put({ key: 'lastSaved', value: Date.now(), count: data.length });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load data pohon dari IndexedDB */
export async function loadTrees(): Promise<TreeData[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        db.close();
        const data = req.result;
        if (!data || data.length === 0) { resolve(null); return; }
        // Hapus _cacheId internal
        const cleaned = data.map(({ _cacheId, ...rest }) => rest as TreeData);
        resolve(cleaned);
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return null;
  }
}

/** Cek apakah cache ada dan berapa jumlahnya */
export async function getCacheMeta(): Promise<{ lastSaved: number; count: number } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).get('lastSaved');

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        db.close();
        if (req.result) {
          resolve({ lastSaved: req.result.value, count: req.result.count });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return null;
  }
}

/** Check if this is user's first ever visit */
export function isFirstVisit(): boolean {
  return !localStorage.getItem('montana_has_visited');
}

/** Mark that user has visited */
export function markVisited(): void {
  localStorage.setItem('montana_has_visited', '1');
}
