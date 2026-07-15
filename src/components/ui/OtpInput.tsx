'use client';

import React, { useRef, useEffect } from 'react';
import styles from './OtpInput.module.css';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  numInputs?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  numInputs = 6,
  disabled = false,
  error = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split the value into an array of characters
  const values = Array(numInputs)
    .fill('')
    .map((_, i) => value[i] || '');

  // Handle focusing the first input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = (index: number) => {
    const targetIndex = Math.max(0, Math.min(index, numInputs - 1));
    if (inputRefs.current[targetIndex]) {
      inputRefs.current[targetIndex]?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    // Get only the last character entered
    const lastChar = val.substring(val.length - 1);
    
    // Accept only digits
    if (lastChar && !/^\d$/.test(lastChar)) {
      return;
    }

    const newValues = [...values];
    newValues[index] = lastChar;
    const combinedValue = newValues.join('');
    
    onChange(combinedValue);

    // Auto-focus next input if a digit is entered
    if (lastChar !== '') {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      // If the current input is empty, clear the previous input and focus it
      if (values[index] === '') {
        const newValues = [...values];
        newValues[index - 1] = '';
        onChange(newValues.join(''));
        focusInput(index - 1);
      } else {
        // Clear the current input
        const newValues = [...values];
        newValues[index] = '';
        onChange(newValues.join(''));
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      focusInput(index - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      focusInput(index + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Filter only digits and slice to required length
    const cleanData = pastedData.replace(/\D/g, '').slice(0, numInputs);
    if (cleanData) {
      onChange(cleanData);
      // Focus the last filled input or the last input
      focusInput(cleanData.length);
    }
  };

  return (
    <div className={styles.otpContainer}>
      {values.map((val, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={val}
          placeholder="0"
          onChange={(e) => handleInputChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`${styles.otpInput} ${error ? styles.error : ''} ${val ? styles.hasValue : ''}`}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
};
