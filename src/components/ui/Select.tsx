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
  id,
  name,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const selectId = id || name || generatedId;

  return (
    <div className={`
      ${styles.wrapper} 
      ${fullWidth ? styles.fullWidth : ''} 
      ${error ? styles.error : ''} 
      ${disabled ? styles.disabled : ''} 
      ${wrapperClassName}
    `}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          <span>{label}</span>
          {subLabel && <span className={styles.subLabel}>{subLabel}</span>}
        </label>
      )}

      <div className={styles.container}>
        {leftIcon && <div className={styles.iconLeft}>{leftIcon}</div>}
        
        <select
          ref={ref}
          id={selectId}
          name={name}
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
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = React.useId();
  const comboboxId = id || generatedId;
  const listboxId = `${comboboxId}-listbox`;

  // Parse and deduplicate options
  const normalizedOptions: SelectOption[] = React.useMemo(() => {
    const seen = new Set<string>();
    const list: SelectOption[] = [];
    for (const opt of options) {
      const optVal = typeof opt === 'string' ? opt : opt.value;
      const optLabel = typeof opt === 'string' ? opt : opt.label;
      const optSub = typeof opt === 'string' ? undefined : opt.subLabel;
      if (optVal !== undefined && optVal !== null && !seen.has(optVal.toLowerCase())) {
        seen.add(optVal.toLowerCase());
        list.push({ value: optVal, label: optLabel, subLabel: optSub });
      }
    }
    return list;
  }, [options]);

  // Filter options: if user is actively typing, filter by input; otherwise, show all options!
  const filteredOptions = React.useMemo(() => {
    if (!isTyping || !value) {
      return normalizedOptions;
    }
    const query = value.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(query) ||
      (opt.subLabel ? opt.subLabel.toLowerCase().includes(query) : false)
    );
  }, [normalizedOptions, isTyping, value]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  // Close on click or touch outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsTyping(false);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleOpenDropdown = () => {
    if (disabled || normalizedOptions.length === 0 || isOpen) return;
    setIsTyping(false);
    // Find index of currently selected item to pre-highlight it
    const currentIdx = normalizedOptions.findIndex(
      (opt) => opt.value.toLowerCase() === (value || '').toLowerCase()
    );
    setActiveIndex(currentIdx >= 0 ? currentIdx : 0);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        handleOpenDropdown();
      } else if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        handleOpenDropdown();
      } else if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault(); // Crucial: Prevent accidental form submission
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[activeIndex].value);
        } else {
          setIsOpen(false);
          setIsTyping(false);
        }
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        setIsTyping(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
        setIsTyping(false);
        setActiveIndex(-1);
      }
    }
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
        <label className={styles.label} htmlFor={comboboxId}>
          <span>{label}</span>
          {subLabel && <span className={styles.subLabel}>{subLabel}</span>}
        </label>
      )}

      <div className={styles.container}>
        <input
          ref={inputRef}
          id={comboboxId}
          name={name}
          type="text"
          value={value}
          onChange={(e) => {
            setIsTyping(true);
            onChange(e.target.value);
            setActiveIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onClick={handleOpenDropdown}
          onFocus={handleOpenDropdown}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length
              ? `${listboxId}-opt-${activeIndex}`
              : undefined
          }
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
              if (isOpen) {
                setIsOpen(false);
                setIsTyping(false);
                setActiveIndex(-1);
              } else {
                handleOpenDropdown();
                inputRef.current?.focus();
              }
            }
          }}
          className={`${styles.comboboxChevronBtn} ${isOpen ? styles.chevronOpen : ''}`}
          aria-label="Toggle dropdown"
        >
          <ChevronDown size={18} />
        </button>

        {isOpen && !disabled && (
          <div 
            id={listboxId}
            role="listbox"
            ref={listRef}
            className={styles.dropdownMenu}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value.toLowerCase() === (value || '').toLowerCase();
                const isHighlighted = idx === activeIndex;
                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`
                      ${styles.dropdownItem} 
                      ${isSelected ? styles.dropdownItemActive : ''}
                      ${isHighlighted ? styles.dropdownItemHighlighted : ''}
                    `}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                    }}
                    onClick={() => {
                      handleSelectOption(opt.value);
                    }}
                  >
                    <span>{opt.label}</span>
                    {opt.subLabel && <span className={styles.dropdownItemSub}>{opt.subLabel}</span>}
                  </div>
                );
              })
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
