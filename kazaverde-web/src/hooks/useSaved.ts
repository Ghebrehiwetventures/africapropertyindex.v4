import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "kv_saved";
const STORAGE_EVENT = "kv_saved:updated";

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function write(next: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useSaved() {
  const [saved, setSaved] = useState<string[]>(read);

  // Sync saved state both across tabs and across components in the same tab.
  useEffect(() => {
    const sync = () => setSaved(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(STORAGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STORAGE_EVENT, sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  const clear = useCallback(() => {
    write([]);
    setSaved([]);
  }, []);

  return { saved, toggle, isSaved, clear, count: saved.length };
}
