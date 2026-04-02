import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
import { TreeData, getSpeciesColor, getImageUrl } from './types';
import { Gallery } from './Gallery';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { LiveFeed } from './components/LiveFeed';
import Sidebar from './components/Sidebar';
import HeightAnalysis from './components/HeightAnalysis';
import { MONTANA_BOUNDARY } from './constants/boundaryData';
import { ViewSelector } from './components/ViewSelector';
import { LastPointNotification } from './components/LastPointNotification';
import { SpeciesLegend } from './components/SpeciesLegend';
import { SelectionStats } from './components/SelectionStats';
import { EditPanel } from './components/EditPanel';
import { saveTrees, loadTrees, isFirstVisit, markVisited } from './utils/treeCache';

// Menggunakan URL terbaru yang Anda berikan
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVh2uBSPOEN81G7TpmrRTVtIsjVOtW7wFYWATD0vroRjLPoKOVNBlRfgyMbkjOoGsofg/exec';
const REFRESH_INTERVAL = 15000; 

const isPointInPolygon = (point: [number, number], vs: [number, number][]) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const App: React.FC = () => {
  const [data, setData] = useState<TreeData[]>([]);
  const [filteredData, setFilteredData] = useState<TreeData[]>([]);
  const [activeSpeciesFilter, setActiveSpeciesFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('Menghubungkan ke server...');
  const loadStartRef = useRef(0);
  const [viewMode, setViewMode] = useState<'pc' | 'mobile' | 'unset'>('pc');
  const [syncProgress, setSyncProgress] = useState(0);
  
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectionPoints, setSelectionPoints] = useState<L.LatLng[]>([]);
  const [selectedTrees, setSelectedTrees] = useState<TreeData[] | null>(null);

  // Progress kontinu berbasis waktu - tidak pernah stuck
  useEffect(() => {
    if (!isLoading) return;
    loadStartRef.current = Date.now();
    setLoadProgress(0);
    const timer = setInterval(() => {
      const elapsed = Date.now() - loadStartRef.current;
      // Kurva eksponensial: naik cepat di awal, melambat mendekati 92%
      // ~17% di 1s, ~42% di 3s, ~58% di 5s, ~80% di 10s, ~90% di 20s
      const progress = 92 * (1 - Math.exp(-elapsed / 5000));
      setLoadProgress(prev => prev >= 100 ? 100 : Math.max(prev, progress));
    }, 50);
    return () => clearInterval(timer);
  }, [isLoading]);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isHeightAnalysisOpen, setIsHeightAnalysisOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [pohonIdToEdit, setPohonIdToEdit] = useState<string>('');
  const [showBoundary, setShowBoundary] = useState(true);
  
  const [activeTreeDetail, setActiveTreeDetail] = useState<TreeData | null>(null);
  const [isLiveFeedVisible, setIsLiveFeedVisible] = useState(true);
  
  // Map layer state
  const [currentMapLayer, setCurrentMapLayer] = useState<'satellite' | 'openstreet' | 'white'>('satellite');
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // KMZ Upload state
  const [kmzLayers, setKmzLayers] = useState<L.Layer[]>([]);
  const [showKmzUpload, setShowKmzUpload] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const pulseRef = useRef<L.LayerGroup | null>(null);
  const boundaryRef = useRef<L.GeoJSON | null>(null);
  const selectionPolyRef = useRef<L.Polygon | null>(null);
  const selectionMarkersRef = useRef<L.CircleMarker[]>([]);
  const prevDataCount = useRef<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem('montana_view_mode') as 'pc' | 'mobile';
    if (saved) setViewMode(saved);
  }, []);

  const handleSelectMode = (mode: 'pc' | 'mobile') => {
    setViewMode(mode);
    localStorage.setItem('montana_view_mode', mode);
  };

  const calculateCarbon = (height: number) => {
    const dbh = 0.65 * Math.pow(height, 0.92);
    const biomass = 0.0509 * Math.pow(dbh, 2) * height;
    return (biomass * 0.47) / 1000; 
  };

  const parseCoord = (val: any) => {
    if (typeof val === 'number') return val;
    return parseFloat(String(val || '0').replace(',', '.'));
  };

  const renderMarkers = useCallback((items: TreeData[]) => {
    if (!markersRef.current || !pulseRef.current || !mapRef.current) return;
    markersRef.current.clearLayers();
    pulseRef.current.clearLayers();

    const displayData = activeSpeciesFilter 
      ? items.filter(t => t.Tanaman === activeSpeciesFilter)
      : items;

    displayData.forEach((item) => {
      const lat = parseCoord(item.X);
      const lon = parseCoord(item.Y);

      if (!isNaN(lat) && !isNaN(lon)) {
        const color = getSpeciesColor(item.Tanaman);
        const isNew = items.indexOf(item) >= prevDataCount.current && prevDataCount.current > 0;

        const marker = L.circleMarker([lat, lon], {
          radius: viewMode === 'mobile' ? 9 : 7,
          fillColor: color,
          color: 'white',
          weight: 2,
          fillOpacity: 0.9,
          className: isNew ? 'marker-new-ping' : ''
        });

        marker.on('click', () => {
          setActiveTreeDetail(item);
        });

        marker.bindPopup(`
          <div class="flex flex-col">
            <div class="relative ${viewMode === 'mobile' ? 'h-40' : 'h-32'} w-full popup-image-container">
              <img src="${getImageUrl(item, 'small')}" class="h-full w-full object-cover" onerror="this.style.display='none'" />
              <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase shadow-lg">ID: ${item["No Pohon"]}</div>
            </div>
            <div class="p-4">
              <h4 class="text-[11px] font-black uppercase text-slate-800 tracking-tight">${item.Tanaman}</h4>
              <p class="text-[9px] text-slate-500 font-bold mt-1 uppercase">Pengawas: ${item.Pengawas || 'N/A'}</p>
            </div>
          </div>
        `, { className: 'modern-popup', maxWidth: 220 });
        
        markersRef.current?.addLayer(marker);

        if (items.indexOf(item) === items.length - 1) {
          const icon = L.divIcon({ 
            className: 'pulse-marker', 
            iconSize: [40, 40], 
            iconAnchor: [20, 20],
            html: `<div style="color: ${color}; width:100%; height:100%; border-radius:50%; position: relative;">
                     <div class="last-point-label">#${item["No Pohon"]} - ${item.Pengawas}</div>
                   </div>`
          });
          L.marker([lat, lon], { icon, zIndexOffset: 2000 }).addTo(pulseRef.current!);
        }
      }
    });
  }, [viewMode, activeSpeciesFilter]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) {
      setLoadStatus('Menghubungkan ke server...');
      setIsLoading(true);
    }
    try {
      if (!isSilent) setLoadStatus('Mengambil 18.000+ data pohon dari server...');

      const res = await fetch(`${APPS_SCRIPT_URL}?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error(`Status Server: ${res.status}`);

      if (!isSilent) setLoadStatus('Menerima response server...');

      const raw = await res.json();
      const json: TreeData[] = Array.isArray(raw) ? raw : (raw.data || []);

      if (!isSilent) setLoadStatus(`Normalisasi ${json.length.toLocaleString()} data pohon...`);
      
      const processed = json.map(item => {
        const rawName = String(item.Tanaman || '').trim();
        const normalizedName = rawName
          .toLowerCase()
          .replace(/\b\w/g, c => c.toUpperCase());
        return {
          ...item,
          Tanaman: normalizedName || item.Tanaman,
          carbon: calculateCarbon(Number(item.Tinggi)),
          co2e: calculateCarbon(Number(item.Tinggi)) * (44/12),
          vol: 0
        };
      });

      if (!isSilent) setLoadStatus('Merender titik ke peta...');

      setData(processed);
      setFilteredData(processed);
      renderMarkers(processed);
      
      if (!isSilent && processed.length > 0 && prevDataCount.current === 0) {
        setActiveTreeDetail(processed[processed.length - 1]);
      }
      
      prevDataCount.current = processed.length;

      // Simpan ke IndexedDB & tandai sudah pernah kunjungi
      saveTrees(processed).then(() => markVisited()).catch(() => {});

      if (!isSilent) {
        setLoadStatus('Selesai! Menyiapkan peta...');
        setLoadProgress(100);
        setTimeout(() => setIsLoading(false), 600);
      }
    } catch (e) { 
      console.error("Error loading data:", e);
      if (!isSilent) {
        setIsLoading(false);
        alert("Gagal memuat data. Pastikan Apps Script di-deploy sebagai 'Anyone'.");
      }
    }
  };

  /** Load awal: dari cache jika bukan kunjungan pertama, atau fetch penuh */
  const initializeData = async () => {
    const firstTime = isFirstVisit();
    
    if (!firstTime) {
      try {
        const cached = await loadTrees();
        if (cached && cached.length > 0) {
          setData(cached);
          setFilteredData(cached);
          renderMarkers(cached);
          prevDataCount.current = cached.length;
          setActiveTreeDetail(cached[cached.length - 1]);
          // Background refresh dari server
          loadData(true);
          return;
        }
      } catch { /* cache gagal, lanjut fetch penuh */ }
    }
    
    // Pertama kali atau cache kosong: tampilkan loading penuh
    loadData(false);
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const idStr = id.toString().trim();
    
    // Hapus dari UI langsung (optimistic)
    setData(prev => { const next = prev.filter(t => String(t["No Pohon"]) !== idStr); renderMarkers(next); return next; });
    setFilteredData(prev => prev.filter(t => String(t["No Pohon"]) !== idStr));
    setSelectedTrees(prev => prev ? prev.filter(t => String(t["No Pohon"]) !== idStr) : null);
    setActiveTreeDetail(null);

    try {
      // GET dengan query param — Apps Script CORS bekerja sempurna untuk GET
      const res = await fetch(`${APPS_SCRIPT_URL}?action=delete&pohonId=${encodeURIComponent(idStr)}&t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors'
      });
      const result = await res.json();
      if (result.status !== 'success') {
        console.warn("Server delete gagal:", result);
        loadData(true); // Rollback
        return false;
      }
      setTimeout(() => loadData(true), 1500);
      return true;
    } catch (e) {
      console.error("Delete error:", e);
      loadData(true);
      return false;
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    const idSet = new Set(ids.map(id => id.toString().trim()));
    
    // Hapus dari UI langsung
    setData(prev => { const next = prev.filter(t => !idSet.has(String(t["No Pohon"]))); renderMarkers(next); return next; });
    setFilteredData(prev => prev.filter(t => !idSet.has(String(t["No Pohon"]))));
    setSelectedTrees(prev => prev ? prev.filter(t => !idSet.has(String(t["No Pohon"]))) : null);

    try {
      const results = await Promise.all(
        [...idSet].map(id =>
          fetch(`${APPS_SCRIPT_URL}?action=delete&pohonId=${encodeURIComponent(id)}&t=${Date.now()}`, {
            method: 'GET',
            mode: 'cors'
          }).then(r => r.json()).catch(() => ({ status: 'error' }))
        )
      );
      const successCount = results.filter(r => r.status === 'success').length;
      setTimeout(() => loadData(true), 1500);
      alert(`Berhasil menghapus ${successCount}/${idSet.size} item`);
    } catch (e) {
      console.error("Bulk delete error:", e);
      loadData(true);
      alert("Terjadi kesalahan saat menghapus data.");
    }
  };

  const handleOpenDeletePanel = (id: string) => {
    setPohonIdToEdit(id);
    setIsEditOpen(true);
  };

  useEffect(() => {
    if (viewMode === 'unset') return;
    const timer = setInterval(() => { loadData(true); setSyncProgress(0); }, REFRESH_INTERVAL);
    const progressTimer = setInterval(() => { setSyncProgress(prev => (prev >= 100 ? 0 : prev + (100 / (REFRESH_INTERVAL / 100)))); }, 100);
    return () => { clearInterval(timer); clearInterval(progressTimer); };
  }, [viewMode]);

  // Map layer URLs
  const mapLayers = {
    satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    openstreet: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    white: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  };

  // Switch map layer
  const switchMapLayer = (layerType: 'satellite' | 'openstreet' | 'white') => {
    if (!mapRef.current) return;
    
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    
    const newLayer = L.tileLayer(mapLayers[layerType], { maxZoom: 20 });
    newLayer.addTo(mapRef.current);
    tileLayerRef.current = newLayer;
    setCurrentMapLayer(layerType);
  };

  // Handle KMZ/KML file upload with better parsing
  const handleKmzUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let kmlContent: string;
      
      // Check if it's a KMZ file (ZIP)
      if (file.name.toLowerCase().endsWith('.kmz')) {
        // KMZ is a ZIP file, need to extract KML from it
        const JSZip = await import('jszip');
        const zip = await JSZip.default.loadAsync(file);
        
        // Find the first .kml file in the ZIP
        const kmlFile = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
        if (!kmlFile) {
          alert('File KMZ tidak berisi file KML yang valid.');
          return;
        }
        
        kmlContent = await zip.files[kmlFile].async('text');
      } else {
        // Regular KML file
        kmlContent = await file.text();
      }

      // Parse KML content
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
      
      // Check for parse errors
      const parseError = kmlDoc.getElementsByTagName('parsererror')[0];
      if (parseError) {
        console.error('XML Parse Error:', parseError.textContent);
        alert('Gagal memparse file KML. Format XML tidak valid.');
        return;
      }

      // Extract all coordinates from various geometry types
      const allCoordinates: [number, number][][] = [];
      
      // Helper function to parse coordinate string
      const parseCoordinates = (coordText: string): [number, number][] => {
        const coords: [number, number][] = [];
        const lines = coordText.trim().split(/\s+/);
        
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.split(',');
          if (parts.length >= 2) {
            const lon = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            // Ignore altitude (parts[2]) if present
            if (!isNaN(lat) && !isNaN(lon)) {
              coords.push([lat, lon]);
            }
          }
        }
        return coords;
      };

      // Parse different geometry types
      // 1. Polygon
      const polygons = kmlDoc.getElementsByTagName('Polygon');
      for (let i = 0; i < polygons.length; i++) {
        const outerBoundary = polygons[i].getElementsByTagName('outerBoundaryIs')[0];
        if (outerBoundary) {
          const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
          if (linearRing) {
            const coordText = linearRing.getElementsByTagName('coordinates')[0]?.textContent || '';
            const coords = parseCoordinates(coordText);
            if (coords.length > 0) allCoordinates.push(coords);
          }
        }
      }

      // 2. LineString
      const lineStrings = kmlDoc.getElementsByTagName('LineString');
      for (let i = 0; i < lineStrings.length; i++) {
        const coordText = lineStrings[i].getElementsByTagName('coordinates')[0]?.textContent || '';
        const coords = parseCoordinates(coordText);
        if (coords.length > 0) allCoordinates.push(coords);
      }

      // 3. Point
      const points = kmlDoc.getElementsByTagName('Point');
      const pointCoords: [number, number][] = [];
      for (let i = 0; i < points.length; i++) {
        const coordText = points[i].getElementsByTagName('coordinates')[0]?.textContent || '';
        const coords = parseCoordinates(coordText);
        pointCoords.push(...coords);
      }
      if (pointCoords.length > 0) allCoordinates.push(pointCoords);

      // 4. MultiGeometry
      const multiGeoms = kmlDoc.getElementsByTagName('MultiGeometry');
      for (let i = 0; i < multiGeoms.length; i++) {
        // Check for polygons in MultiGeometry
        const mgPolygons = multiGeoms[i].getElementsByTagName('Polygon');
        for (let j = 0; j < mgPolygons.length; j++) {
          const outerBoundary = mgPolygons[j].getElementsByTagName('outerBoundaryIs')[0];
          if (outerBoundary) {
            const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
            if (linearRing) {
              const coordText = linearRing.getElementsByTagName('coordinates')[0]?.textContent || '';
              const coords = parseCoordinates(coordText);
              if (coords.length > 0) allCoordinates.push(coords);
            }
          }
        }
      }

      // Fallback: try generic coordinates tag if no specific geometry found
      if (allCoordinates.length === 0) {
        const coordElements = kmlDoc.getElementsByTagName('coordinates');
        for (let i = 0; i < coordElements.length; i++) {
          const coordText = coordElements[i].textContent || '';
          const coords = parseCoordinates(coordText);
          if (coords.length > 0) allCoordinates.push(coords);
        }
      }

      // Create layers on map
      if (allCoordinates.length > 0 && mapRef.current) {
        const newLayers: L.Layer[] = [];
        
        allCoordinates.forEach((coordSet, index) => {
          if (coordSet.length === 1) {
            // Single point
            const marker = L.circleMarker(coordSet[0], {
              radius: 8,
              fillColor: '#3b82f6',
              color: 'white',
              weight: 2,
              fillOpacity: 0.9
            }).addTo(mapRef.current!);
            marker.bindPopup(`Point ${index + 1}`);
            newLayers.push(marker);
          } else if (coordSet.length === 2) {
            // Line with 2 points
            const line = L.polyline(coordSet, {
              color: '#3b82f6',
              weight: 3
            }).addTo(mapRef.current!);
            newLayers.push(line);
          } else if (coordSet.length > 2) {
            // Polygon (check if closed)
            const isClosed = coordSet[0][0] === coordSet[coordSet.length - 1][0] && 
                            coordSet[0][1] === coordSet[coordSet.length - 1][1];
            
            if (isClosed) {
              const polygon = L.polygon(coordSet, {
                color: '#3b82f6',
                weight: 3,
                fillOpacity: 0.2,
                fillColor: '#3b82f6'
              }).addTo(mapRef.current!);
              polygon.bindPopup(`Polygon ${index + 1}<br>${coordSet.length} titik`);
              newLayers.push(polygon);
            } else {
              // Open line
              const line = L.polyline(coordSet, {
                color: '#3b82f6',
                weight: 3
              }).addTo(mapRef.current!);
              newLayers.push(line);
            }
          }
        });

        setKmzLayers(prev => [...prev, ...newLayers]);
        
        // Fit bounds to show all uploaded layers
        const group = L.featureGroup(newLayers);
        mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
        
        alert(`Berhasil! ${allCoordinates.length} geometry ditemukan dan ditampilkan.`);
      } else {
        alert('Tidak ada koordinat valid ditemukan dalam file.\n\nPastikan file KML/KMZ berisi:\n- Polygon (area)\n- LineString (garis)\n- Point (titik)\n- Atau MultiGeometry');
      }
    } catch (error) {
      console.error('Error parsing KMZ/KML:', error);
      alert('Gagal memparse file. Error: ' + (error as Error).message);
    }
  };

  // Clear all KMZ layers
  const clearKmzLayers = () => {
    kmzLayers.forEach(layer => {
      if (mapRef.current) mapRef.current.removeLayer(layer);
    });
    setKmzLayers([]);
  };

  useEffect(() => {
    if (viewMode !== 'unset' && !mapRef.current) {
      const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-2.979129, 115.199507], 15);
      tileLayerRef.current = L.tileLayer(mapLayers.satellite, { maxZoom: 20 }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      pulseRef.current = L.layerGroup().addTo(map);
      boundaryRef.current = L.geoJSON(MONTANA_BOUNDARY as any, {
        style: (f) => ({ color: f?.properties?.Status === 'REALISASI' ? '#10b981' : '#f43f5e', weight: 3, fillOpacity: 0.1 })
      }).addTo(map);
      mapRef.current = map;
      initializeData();
    }
  }, [viewMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingMode) return;
      const newPoints = [...selectionPoints, e.latlng];
      setSelectionPoints(newPoints);
      const node = L.circleMarker(e.latlng, { radius: 5, fillColor: '#3b82f6', color: 'white', weight: 2, fillOpacity: 1 }).addTo(map);
      selectionMarkersRef.current.push(node);
      if (selectionPolyRef.current) {
        selectionPolyRef.current.setLatLngs(newPoints);
      } else {
        selectionPolyRef.current = L.polygon(newPoints, { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 4, dashArray: '8, 12' }).addTo(map);
      }
    };
    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [isDrawingMode, selectionPoints]);

  const handleStartDrawing = () => {
    setIsDrawingMode(true);
    setSelectionPoints([]);
    setSelectedTrees(null);
    setActiveTreeDetail(null);
    clearSelectionLayers();
  };

  const clearSelectionLayers = () => {
    if (selectionPolyRef.current) { selectionPolyRef.current.remove(); selectionPolyRef.current = null; }
    selectionMarkersRef.current.forEach(m => m.remove());
    selectionMarkersRef.current = [];
  };

  const handleFinishDrawing = () => {
    if (selectionPoints.length < 3) { alert("Pilih minimal 3 titik!"); return; }
    setIsDrawingMode(false);
    const polygonCoords: [number, number][] = selectionPoints.map(p => [p.lat, p.lng]);
    const results = data.filter(tree => {
      const lat = parseCoord(tree.X);
      const lon = parseCoord(tree.Y);
      return isPointInPolygon([lat, lon], polygonCoords);
    });
    setSelectedTrees(results);
    clearSelectionLayers();
  };

  const handleCancelDrawing = () => {
    setIsDrawingMode(false);
    setSelectionPoints([]);
    setSelectedTrees(null);
    clearSelectionLayers();
  };

  const handleFocusTree = (t: TreeData) => {
    const lat = parseCoord(t.X);
    const lon = parseCoord(t.Y);
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 19, { animate: true, duration: 1.5 });
      markersRef.current?.eachLayer((layer: any) => {
        if (layer.getLatLng && layer.getLatLng().lat === lat && layer.getLatLng().lng === lon) {
          layer.openPopup();
        }
      });
    }
    setActiveTreeDetail(t);
  };

  if (viewMode === 'unset') return <ViewSelector onSelect={handleSelectMode} />;

  return (
    <div className={`relative h-screen w-screen bg-slate-950 font-sans overflow-hidden flex flex-col ${viewMode === 'mobile' ? 'mobile-view' : ''}`}>
      <div id="map" className="absolute inset-0 z-0 saturate-[1.2] brightness-[0.85]" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="mb-8">
            <img src="https://i.ibb.co.com/29Gzw6k/montana-AI.jpg" alt="Montana AI" className="w-20 h-20 rounded-3xl shadow-2xl shadow-blue-500/20 border-2 border-white/10" />
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-10 px-6 max-w-md">
            <h1 className="text-white text-lg font-black uppercase tracking-[0.15em] leading-tight">Selamat Datang</h1>
            <p className="text-blue-400 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Ekosistem Montana</p>
            <p className="text-slate-500 text-[9px] font-bold mt-3 leading-relaxed uppercase tracking-wider">
              Pemantauan Reklamasi Berkelanjutan<br />PT Energi Batubara Lestari
            </p>
          </div>

          {/* Circular Progress */}
          <div className="relative w-28 h-28 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - loadProgress / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-white text-xl font-black tabular-nums">{Math.floor(loadProgress)}</span>
              <span className="text-[9px] text-blue-400 font-black -mt-0.5">PERSEN</span>
            </div>
          </div>

          {/* Status Text */}
          <div className="text-center">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Memuat Data Live Peta</p>
            <p className="text-slate-600 text-[9px] font-bold mt-2 uppercase tracking-widest" style={{ minHeight: '1.2em' }}>{loadStatus}</p>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 h-1 bg-blue-500 z-[9999] transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(59,130,246,1)]" style={{ width: `${syncProgress}%` }} />

       {/* HEADER PC */}
      {viewMode === 'pc' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-[95%] max-w-7xl">
          <div className="glass px-6 py-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl border-white/50 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1.5 rounded-2xl shadow-xl">
                <img src="https://i.ibb.co.com/29Gzw6k/montana-AI.jpg" alt="Montana AI Logo" className="w-10 h-10 rounded-xl object-cover" />
              </div>
              <h1 className="font-black text-slate-900 text-lg uppercase italic tracking-tight">LIVE PETA SUB <span className="text-blue-600">MONTANA AI PRO</span></h1>
            </div>
            <div className="flex gap-2 items-center">
              {/* Map Layer Switcher */}
              <div className="flex bg-white/80 rounded-2xl p-1 shadow-lg border border-white/20">
                <button 
                  onClick={() => switchMapLayer('satellite')}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentMapLayer === 'satellite' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
                  title="Satelit"
                >
                  🛰️
                </button>
                <button 
                  onClick={() => switchMapLayer('openstreet')}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentMapLayer === 'openstreet' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
                  title="OpenStreetMap"
                >
                  🗺️
                </button>
                <button 
                  onClick={() => switchMapLayer('white')}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentMapLayer === 'white' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
                  title="Polos"
                >
                  ⬜
                </button>
              </div>

              <button onClick={handleStartDrawing} className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-xl tracking-wider transition-all border border-white/20 ${isDrawingMode ? 'bg-blue-500 text-white' : 'bg-slate-900 text-white hover:scale-105'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Seleksi Area
              </button>
              
              {/* KMZ Upload Button */}
              <button 
                onClick={() => setShowKmzUpload(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-purple-500 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                KMZ
              </button>
              
              <button onClick={() => setIsHeightAnalysisOpen(true)} className="bg-blue-600 text-white px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-500 transition-all">Tinggi</button>
              <a href="https://www.montana-tech.info/" className="bg-slate-700 text-white px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-600 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Menu Utama
              </a>
              <button onClick={() => setIsGalleryOpen(true)} className="bg-slate-800 text-white px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-700 transition-all">Galeri</button>
              <button onClick={() => setViewMode('unset')} className="bg-white/50 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase border border-slate-200 shadow-xl hover:bg-white transition-all">Mode</button>
            </div>
          </div>
        </div>
      )}

       {/* HEADER HP */}
      {viewMode === 'mobile' && (
        <div className="fixed top-4 left-4 right-4 z-[1000]">
          <div className="glass px-5 py-3 rounded-3xl flex items-center justify-between shadow-2xl border-white/50">
             <div className="flex items-center gap-3">
               <div className="bg-white p-1 rounded-xl">
                 <img src="https://i.ibb.co.com/29Gzw6k/montana-AI.jpg" alt="Montana AI Logo" className="w-8 h-8 rounded-lg object-cover" />
               </div>
               <h1 className="font-black text-slate-900 text-xs uppercase italic tracking-tight">LIVE PETA SUB <span className="text-blue-600">MONTANA AI PRO</span></h1>
             </div>
             <div className="flex gap-2">
               <button onClick={handleStartDrawing} className={`p-3 rounded-xl shadow-lg border border-white/10 ${isDrawingMode ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>
               <button onClick={() => setViewMode('unset')} className="p-3 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
               </button>
             </div>
          </div>
        </div>
      )}

      {isDrawingMode && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500 w-[95%] max-w-lg">
          <div className="glass px-6 py-5 rounded-[2.5rem] border-2 border-blue-500 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block">Seleksi Area Aktif</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleFinishDrawing} className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase">Analisis</button>
              <button onClick={handleCancelDrawing} className="flex-1 sm:flex-none bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase">Batal</button>
            </div>
          </div>
        </div>
      )}

      {selectedTrees && <SelectionStats data={selectedTrees} onClose={() => setSelectedTrees(null)} onBulkDelete={handleBulkDelete} onFocusTree={(tree) => {
        const lat = parseFloat(String(tree.Y));
        const lng = parseFloat(String(tree.X));
        if (!isNaN(lat) && !isNaN(lng) && mapRef.current) {
          mapRef.current.flyTo([lat, lng], 20, { duration: 0.5 });
        }
      }} />}

      {activeTreeDetail && !selectedTrees && !isDrawingMode && (
        <LastPointNotification 
          tree={activeTreeDetail} 
          onClose={() => setActiveTreeDetail(null)} 
          onFocus={handleFocusTree} 
          onDeleteRequest={handleOpenDeletePanel}
        />
      )}

      {!isDrawingMode && (
        <Sidebar 
          data={data}
          selectedTrees={selectedTrees}
          activeSpeciesFilter={activeSpeciesFilter}
          onToggleSpeciesFilter={(s) => {
            const newFilter = activeSpeciesFilter === s ? null : s;
            setActiveSpeciesFilter(newFilter);
            const filtered = newFilter 
              ? data.filter(t => t.Tanaman === newFilter)
              : data;
            renderMarkers(filtered);
          }}
          onSearch={(q) => {
            const f = data.filter(d => String(d["No Pohon"]).toLowerCase().includes(q.toLowerCase()) || d.Tanaman.toLowerCase().includes(q.toLowerCase()));
            setFilteredData(f);
            renderMarkers(f);
          }} 
          onToggleBoundary={() => setShowBoundary(!showBoundary)}
          showBoundary={showBoundary}
        />
      )}

      <LiveFeed 
        data={data} 
        isVisible={isLiveFeedVisible && !isDrawingMode && !selectedTrees}
        onClose={() => setIsLiveFeedVisible(false)}
        onSelectItem={handleFocusTree} 
      />

      {viewMode === 'mobile' && (
        <div className="fixed bottom-6 left-6 right-6 z-[3000]">
          <div className="glass px-2 py-2 rounded-[2.5rem] flex items-center justify-around shadow-2xl border-white/50 bg-white/90">
            <a href="https://www.montana-tech.info/" className="flex flex-col items-center gap-1 p-3 text-slate-700 active:scale-90 transition-all">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
               <span className="text-[7px] font-black uppercase">Menu</span>
            </a>
            <button onClick={() => setIsHeightAnalysisOpen(true)} className="flex flex-col items-center gap-1 p-3 text-blue-600 active:scale-90 transition-all">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
               <span className="text-[7px] font-black uppercase">Tinggi</span>
            </button>
            <button onClick={() => setIsGalleryOpen(true)} className="flex flex-col items-center gap-1 p-3 text-slate-900 active:scale-90 transition-all">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               <span className="text-[7px] font-black uppercase">Galeri</span>
            </button>
          </div>
        </div>
      )}

      {/* KMZ Upload Modal */}
      {showKmzUpload && (
        <div className="fixed inset-0 z-[7000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Upload File KMZ/KML</h3>
                  <p className="text-[10px] text-slate-500 font-bold">Unggah file KMZ atau KML untuk ditampilkan di peta</p>
                </div>
              </div>
              <button 
                onClick={() => setShowKmzUpload(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-purple-500 transition-all">
                <input
                  type="file"
                  accept=".kml,.kmz"
                  onChange={handleKmzUpload}
                  className="hidden"
                  id="kmz-upload"
                />
                <label htmlFor="kmz-upload" className="cursor-pointer block">
                  <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-bold text-slate-700">Klik untuk memilih file</p>
                  <p className="text-[10px] text-slate-500 mt-1">Format: .kml atau .kmz</p>
                </label>
              </div>
              
              {kmzLayers.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700">{kmzLayers.length} layer KMZ aktif</p>
                    <button 
                      onClick={clearKmzLayers}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowKmzUpload(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase hover:bg-slate-200 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <Gallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} data={data} onSelectTree={(t) => { handleFocusTree(t); setIsGalleryOpen(false); }} onBulkDelete={handleBulkDelete} />
      <AnalyticsDashboard isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} data={data} />
      <HeightAnalysis isOpen={isHeightAnalysisOpen} onClose={() => setIsHeightAnalysisOpen(false)} data={data} />
      <EditPanel 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        onDelete={handleDelete} 
        initialPohonId={pohonIdToEdit} 
      />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
