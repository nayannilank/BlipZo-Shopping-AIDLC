import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Link } from 'react-router-dom';

import { SearchBar } from '../../components/features/SearchBar';
import { useCategories } from '../../hooks/useCatalogue';
function CategorySkeleton() {
  return _jsx('div', {
    className: 'animate-pulse rounded-lg border border-gray-200 bg-white p-6',
    children: _jsx('div', { className: 'h-6 w-3/4 rounded bg-gray-200' }),
  });
}
export function Component() {
  const { data: categories, isLoading, isError, error } = useCategories();
  return _jsxs('div', {
    className: 'min-h-screen bg-gray-50',
    children: [
      _jsx('header', {
        className: 'border-b border-gray-200 bg-white shadow-sm',
        children: _jsx('div', {
          className: 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8',
          children: _jsxs('div', {
            className: 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
            children: [
              _jsx(Link, {
                to: '/',
                className: 'text-2xl font-bold text-brand-blue-600',
                children: 'BlipZo',
              }),
              _jsx('div', { className: 'w-full sm:max-w-md', children: _jsx(SearchBar, {}) }),
            ],
          }),
        }),
      }),
      _jsxs('main', {
        className: 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
        children: [
          _jsx('h1', {
            className: 'text-2xl font-bold text-gray-900 sm:text-3xl',
            children: 'Browse Categories',
          }),
          _jsx('p', {
            className: 'mt-2 text-sm text-gray-600',
            children: 'Explore our product categories to find what you need.',
          }),
          isLoading &&
            _jsx('div', {
              className: 'mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
              children: Array.from({ length: 8 }, (_, i) => _jsx(CategorySkeleton, {}, i)),
            }),
          isError &&
            _jsxs('div', {
              className: 'mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load categories.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children:
                    error instanceof Error ? error.message : 'An unexpected error occurred.',
                }),
              ],
            }),
          categories &&
            categories.length > 0 &&
            _jsx('div', {
              className: 'mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
              children: categories.map((category) =>
                _jsx(
                  Link,
                  {
                    to: `/categories/${category.categoryId}`,
                    className:
                      'group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2',
                    children: _jsxs('div', {
                      className: 'flex items-center justify-between',
                      children: [
                        _jsx('h2', {
                          className:
                            'text-lg font-semibold text-gray-900 group-hover:text-brand-blue-600',
                          children: category.name,
                        }),
                        _jsx('svg', {
                          className:
                            'h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-blue-500',
                          fill: 'none',
                          viewBox: '0 0 24 24',
                          stroke: 'currentColor',
                          'aria-hidden': 'true',
                          children: _jsx('path', {
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            strokeWidth: 2,
                            d: 'M9 5l7 7-7 7',
                          }),
                        }),
                      ],
                    }),
                  },
                  category.categoryId,
                ),
              ),
            }),
          categories &&
            categories.length === 0 &&
            _jsxs('div', {
              className: 'mt-8 flex flex-col items-center justify-center py-16 text-center',
              children: [
                _jsx('p', {
                  className: 'text-lg font-medium text-gray-600',
                  children: 'No categories available yet.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-sm text-gray-400',
                  children: 'Check back later for new product categories.',
                }),
              ],
            }),
        ],
      }),
    ],
  });
}
export default Component;
