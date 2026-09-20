"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResult, DataMode } from "./api";

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  mode: DataMode | null;
  refetch: () => void;
}

/**
 * Client-side data hook. Runs the (fallback-aware) API function, exposes
 * loading / error / data plus the `mode` flag so screens can badge live vs demo
 * and show skeletons / empty / error states as required by the dashboard spec.
 */
export function useResource<T>(
  fetcher: () => Promise<ApiResult<T>>,
  deps: unknown[] = [],
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<DataMode | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setMode(res.mode);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unexpected error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, mode, refetch };
}
