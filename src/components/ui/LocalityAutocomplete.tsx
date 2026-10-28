'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { Place } from '@/lib/places';
import styles from './LocalityAutocomplete.module.css';

export type { Place } from '@/lib/places';

export interface LocalityAutocompleteProps {
  /** Text in the box (controlled). Free text is allowed. */
  value: string;
  onChange: (value: string) => void;
  /** Called with the full place when a suggestion is picked (Google picks are resolved to lat/lng first). */
  onSelect: (place: Place) => void;
  /** Optional city to rank that city's localities first. */
  city?: string;
  /** Extra local options shown before remote results, e.g. the post offices of a typed PIN. */
  presetOptions?: string[];
  label?: string;
  subLabel?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  error?: string;
  /** Extra class for the outer wrapper / the input. */
  wrapperClassName?: string;
  inputClassName?: string;
  /** Hide the leading map pin icon (e.g. inside a search bar that has its own). */
  hideIcon?: boolean;
  autoFocus?: boolean;
  /** Show the dropdown above the input instead of below. */
  dropUp?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  'aria-label'?: string;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

// Shared across instances for the life of the page: repeat queries are instant.
const clientCache = new Map<string, Place[]>();

/** "Locality, City, State · PIN" style secondary line. */
export function formatPlaceSecondary(p: Place): string {
  const parts: string[] = [];
  if (p.locality && p.locality !== p.name) parts.push(p.locality);
  if (p.city && p.city !== p.name) parts.push(p.city);
  if (p.state && p.state !== p.city) parts.push(p.state);
  const where = parts.join(', ');
  return p.pinCode ? `${where}${where ? ' · ' : ''}${p.pinCode}` : where;
}

export async function fetchPlaces(q: string, city?: string, signal?: AbortSignal): Promise<Place[]> {
  const query = q.trim();
  if (query.length < MIN_CHARS) return [];
  const key = `${query.toLowerCase()}|${(city || '').toLowerCase()}`;
  const hit = clientCache.get(key);
  if (hit) return hit;
  const params = new URLSearchParams({ q: query.slice(0, 100) });
  if (city) params.set('city', city);
  const res = await fetch(`/api/places/autocomplete?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const places: Place[] = Array.isArray(data?.places) ? data.places : [];
  if (clientCache.size > 300) clientCache.clear();
  clientCache.set(key, places);
  return places;
}

/** Fill lat/lng and PIN for a Google suggestion; other sources come back unchanged. */
export async function resolvePlace(place: Place): Promise<Place> {
  if (place.source !== 'google' || (place.lat !== null && place.pinCode)) return place;
  try {
    const res = await fetch(`/api/places/details?id=${encodeURIComponent(place.id)}`);
    if (!res.ok) return place;
    const data = await res.json();
    return data?.place ? { ...place, ...data.place } : place;
  } catch {
    return place;
  }
}

/**
 * Debounced locality suggestions for a query (used by the autocomplete and the site search bars).
 * Returns no places while `enabled` is false or the query is shorter than 2 characters.
 */
export function usePlaceSuggestions(query: string, { city, enabled = true }: { city?: string; enabled?: boolean } = {}) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_CHARS) {
      abortRef.current?.abort();
      const t = setTimeout(() => {
        setPlaces([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const result = await fetchPlaces(q, city, controller.signal);
        if (!controller.signal.aborted) setPlaces(result);
      } catch {
        if (!controller.signal.aborted) setPlaces([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, city, enabled]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { places, loading, cancel };
}

type Option = { key: string; place: Place };

export default function LocalityAutocomplete({
  value,
  onChange,
  onSelect,
  city,
  presetOptions,
  label,
  subLabel,
  placeholder = 'Search locality, sector, society or PIN',
  name,
  id,
  required,
  disabled,
  fullWidth = true,
  error,
  wrapperClassName = '',
  inputClassName = '',
  hideIcon,
  autoFocus,
  dropUp,
  onKeyDown,
  'aria-label': ariaLabel,
}: LocalityAutocompleteProps) {
  const generatedId = useId();
  const inputId = id || `locality-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { places: remote, loading, cancel } = usePlaceSuggestions(value, { city, enabled: typing });

  // Local options (PIN post offices) filtered by what is typed.
  const presetPlaces = useMemo<Place[]>(() => {
    const q = typing ? value.trim().toLowerCase() : '';
    return (presetOptions || [])
      .filter((name) => !q || name.toLowerCase().includes(q))
      .map((name) => ({
        id: `preset:${name}`,
        name,
        locality: name,
        city: city || '',
        state: '',
        lat: null,
        lng: null,
        source: 'indiapost' as const,
      }));
  }, [presetOptions, typing, value, city]);

  const options = useMemo<Option[]>(() => {
    const seen = new Set<string>();
    const out: Option[] = [];
    for (const place of [...presetPlaces, ...(typing ? remote : [])]) {
      const k = `${place.name}|${place.city}`.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ key: `${place.id}-${out.length}`, place });
    }
    return out;
  }, [presetPlaces, remote, typing]);


  // Close on outside click / touch.
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    if (open && activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const choose = useCallback(
    async (place: Place) => {
      setOpen(false);
      setTyping(false);
      setActiveIndex(-1);
      cancel();
      onChange(place.locality || place.name);
      const full = await resolvePlace(place);
      onSelect(full);
    },
    [onChange, onSelect, cancel]
  );

  const showList = open && !disabled && (options.length > 0 || (typing && value.trim().length >= MIN_CHARS && !loading));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (options.length > 0) setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (options.length > 0) setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (showList && activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault(); // pick the option instead of submitting the form
        void choose(options[activeIndex].place);
        return;
      }
      if (showList && !onKeyDown) {
        // Free text: keep what was typed and just close the list (a second Enter submits).
        e.preventDefault();
        setOpen(false);
        setTyping(false);
      } else if (showList) {
        setOpen(false);
        setTyping(false);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
    onKeyDown?.(e);
  };

  const activeId = showList && activeIndex >= 0 && activeIndex < options.length ? `${listboxId}-opt-${activeIndex}` : undefined;
  const statusText = loading
    ? 'Searching…'
    : showList
      ? `${options.length} suggestion${options.length === 1 ? '' : 's'} available`
      : '';

  return (
    <div
      ref={containerRef}
      className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''} ${error ? styles.hasError : ''} ${wrapperClassName}`}
    >
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          <span>
            {label}
            {required && <span aria-hidden="true"> *</span>}
          </span>
          {subLabel && <span className={styles.subLabel}>{subLabel}</span>}
        </label>
      )}
      <div className={styles.container}>
        {!hideIcon && (
          <span className={styles.iconLeft} aria-hidden="true">
            <MapPin size={18} />
          </span>
        )}
        <input
          id={inputId}
          name={name}
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            setTyping(true);
            setOpen(true);
            setActiveIndex(-1);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={150}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-label={label ? undefined : ariaLabel || 'Locality'}
          aria-expanded={showList}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          className={`${styles.input} ${hideIcon ? '' : styles.withIcon} ${inputClassName}`}
        />
        {loading && (
          <span className={styles.spinner} aria-hidden="true">
            <Loader2 size={16} />
          </span>
        )}
        <ul
          id={listboxId}
          role="listbox"
          ref={listRef}
          aria-label="Locality suggestions"
          className={`${styles.menu} ${dropUp ? styles.menuUp : ''}`}
          hidden={!showList}
        >
          {options.map((opt, idx) => {
            const secondary = formatPlaceSecondary(opt.place);
            return (
              <li
                key={opt.key}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                className={`${styles.option} ${idx === activeIndex ? styles.optionActive : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void choose(opt.place)}
              >
                <MapPin size={16} className={styles.optionIcon} aria-hidden="true" />
                <span className={styles.optionText}>
                  <span className={styles.optionName}>{opt.place.name}</span>
                  {secondary && <span className={styles.optionSub}>{secondary}</span>}
                </span>
              </li>
            );
          })}
          {options.length === 0 && (
            <li className={styles.empty} role="presentation">
              No matches. You can keep what you typed.
            </li>
          )}
        </ul>
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {statusText}
      </span>
      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
}
