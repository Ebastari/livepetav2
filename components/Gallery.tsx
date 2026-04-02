import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TreeData, getSpeciesColor, getImageUrl } from '../types';

interface GalleryProps {
  isOpen: boolean;
  onClose: () => void;
  data: TreeData[];
  onSelectTree: (tree: TreeData) => void;
  onBulkDelete?: (ids: string[]) => void;
  treeImageUrlExtractor?: (item: TreeData) => string;
}

// Helper untuk mengekstrak HANYA tanggal (YYYY-MM-DD)
const getDateOnly = (dateStr: any) => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  
  if (str.length >= 10) {
    return str.substring(0, 10);
  }
  return str;
};

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[type]);
  }
};

// Lazy loading image component
const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onClick?: () => void;
}> = ({ src, alt, className, style, onError, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="relative w-full h-full" onClick={onClick}>
      {!isLoaded && (
        <div className="absolute inset-0 skeleton bg-slate-200 animate-pulse" />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'lazy-loaded' : 'opacity-0'}`}
          style={style}
          onLoad={() => setIsLoaded(true)}
          onError={onError}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};

// Confirmation Modal Component
const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Hapus', cancelText = 'Batal' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase">{title}</h3>
        <p className="text-sm text-slate-600 text-center mb-6 font-medium">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              onCancel();
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-3 rounded-xl font-bold uppercase text-sm transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              triggerHaptic('heavy');
              onConfirm();
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold uppercase text-sm transition-all active:scale-95 shadow-lg"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Toast Component
const ErrorToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[8000] max-w-md w-[90%] animate-in slide-in-from-top-5 duration-300">
      <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
        <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-bold flex-1">{message}</p>
        <button onClick={onClose} className="p-1 hover:bg-red-700 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const Gallery: React.FC<GalleryProps> = ({ 
  isOpen, 
  onClose, 
  data, 
  onSelectTree, 
  onBulkDelete 
}) => {
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk'>('single');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);

  // Extract unique options
  const uniqueSpecies = useMemo(() => [...new Set(data.map(d => d.Tanaman).filter(Boolean))].sort(), [data]);
  const uniqueSupervisors = useMemo(() => [...new Set(data.map(d => d.Pengawas).filter(Boolean))].sort(), [data]);
  
  const uniqueDates = useMemo(() => {
    const dates = data.map(d => getDateOnly(d.Tanggal)).filter(Boolean);
    return [...new Set(dates)].sort();
  }, [data]);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSpecies = speciesFilter ? item.Tanaman === speciesFilter : true;
      const matchSupervisor = supervisorFilter ? item.Pengawas === supervisorFilter : true;
      const matchDate = dateFilter ? getDateOnly(item.Tanggal) === dateFilter : true;
      
      return matchSpecies && matchSupervisor && matchDate;
    });
  }, [data, speciesFilter, supervisorFilter, dateFilter]);

  // Pull to refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (galleryRef.current && galleryRef.current.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current > 0 && galleryRef.current && galleryRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      pullDistance.current = currentY - pullStartY.current;
      
      if (pullDistance.current > 0 && pullDistance.current < 100) {
        e.preventDefault();
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 80) {
      setIsPullRefreshing(true);
      triggerHaptic('medium');
      
      // Simulate refresh
      setTimeout(() => {
        setIsPullRefreshing(false);
        window.location.reload();
      }, 1500);
    }
    pullStartY.current = 0;
    pullDistance.current = 0;
  }, []);

  // Swipe gesture for image navigation
  const handleImageTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleImageTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = Math.abs(touchEnd.y - touchStart.y);

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > 50 && deltaY < 30) {
      triggerHaptic('light');
      if (deltaX > 0 && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      } else if (deltaX < 0 && currentImageIndex < filteredData.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      }
    }
  };

  // Pinch to zoom
  useEffect(() => {
    if (!imageRef.current || !selectedTree) return;

    let initialDistance = 0;
    let initialScale = 1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        initialScale = imageScale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = (currentDistance / initialDistance) * initialScale;
        const clampedScale = Math.min(Math.max(scale, 1), 4);
        setImageScale(clampedScale);
        setIsZoomed(clampedScale > 1);
      }
    };

    const handleTouchEnd = () => {
      if (imageScale < 1.1) {
        setImageScale(1);
        setIsZoomed(false);
      }
    };

    const imgElement = imageRef.current;
    imgElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    imgElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    imgElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      imgElement.removeEventListener('touchstart', handleTouchStart);
      imgElement.removeEventListener('touchmove', handleTouchMove);
      imgElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [imageScale, selectedTree]);

  // Handle item selection for bulk delete
  const toggleItemSelection = (id: string) => {
    triggerHaptic('light');
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedItems.length > 0) {
      setDeleteTarget('bulk');
      setShowDeleteModal(true);
    }
  };

  const confirmBulkDelete = () => {
    if (onBulkDelete) {
      try {
        onBulkDelete(selectedItems);
        setSelectedItems([]);
        setShowDeleteModal(false);
        triggerHaptic('medium');
      } catch (error) {
        setErrorMessage('Gagal menghapus item. Silakan coba lagi.');
        setShowDeleteModal(false);
      }
    }
  };

  // Handle full-screen photo review
  const handlePhotoClick = (tree: TreeData, index: number) => {
    triggerHaptic('light');
    setSelectedTree(tree);
    setCurrentImageIndex(index);
    setImageScale(1);
    setIsZoomed(false);
  };

  // Close full-screen photo review
  const closePhotoReview = () => {
    triggerHaptic('light');
    setSelectedTree(null);
    setImageScale(1);
    setIsZoomed(false);
  };

  // Handle delete single item
  const handleDeleteSingle = () => {
    setDeleteTarget('single');
    setShowDeleteModal(true);
  };

  const confirmDeleteSingle = () => {
    if (selectedTree && onBulkDelete) {
      try {
        onBulkDelete([String(selectedTree["No Pohon"])]);
        setShowDeleteModal(false);
        closePhotoReview();
        triggerHaptic('medium');
      } catch (error) {
        setErrorMessage('Gagal menghapus item. Silakan coba lagi.');
        setShowDeleteModal(false);
      }
    }
  };

  if (!isOpen) return null;

  // Full-screen photo review
  if (selectedTree) {
    const healthColor = selectedTree.Kesehatan === 'Sehat' ? '#10b981' : selectedTree.Kesehatan === 'Merana' ? '#f59e0b' : '#ef4444';
    
    return (
      <>
        <div className="fixed inset-0 z-[6000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-6 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <button 
                onClick={closePhotoReview}
                className="p-2 md:p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90 flex-shrink-0"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-base md:text-xl font-black text-white uppercase tracking-tight truncate">
                  #{selectedTree["No Pohon"]}
                </h2>
                <p className="text-xs md:text-sm text-slate-400 font-bold uppercase truncate">
                  {selectedTree.Tanaman} • {selectedTree.Pengawas}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={handleDeleteSingle}
                className="hidden md:flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all active:scale-95"
                style={{ minHeight: '44px' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Hapus
              </button>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  onSelectTree(selectedTree);
                  closePhotoReview();
                }}
                className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all active:scale-95"
                style={{ minHeight: '44px' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Lihat di Peta
              </button>
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col lg:flex-row h-full">
              {/* Photo Section */}
              <div 
                className="lg:flex-1 flex items-center justify-center p-4 md:p-8 bg-slate-950"
                onTouchStart={handleImageTouchStart}
                onTouchEnd={handleImageTouchEnd}
              >
                <div className="relative w-full max-w-4xl">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
                    <img 
                      ref={imageRef}
                      src={getImageUrl(selectedTree, 'large')} 
                      className="w-full max-h-[60vh] lg:max-h-[80vh] object-contain transition-transform duration-200"
                      style={{ 
                        transform: `scale(${imageScale})`,
                        touchAction: isZoomed ? 'none' : 'auto'
                      }}
                      alt={selectedTree.Tanaman}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        setErrorMessage('Gagal memuat gambar.');
                      }}
                    />
                    {/* Image overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Zoom indicator */}
                    {isZoomed && (
                      <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {Math.round(imageScale * 100)}%
                      </div>
                    )}
                  </div>
                  
                  {/* Swipe indicator */}
                  <div className="flex justify-center gap-2 mt-4">
                    {filteredData.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentImageIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Mobile action buttons */}
                  <div className="md:hidden mt-4 flex gap-2">
                    <button 
                      onClick={() => {
                        triggerHaptic('light');
                        onSelectTree(selectedTree);
                        closePhotoReview();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all active:scale-95"
                      style={{ minHeight: '48px' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Lihat di Peta
                    </button>
                    <button 
                      onClick={handleDeleteSingle}
                      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all active:scale-95"
                      style={{ minHeight: '48px', minWidth: '48px' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Details Panel */}
              <div className="lg:w-96 bg-slate-900/50 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-white/10 p-4 md:p-6 overflow-y-auto">
                <div className="space-y-4">
                  {/* Species Badge */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span 
                      className="text-xs md:text-sm font-black text-white px-3 md:px-4 py-2 rounded-full"
                      style={{ background: getSpeciesColor(selectedTree.Tanaman) }}
                    >
                      {selectedTree.Tanaman}
                    </span>
                    <span 
                      className="text-xs md:text-sm font-black text-white px-3 md:px-4 py-2 rounded-full"
                      style={{ background: healthColor }}
                    >
                      {selectedTree.Kesehatan}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/10" />

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {/* Tree ID */}
                    <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                        No. Pohon
                      </span>
                      <p className="text-base md:text-lg font-black text-white">#{selectedTree["No Pohon"]}</p>
                    </div>

                    {/* Height */}
                    <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                        Tinggi
                      </span>
                      <p className="text-base md:text-lg font-black text-white">{selectedTree.Tinggi} <span className="text-sm text-slate-400">m</span></p>
                    </div>
                  </div>

                  {/* Supervisor */}
                  <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                      Pengawas
                    </span>
                    <p className="text-sm md:text-base font-bold text-white">{selectedTree.Pengawas}</p>
                  </div>

                  {/* Date */}
                  <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                      Tanggal Tanam
                    </span>
                    <p className="text-sm md:text-base font-bold text-white">{getDateOnly(selectedTree.Tanggal)}</p>
                  </div>

                  {/* Coordinates */}
                  <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                      Koordinat GPS
                    </span>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <p className="text-xs md:text-sm font-bold text-white font-mono break-all">
                        {selectedTree.X}, {selectedTree.Y}
                      </p>
                    </div>
                  </div>

                  {/* Carbon Data (if available) */}
                  {(selectedTree.carbon || selectedTree.co2e || selectedTree.vol) && (
                    <>
                      <div className="h-px bg-white/10" />
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Data Karbon
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTree.carbon && (
                          <div className="bg-emerald-500/10 p-2 md:p-3 rounded-xl border border-emerald-500/20 text-center">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                              Carbon
                            </span>
                            <p className="text-xs md:text-sm font-black text-emerald-300">{selectedTree.carbon.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedTree.co2e && (
                          <div className="bg-blue-500/10 p-2 md:p-3 rounded-xl border border-blue-500/20 text-center">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block mb-1">
                              CO₂e
                            </span>
                            <p className="text-xs md:text-sm font-black text-blue-300">{selectedTree.co2e.toFixed(2)}</p>
                          </div>
                        )}
                        {selectedTree.vol && (
                          <div className="bg-purple-500/10 p-2 md:p-3 rounded-xl border border-purple-500/20 text-center">
                            <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider block mb-1">
                              Volume
                            </span>
                            <p className="text-xs md:text-sm font-black text-purple-300">{selectedTree.vol.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Link to Drive */}
                  {selectedTree["Link Drive"] && !String(selectedTree["Link Drive"]).includes("File tidak ditemukan") && (
                    <div className="pt-2">
                      <a 
                        href={selectedTree["Link Drive"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => triggerHaptic('light')}
                        className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all border border-white/10 active:scale-95"
                        style={{ minHeight: '48px' }}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574h-3.758zm-5.735 1.04l-6.269 10.967 1.883 3.296 1.882 3.297h3.77l-1.893-3.313-1.893-3.313 4.38-7.63 2.19-3.817-1.885-3.297c-1.037-1.813-1.893-3.296-1.903-3.296-.01 0-.112.04-.262.113zm14.056 11.09l-1.88 3.293-1.881 3.293H7.506l-1.893 3.297-1.893 3.296 1.885 3.297 1.885 3.297h7.542l1.893-3.297 1.893-3.297-1.885-3.296-1.885-3.297h3.77l1.88-3.293 1.881-3.293-1.88-3.297-1.88-3.297z"/>
                        </svg>
                        Buka di Google Drive
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal && deleteTarget === 'single'}
          title="Konfirmasi Hapus"
          message={`Apakah Anda yakin ingin menghapus item #${selectedTree["No Pohon"]}? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={confirmDeleteSingle}
          onCancel={() => {
            triggerHaptic('light');
            setShowDeleteModal(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div 
        ref={galleryRef}
        className="fixed inset-0 z-[5000] bg-white flex flex-col p-3 md:p-6 animate-in fade-in zoom-in duration-300 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        {isPullRefreshing && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white px-4 py-2 rounded-b-2xl shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4 pull-refresh-indicator" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs font-bold uppercase">Memuat ulang...</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 max-w-7xl mx-auto w-full gap-4 relative">
          <div className="md:mr-auto">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Visual Archive</h2>
            <p className="text-blue-600 text-[10px] font-black mt-1 tracking-[0.3em] uppercase">
              Displaying {filteredData.length} of {data.length} Records
            </p>
          </div>
          
          {/* Filters Container */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto z-10">
            <select 
              value={speciesFilter}
              onChange={(e) => {
                triggerHaptic('light');
                setSpeciesFilter(e.target.value);
              }}
              className="bg-white border border-slate-200 text-slate-900 text-[10px] font-bold uppercase rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
              style={{ minHeight: '44px' }}
            >
              <option value="">Semua Bibit</option>
              {uniqueSpecies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select 
              value={supervisorFilter}
              onChange={(e) => {
                triggerHaptic('light');
                setSupervisorFilter(e.target.value);
              }}
              className="bg-white border border-slate-200 text-slate-900 text-[10px] font-bold uppercase rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
              style={{ minHeight: '44px' }}
            >
              <option value="">Semua Pengawas</option>
              {uniqueSupervisors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select 
              value={dateFilter}
              onChange={(e) => {
                triggerHaptic('light');
                setDateFilter(e.target.value);
              }}
              className="bg-white border border-slate-200 text-slate-900 text-[10px] font-bold uppercase rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
              style={{ minHeight: '44px' }}
            >
              <option value="">Semua Tanggal</option>
              {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {(speciesFilter || supervisorFilter || dateFilter) && (
              <button 
                onClick={() => { 
                  triggerHaptic('medium');
                  setSpeciesFilter(''); 
                  setSupervisorFilter(''); 
                  setDateFilter(''); 
                }}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border border-red-200 active:scale-95"
                style={{ minHeight: '44px' }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Bulk delete button */}
          {selectedItems.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg hover:bg-red-700 active:scale-95"
              style={{ minHeight: '44px' }}
            >
              Hapus {selectedItems.length} Item
            </button>
          )}

          <button 
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="absolute top-0 right-0 md:static bg-slate-100 hover:bg-slate-200 text-slate-900 p-3 md:p-4 rounded-3xl border border-slate-200 transition-all active:scale-90"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {filteredData.map((tree, idx) => (
              <div 
                key={idx} 
                className="group relative aspect-[3/4] bg-white rounded-2xl md:rounded-[2rem] overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-500/50 transition-all shadow-lg active:scale-95"
                onClick={() => handlePhotoClick(tree, idx)}
              >
                {/* Selection checkbox */}
                <div
                  className="absolute top-2 md:top-3 left-2 md:left-3 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemSelection(String(tree["No Pohon"]));
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(String(tree["No Pohon"]))}
                    onChange={() => {}}
                    className="w-5 h-5 md:w-4 md:h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    style={{ minWidth: '20px', minHeight: '20px' }}
                  />
                </div>

                <LazyImage
                  src={getImageUrl(tree)} 
                  alt={tree.Tanaman}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4 pointer-events-none">
                  <span className="text-[8px] font-black text-white px-2 py-0.5 rounded-full mb-1 inline-block" style={{ background: getSpeciesColor(tree.Tanaman) }}>
                    {tree.Tanaman}
                  </span>
                  <p className="text-white font-black text-xs uppercase truncate">#{tree["No Pohon"]}</p>
                  <div className="flex justify-between items-end mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                     <p className="text-slate-300 text-[8px] font-bold uppercase truncate max-w-[60%]">{tree.Pengawas}</p>
                  <p className="text-slate-400 text-[7px] font-bold uppercase">{getDateOnly(tree.Tanggal)}</p>
                </div>
                </div>
              </div>
            ))}
            
            {filteredData.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-500">
                 <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Tidak ada data yang cocok dengan filter</p>
                 <button 
                   onClick={() => { 
                     triggerHaptic('light');
                     setSpeciesFilter(''); 
                     setSupervisorFilter(''); 
                     setDateFilter(''); 
                   }}
                   className="mt-4 text-[9px] font-bold text-blue-500 uppercase hover:underline"
                   style={{ minHeight: '44px' }}
                 >
                   Hapus Filter
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Delete */}
      <ConfirmModal
        isOpen={showDeleteModal && deleteTarget === 'bulk'}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus ${selectedItems.length} item? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => {
          triggerHaptic('light');
          setShowDeleteModal(false);
        }}
      />

      {/* Error Toast */}
      {errorMessage && (
        <ErrorToast 
          message={errorMessage} 
          onClose={() => setErrorMessage('')} 
        />
      )}
    </>
  );
};
