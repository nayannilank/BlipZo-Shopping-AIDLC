import { useState, useEffect, useRef, useCallback } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useNavigate } from 'react-router-dom';
export function SearchBar({ initialQuery = '', onSearch, placeholder = 'Search products...' }) {
  const [value, setValue] = useState(initialQuery);
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);
  const handleDebouncedSearch = useCallback(
    (query) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        const trimmed = query.trim();
        if (trimmed.length >= 1 && trimmed.length <= 100) {
          if (onSearch) {
            onSearch(trimmed);
          } else {
            void navigate(`/search?q=${encodeURIComponent(trimmed)}`);
          }
        }
      }, 400);
    },
    [onSearch, navigate],
  );
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  function handleChange(e) {
    const newValue = e.target.value;
    setValue(newValue);
    handleDebouncedSearch(newValue);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const trimmed = value.trim();
    if (trimmed.length >= 1 && trimmed.length <= 100) {
      if (onSearch) {
        onSearch(trimmed);
      } else {
        void navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    }
  }
  return _jsx('form', {
    onSubmit: handleSubmit,
    className: 'w-full',
    role: 'search',
    children: _jsxs('div', {
      className: 'relative',
      children: [
        _jsx('label', {
          htmlFor: 'search-input',
          className: 'sr-only',
          children: 'Search products',
        }),
        _jsx('div', {
          className: 'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
          children: _jsx('svg', {
            className: 'h-5 w-5 text-gray-400',
            fill: 'none',
            viewBox: '0 0 24 24',
            stroke: 'currentColor',
            'aria-hidden': 'true',
            children: _jsx('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
            }),
          }),
        }),
        _jsx('input', {
          id: 'search-input',
          type: 'search',
          value: value,
          onChange: handleChange,
          placeholder: placeholder,
          maxLength: 100,
          className:
            'block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20 sm:text-base',
          'aria-describedby': 'search-hint',
        }),
        _jsx('span', {
          id: 'search-hint',
          className: 'sr-only',
          children: 'Enter 1 to 100 characters to search products',
        }),
      ],
    }),
  });
}
