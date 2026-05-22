import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useParams, Link } from 'react-router-dom';

import { SearchBar } from '../../components/features/SearchBar';
import { ProductGrid } from '../../components/ui/ProductGrid';
import { useCategoryProducts } from '../../hooks/useCatalogue';
function ProductGridSkeleton() {
  return _jsx('div', {
    className: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4',
    children: Array.from({ length: 10 }, (_, i) =>
      _jsxs(
        'div',
        {
          className: 'animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white',
          children: [
            _jsx('div', { className: 'aspect-square w-full bg-gray-200' }),
            _jsxs('div', {
              className: 'p-3 sm:p-4',
              children: [
                _jsx('div', { className: 'h-4 w-3/4 rounded bg-gray-200' }),
                _jsx('div', { className: 'mt-2 h-5 w-1/2 rounded bg-gray-200' }),
                _jsx('div', { className: 'mt-2 h-3 w-1/3 rounded bg-gray-200' }),
              ],
            }),
          ],
        },
        i,
      ),
    ),
  });
}
export function Component() {
  const { categoryId } = useParams();
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCategoryProducts(categoryId ?? '');
  const allProducts = data?.pages.flatMap((page) => page.items) ?? [];
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
          _jsx('nav', {
            'aria-label': 'Breadcrumb',
            className: 'mb-6',
            children: _jsxs('ol', {
              className: 'flex items-center gap-2 text-sm text-gray-500',
              children: [
                _jsx('li', {
                  children: _jsx(Link, {
                    to: '/',
                    className: 'hover:text-brand-blue-600',
                    children: 'Home',
                  }),
                }),
                _jsx('li', { 'aria-hidden': 'true', children: '/' }),
                _jsx('li', {
                  className: 'font-medium text-gray-900',
                  children: categoryId ?? 'Category',
                }),
              ],
            }),
          }),
          _jsx('h1', {
            className: 'text-2xl font-bold text-gray-900 sm:text-3xl',
            children: categoryId ?? 'Category',
          }),
          isLoading && _jsx('div', { className: 'mt-8', children: _jsx(ProductGridSkeleton, {}) }),
          isError &&
            _jsxs('div', {
              className: 'mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center',
              children: [
                _jsx('p', {
                  className: 'text-sm font-medium text-red-800',
                  children: 'Failed to load products.',
                }),
                _jsx('p', {
                  className: 'mt-1 text-xs text-red-600',
                  children:
                    error instanceof Error ? error.message : 'An unexpected error occurred.',
                }),
              ],
            }),
          !isLoading &&
            !isError &&
            _jsxs('div', {
              className: 'mt-8',
              children: [
                _jsx(ProductGrid, { products: allProducts }),
                hasNextPage &&
                  _jsx('div', {
                    className: 'mt-8 flex justify-center',
                    children: _jsx('button', {
                      type: 'button',
                      onClick: () => void fetchNextPage(),
                      disabled: isFetchingNextPage,
                      className:
                        'rounded-lg bg-brand-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      children: isFetchingNextPage ? 'Loading...' : 'Load More Products',
                    }),
                  }),
              ],
            }),
        ],
      }),
    ],
  });
}
export default Component;
