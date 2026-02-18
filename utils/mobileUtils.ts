/**
 * Mobile Utilities
 * Touch gestures, haptic feedback, and mobile-specific features
 */

// Haptic Feedback Types
export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback on supported devices
 */
export const triggerHaptic = (type: HapticType = 'light'): void => {
  // Check if Vibration API is supported
  if (!('vibrate' in navigator)) {
    return;
  }

  const patterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30]
  };

  const pattern = patterns[type];
  
  if (Array.isArray(pattern)) {
    navigator.vibrate(pattern);
  } else {
    navigator.vibrate(pattern);
  }
};

/**
 * Detect if device is mobile
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Detect if device is iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * Detect if device is Android
 */
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Get device pixel ratio
 */
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Prevent default touch behavior (like pull-to-refresh)
 */
export const preventDefaultTouch = (e: TouchEvent): void => {
  e.preventDefault();
};

/**
 * Swipe gesture detector
 */
export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

export class SwipeDetector {
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private threshold: number;
  private restraint: number;
  private allowedTime: number;

  constructor(
    threshold: number = 50,
    restraint: number = 100,
    allowedTime: number = 500
  ) {
    this.threshold = threshold;
    this.restraint = restraint;
    this.allowedTime = allowedTime;
  }

  handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
  }

  handleTouchEnd(e: TouchEvent, callback: (swipe: SwipeEvent) => void): void {
    const touch = e.changedTouches[0];
    const distX = touch.clientX - this.startX;
    const distY = touch.clientY - this.startY;
    const elapsedTime = Date.now() - this.startTime;

    if (elapsedTime <= this.allowedTime) {
      const absDistX = Math.abs(distX);
      const absDistY = Math.abs(distY);

      if (absDistX >= this.threshold && absDistY <= this.restraint) {
        const direction = distX < 0 ? 'left' : 'right';
        const velocity = absDistX / elapsedTime;
        callback({
          direction,
          distance: absDistX,
          velocity,
          duration: elapsedTime
        });
      } else if (absDistY >= this.threshold && absDistX <= this.restraint) {
        const direction = distY < 0 ? 'up' : 'down';
        const velocity = absDistY / elapsedTime;
        callback({
          direction,
          distance: absDistY,
          velocity,
          duration: elapsedTime
        });
      }
    }
  }
}

/**
 * Pinch zoom detector
 */
export interface PinchEvent {
  scale: number;
  center: { x: number; y: number };
}

export class PinchDetector {
  private initialDistance: number = 0;
  private initialScale: number = 1;

  handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
    }
  }

  handleTouchMove(e: TouchEvent, currentScale: number, callback: (pinch: PinchEvent) => void): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const scale = (currentDistance / this.initialDistance) * currentScale;
      
      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };

      callback({ scale, center });
    }
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Long press detector
 */
export class LongPressDetector {
  private timer: number | null = null;
  private duration: number;

  constructor(duration: number = 500) {
    this.duration = duration;
  }

  handleTouchStart(callback: () => void): void {
    this.timer = window.setTimeout(() => {
      triggerHaptic('medium');
      callback();
    }, this.duration);
  }

  handleTouchEnd(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Pull to refresh detector
 */
export class PullToRefreshDetector {
  private startY: number = 0;
  private currentY: number = 0;
  private threshold: number;
  private maxDistance: number;

  constructor(threshold: number = 80, maxDistance: number = 150) {
    this.threshold = threshold;
    this.maxDistance = maxDistance;
  }

  handleTouchStart(e: TouchEvent, scrollTop: number): void {
    if (scrollTop === 0) {
      this.startY = e.touches[0].clientY;
    }
  }

  handleTouchMove(e: TouchEvent, scrollTop: number): number {
    if (scrollTop === 0 && this.startY > 0) {
      this.currentY = e.touches[0].clientY;
      const distance = Math.min(this.currentY - this.startY, this.maxDistance);
      
      if (distance > 0) {
        return distance;
      }
    }
    return 0;
  }

  handleTouchEnd(distance: number, callback: () => void): void {
    if (distance >= this.threshold) {
      triggerHaptic('medium');
      callback();
    }
    this.startY = 0;
    this.currentY = 0;
  }
}

/**
 * Eliminate 300ms click delay
 */
export const eliminateClickDelay = (): void => {
  // Modern browsers don't have this delay with proper viewport meta tag
  // But we can add touch-action: manipulation to ensure it
  document.body.style.touchAction = 'manipulation';
};

/**
 * Lock screen orientation
 */
export const lockOrientation = async (orientation: 'portrait' | 'landscape' | 'portrait-primary' | 'landscape-primary'): Promise<void> => {
  if ('orientation' in screen && 'lock' in (screen as any).orientation) {
    try {
      await (screen as any).orientation.lock(orientation);
    } catch (error) {
      console.warn('Screen orientation lock not supported or failed:', error);
    }
  }
};

/**
 * Unlock screen orientation
 */
export const unlockOrientation = (): void => {
  if ('orientation' in screen && 'unlock' in screen.orientation) {
    screen.orientation.unlock();
  }
};

/**
 * Get safe area insets (for notched devices)
 */
export const getSafeAreaInsets = (): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} => {
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10)
  };
};

/**
 * Request fullscreen
 */
export const requestFullscreen = async (element: HTMLElement = document.documentElement): Promise<void> => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      await (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen();
    }
  } catch (error) {
    console.warn('Fullscreen request failed:', error);
  }
};

/**
 * Exit fullscreen
 */
export const exitFullscreen = async (): Promise<void> => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }
  } catch (error) {
    console.warn('Exit fullscreen failed:', error);
  }
};

/**
 * Check if in fullscreen mode
 */
export const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
};

/**
 * Get viewport dimensions
 */
export const getViewportDimensions = (): { width: number; height: number } => {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
  };
};

/**
 * Check if device is in landscape mode
 */
export const isLandscape = (): boolean => {
  return window.innerWidth > window.innerHeight;
};

/**
 * Check if device is in portrait mode
 */
export const isPortrait = (): boolean => {
  return window.innerHeight > window.innerWidth;
};

/**
 * Add to home screen prompt (PWA)
 */
export const promptAddToHomeScreen = async (): Promise<boolean> => {
  const deferredPrompt = (window as any).deferredPrompt;
  
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  (window as any).deferredPrompt = null;
  
  return outcome === 'accepted';
};

/**
 * Share content using Web Share API
 */
export const shareContent = async (data: ShareData): Promise<boolean> => {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
};

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      triggerHaptic('success');
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        triggerHaptic('success');
      }
      
      return success;
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
};

/**
 * Prevent zoom on double tap
 */
export const preventDoubleTapZoom = (element: HTMLElement): void => {
  let lastTap = 0;
  
  element.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      e.preventDefault();
    }
    
    lastTap = currentTime;
  });
};

/**
 * Get network information
 */
export const getNetworkInfo = (): {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) {
    return {};
  }

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
};

/**
 * Check if on slow network
 */
export const isSlowNetwork = (): boolean => {
  const networkInfo = getNetworkInfo();
  return networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g' || networkInfo.saveData === true;
};
