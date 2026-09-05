// The loading / data / error triad that every screen reading from the API needs.
//
//   const { data, error, loading, reload } = useApi(() => api.routines(), []);
//
// - `fetcher` is a function that returns a promise.
// - `deps` works like useEffect deps: the fetch re-runs when they change.
// - `reload()` forces a re-fetch (call it after a mutation to refresh a list).

import { useCallback, useEffect, useState } from 'react';

export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
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
