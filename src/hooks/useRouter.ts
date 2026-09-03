import { useState, useEffect, useCallback } from 'react';
import type { RoutePath } from '@/src/types';

const NAVIGATE_EVENT = 'meliere:navigate';

export function useRouter() {
  const [currentPath, setCurrentPath] = useState<RoutePath>(() => {
    if (typeof window === 'undefined') return '/dashboard';
    const path = window.location.pathname as RoutePath;
    if (!path || path === '/') return '/dashboard';
    return path;
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname as RoutePath;
      setCurrentPath(!path || path === '/' ? '/dashboard' : path);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener(NAVIGATE_EVENT, handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener(NAVIGATE_EVENT, handleLocationChange);
    };
  }, []);

  const navigate = useCallback((path: RoutePath) => {
    const targetPath = path === '/' ? '/dashboard' : path;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPath(targetPath);
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    currentPath,
    navigate,
  };
}
