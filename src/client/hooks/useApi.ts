import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData((await api<{ data: T }>(path)).data); }
    catch (err) { setError(err instanceof Error ? err.message : '通信に失敗しました。'); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load };
}
