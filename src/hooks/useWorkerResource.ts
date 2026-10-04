import { useEffect, useState } from 'react';
import { ApiError, apiGet } from '../api/client';

export function useWorkerResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiGet<T>(path, controller.signal).then(({ data: value }) => setData(value)).catch((cause: unknown) => setError(cause instanceof ApiError ? cause : new ApiError('Unable to load data.'))).finally(() => setLoading(false));
    return () => controller.abort();
  }, [path]);
  return { data, error, loading };
}
