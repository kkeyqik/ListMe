'use client';

import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const wrapperClasses = [
      styles.inputWrapper,
      fullWidth ? styles.fullWidth : '',
      error ? styles.error : '',
      disabled ? styles.disabled : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = [
      styles.inputEl,
      leftIcon ? styles.hasLeftIcon : '',
      rightIcon ? styles.hasRightIcon : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputContainer}>
          {leftIcon && <div className={styles.iconLeft}>{leftIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={inputClasses}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            aria-invalid={!!error}
            {...props}
          />
          {rightIcon && <div className={styles.iconRight}>{rightIcon}</div>}
        </div>
        {error ? (
          <span id={errorId} className={styles.errorText} role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
