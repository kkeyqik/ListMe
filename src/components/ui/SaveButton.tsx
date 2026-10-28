'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useSavedListings } from '@/context/SavedListingsContext';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

interface SaveButtonProps {
  listingId: string;
  className?: string;
  activeClassName?: string;
  iconClassName?: string;
  size?: number;
  /** Show a "Save"/"Saved" label next to the heart. */
  withLabel?: boolean;
  style?: React.CSSProperties;
}

/**
 * Heart toggle for saving a listing. Safe to place inside a card <Link>:
 * it stops the click from navigating.
 */
export function SaveButton({
  listingId,
  className,
  activeClassName,
  iconClassName,
  size = 18,
  withLabel = false,
  style,
}: SaveButtonProps) {
  const { isSaved, toggleSaved } = useSavedListings();
  const { showToast } = useToast();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const saved = isSaved(listingId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const want = !saved;
    const result = await toggleSaved(listingId);
    setBusy(false);
    if (result !== want) {
      showToast('Could not update', 'Please try again in a moment.', 'error');
    } else if (want) {
      showToast(
        'Saved',
        profile ? 'Added to your saved properties.' : 'Saved on this device. Log in to keep it on your account.',
        'success',
      );
    } else {
      showToast('Removed', 'Removed from your saved properties.', 'info');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[className, saved ? activeClassName : ''].filter(Boolean).join(' ')}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved properties' : 'Save property'}
      title={saved ? 'Saved' : 'Save'}
      style={style}
    >
      <Heart
        size={size}
        fill={saved ? 'currentColor' : 'none'}
        className={iconClassName}
        aria-hidden="true"
      />
      {withLabel && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}

export default SaveButton;
