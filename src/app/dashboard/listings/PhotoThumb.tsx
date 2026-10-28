'use client';

import React, { useMemo } from 'react';

/**
 * Small preview of a photo the owner picked but has not uploaded yet, so they
 * can check which pictures they chose. The object URL is released once the
 * image has loaded.
 */
export function PhotoThumb({ file, name }: { file: File; name: string }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Preview of ${name}`}
      width={40}
      height={40}
      onLoad={() => URL.revokeObjectURL(url)}
      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: 'var(--color-neutral-100, #f1f5f9)' }}
    />
  );
}
