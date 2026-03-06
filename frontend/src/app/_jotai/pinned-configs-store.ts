"use client";

import { atom } from "jotai";

export interface PinnedConfig {
  id: string;
  params: Record<string, string>;
}

/**
 * Pinned Recent Traffic configuration objects.
 * Persisted in localStorage.
 */
const STORAGE_KEY = "pinned-recent-configs-v2";

const getInitialPinnedConfigs = (): PinnedConfig[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    // Try migrating from old string-only format
    const oldSaved = localStorage.getItem("pinned-recent-configs");
    if (oldSaved) {
      try {
        const oldIds = JSON.parse(oldSaved) as string[];
        return oldIds.map((id) => ({ id, params: { config_id: id } }));
      } catch {
        return [];
      }
    }
    return [];
  }
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

export const pinnedConfigsAtom = atom<PinnedConfig[]>(
  getInitialPinnedConfigs(),
);

export const pinnedConfigsPersistenceAtom = atom(
  (get) => get(pinnedConfigsAtom),
  (get, set, nextValue: PinnedConfig[]) => {
    set(pinnedConfigsAtom, nextValue);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
    }
  },
);
