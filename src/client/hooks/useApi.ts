import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true); setError(null);
    try {
      const next = (await api<{ data: T }>(path)).data;
      if (currentRequest === requestId.current) setData(next);
    } catch (err) {
      if (currentRequest === requestId.current) setError(err instanceof Error ? err.message : '通信に失敗しました。');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]);
  return { data, error, loading, reload: load };
}
