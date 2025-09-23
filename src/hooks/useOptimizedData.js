import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Simple in-memory cache with TTL
class DataCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, data, ttl = 30000) { // 30 seconds default TTL
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key, maxAge = 30000) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      return null;
    }

    return cached.data;
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }
}

const globalCache = new DataCache();

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function useOptimizedData(
  dataFetchers,
  dependencies = [],
  options = {}
) {
  const {
    cacheKey,
    cacheTTL = 30000,
    enableCache = true,
    debounceMs = 300,
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (force = false) => {
    // Check cache first
    if (enableCache && cacheKey && !force) {
      const cached = globalCache.get(cacheKey, cacheTTL);
      if (cached) {
        setData(cached);
        setLoading(false);
        return cached;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setLoading(true);
      setError(null);

      // Execute all data fetchers in parallel
      const promises = Object.entries(dataFetchers).map(async ([key, fetcher]) => {
        try {
          const result = await fetcher();
          return [key, result];
        } catch (err) {
          if (signal.aborted) throw err;
          console.warn(`Failed to fetch ${key}:`, err);
          return [key, null];
        }
      });

      const results = await Promise.allSettled(promises);
      
      if (signal.aborted) return;

      const newData = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const [key, value] = result.value;
          newData[key] = value;
        }
      });

      if (mountedRef.current) {
        setData(newData);
        
        // Cache the result
        if (enableCache && cacheKey) {
          globalCache.set(cacheKey, newData, cacheTTL);
        }

        onSuccess?.(newData);
      }

      return newData;
    } catch (err) {
      if (signal.aborted) return;
      
      if (mountedRef.current) {
        setError(err);
        onError?.(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [dataFetchers, cacheKey, cacheTTL, enableCache, onError, onSuccess]);

  // Debounced version of fetchData
  const debouncedFetchData = useMemo(
    () => debounce(fetchData, debounceMs),
    [fetchData, debounceMs]
  );

  // Initial load and dependency changes
  useEffect(() => {
    debouncedFetchData();
  }, dependencies);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true; // Ensure it's set to true on mount
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  const clearCache = useCallback(() => {
    if (cacheKey) {
      globalCache.clear();
    }
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
}

// Hook for optimized list data with filtering and sorting
export function useOptimizedList(
  fetcher,
  dependencies = [],
  options = {}
) {
  const {
    filterFn,
    sortFn,
    searchTerm = '',
    ...restOptions
  } = options;

  const dataFetchers = {
    items: fetcher
  };

  const { data, loading, error, refetch, clearCache } = useOptimizedData(
    dataFetchers,
    dependencies,
    restOptions
  );

  const processedItems = useMemo(() => {
    let items = data.items || [];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(term)
        )
      );
    }

    // Apply custom filter
    if (filterFn) {
      items = items.filter(filterFn);
    }

    // Apply sorting
    if (sortFn) {
      items = [...items].sort(sortFn);
    }

    return items;
  }, [data.items, searchTerm, filterFn, sortFn]);

  return {
    items: processedItems,
    loading,
    error,
    refetch,
    clearCache
  };
}

export default useOptimizedData;
