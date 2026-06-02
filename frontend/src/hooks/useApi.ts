import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Minimal data-fetching hook with loading state + manual refetch.
export function useFetch<T>(url: string | null, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params ?? {});

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await api.get(url, { params });
      setData(res.data);
    } catch {
      /* interceptor toasts */
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch, setData };
}
