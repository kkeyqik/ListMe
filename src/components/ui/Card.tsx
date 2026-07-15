'use client';

import React from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = '',
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      as: Component = 'div',
      ...props
    },
    ref
  ) => {
    const paddingClass = {
      none: styles.pNone,
      sm: styles.pSm,
      md: styles.pMd,
      lg: styles.pLg,
    }[padding];

    const classNames = [
      styles.card,
      styles[variant],
      paddingClass,
      hoverable ? styles.hoverable : '',
      clickable ? styles.clickable : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Component
        ref={ref}
        className={classNames}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }
            : undefined
        }
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';
export default Card;
