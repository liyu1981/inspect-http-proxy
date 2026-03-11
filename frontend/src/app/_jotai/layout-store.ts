"use client";

import { atomWithStorage } from "jotai/utils";

/**
 * Persist the navigation sidebar expanded/collapsed status.
 */
export const navExpandedAtom = atomWithStorage<boolean>(
  "ihpp-nav-expanded",
  true,
);
