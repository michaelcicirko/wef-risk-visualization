import { useState, useEffect } from 'react';

let cache = null;

export function useVdemData() {
  const [state, setState] = useState({ data: cache, loading: !cache, error: null });

  useEffect(() => {
    if (cache) return;
    fetch('/vdem-data.json')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load vdem-data.json: ${r.status}`);
        return r.json();
      })
      .then(data => {
        cache = data;
        setState({ data, loading: false, error: null });
      })
      .catch(err => {
        setState({ data: null, loading: false, error: err.message });
      });
  }, []);

  return state;
}
