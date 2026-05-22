import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'Search products...',
}: SearchBarProps): React.ReactElement {
  const [value, setValue] = useState(initialQuery);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const handleDebouncedSearch = useCallback(
    (query: string) => {
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const newValue = e.target.value;
    setValue(newValue);
    handleDebouncedSearch(newValue);
  }

  function handleSubmit(e: React.SyntheticEvent): void {
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

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search">
      <div className="relative">
        <label htmlFor="search-input" className="sr-only">
          Search products
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          id="search-input"
          type="search"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={100}
          className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20 sm:text-base"
          aria-describedby="search-hint"
        />
        <span id="search-hint" className="sr-only">
          Enter 1 to 100 characters to search products
        </span>
      </div>
    </form>
  );
}
