import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';

import { ProductCard } from './ProductCard';
export function ProductGrid({ products }) {
  if (products.length === 0) {
    return _jsxs('div', {
      className: 'flex flex-col items-center justify-center py-16 text-center',
      children: [
        _jsx('svg', {
          className: 'h-16 w-16 text-gray-300',
          fill: 'none',
          viewBox: '0 0 24 24',
          stroke: 'currentColor',
          'aria-hidden': 'true',
          children: _jsx('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 1.5,
            d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
          }),
        }),
        _jsx('p', {
          className: 'mt-4 text-lg font-medium text-gray-600',
          children: 'No products found',
        }),
        _jsx('p', {
          className: 'mt-1 text-sm text-gray-400',
          children: 'Try browsing a different category or adjusting your search.',
        }),
      ],
    });
  }
  return _jsx('div', {
    className: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4',
    children: products.map((product) => _jsx(ProductCard, { product: product }, product.productId)),
  });
}
