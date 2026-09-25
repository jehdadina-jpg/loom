import { useMemo } from 'react';

export type DeviceTier = 'high' | 'low';

export function useDeviceTier(): DeviceTier {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return 'high';
    
    // Very simple heuristic: low cores or explicitly mobile user-agent often implies lower graphics budget
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (hardwareConcurrency <= 4 || isMobile) {
      return 'low';
    }
    
    return 'high';
  }, []);
}
