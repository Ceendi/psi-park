import { useCallback, useEffect, useState } from 'react';

/**
 * Local "saved gardens" (the heart on a card). MVP keeps favourites in
 * `localStorage` only — no backend (PLAN F2: "lokalne ulubione w MVP").
 */
const KEY = 'psipark:favorites';

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<number[]>(read);

  // Keep multiple mounted lists in sync within the tab + across tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setIds(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((id: number) => {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  return { ids, has, toggle };
}
