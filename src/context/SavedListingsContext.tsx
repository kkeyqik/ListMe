'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Saved (shortlisted) listings, shared by every heart button on the site.
 *
 * Signed in: the list lives in the database (/api/users/shortlist).
 * Signed out: it lives in localStorage and is moved to the account on the
 * next sign-in, so a guest's saves are not lost.
 */

const GUEST_KEY = 'listme_favorites';

interface SavedListingsContextType {
  isSaved: (listingId: string) => boolean;
  toggleSaved: (listingId: string) => Promise<boolean>;
  savedCount: number;
  ready: boolean;
}

const SavedListingsContext = createContext<SavedListingsContextType | undefined>(undefined);

function readGuestIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    // Older format: { [id]: true | false }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, unknown>)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
    }
  } catch {
    // Ignore unreadable storage
  }
  return [];
}

function writeGuestIds(ids: Iterable<string>) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage errors (private mode, quota)
  }
}

async function sendSave(listingId: string, save: boolean): Promise<boolean> {
  const res = await fetch('/api/users/shortlist', {
    method: save ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId }),
  });
  return res.ok;
}

export function SavedListingsProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const userId = profile?.id ?? null;
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const loadedFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading || loadedFor.current === userId) return;
    loadedFor.current = userId;
    let cancelled = false;

    if (!userId) {
      setIds(new Set(readGuestIds()));
      setReady(true);
      return;
    }

    (async () => {
      try {
        // Move any saves made while signed out into the account.
        const guestIds = readGuestIds();
        if (guestIds.length > 0) {
          await Promise.allSettled(guestIds.slice(0, 50).map((id) => sendSave(id, true)));
          writeGuestIds([]);
        }
        const res = await fetch('/api/users/shortlist', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { ids?: string[] } = await res.json();
        if (!cancelled) setIds(new Set(data.ids ?? []));
      } catch (err) {
        console.warn('[SavedListings] Could not load saved listings:', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, loading]);

  const isSaved = useCallback((listingId: string) => ids.has(listingId), [ids]);

  /** Flips the saved state. Returns the new state (reverted if the server refused). */
  const toggleSaved = useCallback(
    async (listingId: string) => {
      const next = !ids.has(listingId);
      const apply = (save: boolean) =>
        setIds((prev) => {
          const copy = new Set(prev);
          if (save) copy.add(listingId);
          else copy.delete(listingId);
          if (!userId) writeGuestIds(copy);
          return copy;
        });

      apply(next);
      if (!userId) return next;

      try {
        if (await sendSave(listingId, next)) return next;
      } catch {
        // fall through to revert
      }
      apply(!next);
      return !next;
    },
    [ids, userId],
  );

  const value = useMemo(
    () => ({ isSaved, toggleSaved, savedCount: ids.size, ready }),
    [isSaved, toggleSaved, ids, ready],
  );

  return <SavedListingsContext.Provider value={value}>{children}</SavedListingsContext.Provider>;
}

export function useSavedListings() {
  const ctx = useContext(SavedListingsContext);
  if (!ctx) throw new Error('useSavedListings must be used within a SavedListingsProvider');
  return ctx;
}
