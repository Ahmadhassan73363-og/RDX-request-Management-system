import { useEffect, useState } from 'react';

/**
 * Like useState(() => getter()), but also re-reads the getter whenever the
 * background DB sync (dataService.syncFromDatabase -> storage.ts) finishes.
 * Without this, a component that snapshots dataService data once at mount
 * keeps showing whatever was in storage before the async bootstrap fetch
 * resolved (e.g. the built-in mock data on a fresh/incognito visit) forever.
 */
export function useSyncedState<T>(getter: () => T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(getter);

  useEffect(() => {
    const handler = () => setState(getter());
    window.addEventListener('storage-synced', handler);
    return () => window.removeEventListener('storage-synced', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, setState];
}
