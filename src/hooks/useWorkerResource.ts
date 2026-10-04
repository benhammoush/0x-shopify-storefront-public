import { useEffect, useState } from 'react';
import { ApiError, apiGet } from '../api/client';

export function useWorkerResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(undefined);
    apiGet<T>(path, controller.signal).then(({ data: value }) => { if (active) setData(value); }).catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause : new ApiError('Unable to load data.')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [path]);
  return { data, error, loading };
}
