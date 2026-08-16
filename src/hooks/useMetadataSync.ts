import { useState, useEffect, useCallback } from 'react';
import type { ScrapedMetadata } from '../types/scraper';

const METADATA_CACHE_KEY = 'video_renamer_meta_cache';

export type MetadataCache = Record<string, ScrapedMetadata | Record<string, unknown>>;

export function useMetadataSync() {
  const [metadataCache, setMetadataCache] = useState<MetadataCache>(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return {};
      }
      const saved = localStorage.getItem(METADATA_CACHE_KEY);
      return saved ? (JSON.parse(saved) as MetadataCache) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(metadataCache));
      }
    } catch {
      // ignore storage limits or quota errors
    }
  }, [metadataCache]);

  const updateMetadataCache = useCallback((id: string, metadata: ScrapedMetadata | Record<string, unknown>) => {
    setMetadataCache(prev => {
      const next = { ...prev, [id]: metadata };
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore storage limits
      }
      return next;
    });
  }, []);

  const invalidateMetadataCache = useCallback((id: string) => {
    setMetadataCache(prev => {
      const next = { ...prev };
      delete next[id];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearMetadataCache = useCallback(() => {
    setMetadataCache({});
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(METADATA_CACHE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    metadataCache,
    setMetadataCache,
    updateMetadataCache,
    invalidateMetadataCache,
    clearMetadataCache,
  };
}
