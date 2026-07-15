'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const classNames = [
    styles.skeleton,
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const customStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  };

  return <span className={classNames} style={customStyle} {...props} />;
};

export default Skeleton;
