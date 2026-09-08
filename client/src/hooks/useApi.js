// The loading / data / error triad that every screen reading from the API needs.
//
//   const { data, error, loading, reload } = useApi(() => api.routines(), []);
//
// - `fetcher` is a function that returns a promise.
// - `deps` works like useEffect deps: the fetch re-runs when they change.
// - `reload()` forces a re-fetch (call it after a mutation to refresh a list).

import { useCallback, useEffect, useState } from 'react';

export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        // A component that unmounts mid-request shouldn't set state.
        if (!cancelled) setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // fetcher is intentionally not a dep — callers pass an inline arrow each
    // render; `deps` + `nonce` are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload };
}

// A paginated list: loads page 0 on mount / when `deps` change, then
// `loadMore()` appends the next page. `fetchPage(offset)` returns a promise of
// an array; a page shorter than `pageSize` means there is no more.
//
//   const { items, loading, hasMore, loadMore, reload } =
//     usePaginatedApi((offset) => api.workouts({ limit: 20, offset }), 20);
export function usePaginatedApi(fetchPage, pageSize, deps = []) {
  const [items, setItems] = useState(/** @type {any[] | null} */ (null));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage(0)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setHasMore(rows.length === pageSize);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const rows = await fetchPage(items?.length ?? 0);
      setItems((cur) => [...(cur ?? []), ...rows]);
      setHasMore(rows.length === pageSize);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pageSize]);

  return { items, error, loading, loadingMore, hasMore, loadMore, reload };
}
