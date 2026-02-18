/**
 * Image Optimization Utilities
 * Provides WebP support, compression, and responsive image loading
 */

// Check if browser supports WebP
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// Convert image URL to WebP if supported
export const getOptimizedImageUrl = async (url: string, size: 'thumbnail' | 'medium' | 'large' = 'medium'): Promise<string> => {
  const isWebPSupported = await supportsWebP();
  
  // Size configurations
  const sizes = {
    thumbnail: 400,
    medium: 800,
    large: 1200
  };

  const targetSize = sizes[size];

  // If it's a Google Drive URL, optimize it
  if (url.includes('drive.google.com')) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) {
      // Use Google Drive's built-in image resizing
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${targetSize}`;
    }
  }

  // If it's an external URL with query params support
  if (url.includes('unsplash.com') || url.includes('images.')) {
    const separator = url.includes('?') ? '&' : '?';
    let optimizedUrl = `${url}${separator}w=${targetSize}&q=80`;
    
    if (isWebPSupported) {
      optimizedUrl += '&fm=webp';
    }
    
    return optimizedUrl;
  }

  return url;
};

// Extract Google Drive file ID from various URL formats
export const extractGoogleDriveFileId = (url: string): string | null => {
  if (!url) return null;

  // Handle direct file ID
  if (!url.includes('http') && !url.includes('/')) {
    return url;
  }

  // Handle various Google Drive URL formats
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{25,})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Compress image using canvas (client-side)
export const compressImage = (
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Preload images for better performance
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
};

// Batch preload multiple images
export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => preloadImage(url).catch(() => {})); // Ignore individual failures
  await Promise.all(promises);
};

// Get responsive image srcset
export const getResponsiveSrcSet = (baseUrl: string): string => {
  const sizes = [400, 800, 1200, 1600];
  
  return sizes
    .map(size => {
      const url = baseUrl.includes('?') 
        ? `${baseUrl}&w=${size}` 
        : `${baseUrl}?w=${size}`;
      return `${url} ${size}w`;
    })
    .join(', ');
};

// Calculate optimal image dimensions for container
export const calculateOptimalDimensions = (
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  objectFit: 'contain' | 'cover' = 'cover'
): { width: number; height: number } => {
  const containerRatio = containerWidth / containerHeight;
  const imageRatio = imageWidth / imageHeight;

  if (objectFit === 'cover') {
    if (imageRatio > containerRatio) {
      return {
        width: containerHeight * imageRatio,
        height: containerHeight
      };
    } else {
      return {
        width: containerWidth,
        height: containerWidth / imageRatio
      };
    }
  } else {
    // contain
    if (imageRatio > containerRatio) {
      return {
        width: containerWidth,
        height: containerWidth / imageRatio
      };
    } else {
      return {
        width: containerHeight * imageRatio,
        height: containerHeight
      };
    }
  }
};

// Lazy load observer configuration
export const createLazyLoadObserver = (
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver => {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  };

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, defaultOptions);
};

// Generate blur placeholder data URL
export const generateBlurPlaceholder = (width: number = 10, height: number = 10): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Create a simple gradient as placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#e2e8f0');
  gradient.addColorStop(1, '#cbd5e1');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.1);
};

// Check if image is loaded
export const isImageLoaded = (img: HTMLImageElement): boolean => {
  return img.complete && img.naturalHeight !== 0;
};

// Get image dimensions without loading the full image
export const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

// Convert blob to data URL
export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
};

// Download image with progress tracking
export const downloadImageWithProgress = (
  url: string,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Failed to download image: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send();
  });
};
