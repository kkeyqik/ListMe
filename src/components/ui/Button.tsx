'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Allow button props or anchor link props
export type ButtonProps = ButtonBaseProps & 
  (
    | (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
    | (React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
  );

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      href,
      disabled,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.btn,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : '',
      loading ? styles.loading : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const content = (
      <>
        {loading && <span className={styles.spinner} role="status" aria-label="loading" />}
        {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
      </>
    );

    if (href) {
      // Pull onClick out so the caller's handler can't replace the disabled/loading guard.
      const { onClick: anchorOnClick, ...anchorProps } = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
      const inactive = Boolean(disabled || loading);
      return (
        <Link
          {...anchorProps}
          href={href}
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          className={classNames}
          aria-disabled={inactive || undefined}
          tabIndex={inactive ? -1 : anchorProps.tabIndex}
          onClick={(e) => {
            if (inactive) {
              e.preventDefault();
              return;
            }
            anchorOnClick?.(e);
          }}
        >
          {content}
        </Link>
      );
    }

    const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        className={classNames}
        disabled={disabled || loading}
        type={buttonProps.type || 'button'}
        {...buttonProps}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
