'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  subLabel?: string;
  error?: string;
  options?: Array<SelectOption | string>;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  wrapperClassName?: string;
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  subLabel,
  error,
  options,
  placeholder,
  leftIcon,
  fullWidth = false,
  size = 'md',
  disabled,
  className = '',
  wrapperClassName = '',
  children,
  ...props
}, ref) => {
  return (
    <div className={`
      ${styles.wrapper} 
      ${fullWidth ? styles.fullWidth : ''} 
      ${error ? styles.error : ''} 
      ${disabled ? styles.disabled : ''} 
      ${wrapperClassName}
    `}>
      {label && (
        <label className={styles.label} htmlFor={props.id || props.name}>
          <span>{label}</span>
          {subLabel && <span className={styles.subLabel}>{subLabel}</span>}
        </label>
      )}

      <div className={styles.container}>
        {leftIcon && <div className={styles.iconLeft}>{leftIcon}</div>}
        
        <select
          ref={ref}
          disabled={disabled}
          className={`
            ${styles.selectEl} 
            ${size === 'sm' ? styles.sizeSm : ''} 
            ${leftIcon ? styles.hasLeftIcon : ''} 
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled={props.required}>
              {placeholder}
            </option>
          )}
          {options ? (
            options.map((opt) => {
              const value = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={value} value={value}>
                  {optLabel}
                </option>
              );
            })
          ) : (
            children
          )}
        </select>

        <div className={styles.chevron}>
          <ChevronDown size={size === 'sm' ? 14 : 18} />
        </div>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

/* ═══════════════════════════════════════════════════════════
   COMBOBOX: Searchable & Creatable (Select or Type Custom)
   ═══════════════════════════════════════════════════════════ */

export interface ComboboxProps {
  label?: string;
  subLabel?: string;
  error?: string;
  options: Array<SelectOption | string>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  name?: string;
  id?: string;
  wrapperClassName?: string;
  className?: string;
  emptyText?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  subLabel,
  error,
  options,
  value,
  onChange,
  placeholder = 'Select or type custom...',
  disabled = false,
  required = false,
  fullWidth = false,
  name,
  id,
  wrapperClassName = '',
  className = '',
  emptyText = 'No matching options (you can still type your own)'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse options
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  // Filter options based on typed value
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes((value || '').toLowerCase())
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef}
      className={`
        ${styles.wrapper} 
        ${fullWidth ? styles.fullWidth : ''} 
        ${error ? styles.error : ''} 
        ${disabled ? styles.disabled : ''} 
        ${wrapperClassName}
      `}
    >
      {label && (
        <label className={styles.label} htmlFor={id || name}>
          <span>{label}</span>
          {subLabel && <span className={styles.subLabel}>{subLabel}</span>}
        </label>
      )}

      <div className={styles.container}>
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled && normalizedOptions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          className={`${styles.comboboxInput} ${className}`}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled && normalizedOptions.length > 0) {
              setIsOpen((prev) => !prev);
            }
          }}
          className={`${styles.comboboxChevronBtn} ${isOpen ? styles.chevronOpen : ''}`}
          aria-label="Toggle dropdown"
        >
          <ChevronDown size={18} />
        </button>

        {isOpen && !disabled && (
          <div className={styles.dropdownMenu}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`
                    ${styles.dropdownItem} 
                    ${opt.value.toLowerCase() === (value || '').toLowerCase() ? styles.dropdownItemActive : ''}
                  `}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSelectOption(opt.value);
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.subLabel && <span className={styles.dropdownItemSub}>{opt.subLabel}</span>}
                </div>
              ))
            ) : (
              <div className={styles.emptyItem}>{emptyText}</div>
            )}
          </div>
        )}
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
};
