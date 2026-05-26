import type { CategoryNode } from '@blipzo/shared';
import { Link } from 'react-router-dom';

interface CategoryCardProps {
  category: CategoryNode;
}

/**
 * Displays a top-level category as a clickable card with name, icon, and
 * navigation to the subcategories page for that category.
 *
 * Validates: Requirements 5.1
 */
export function CategoryCard({ category }: CategoryCardProps): React.JSX.Element {
  return (
    <Link
      to={`/browse/${category.categoryId}`}
      className="group flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
    >
      {category.icon && (
        <span
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-50 text-2xl text-brand-blue-600 transition-colors group-hover:bg-brand-blue-100"
          aria-hidden="true"
        >
          <CategoryIcon name={category.icon} />
        </span>
      )}
      <div className="flex w-full items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-blue-600">
          {category.name}
        </h2>
        <svg
          className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

/**
 * Maps icon name strings from the category data to SVG icons.
 * Falls back to a generic grid icon for unknown names.
 */
function CategoryIcon({ name }: { name: string }): React.JSX.Element {
  switch (name) {
    case 'cpu':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
      );
    case 'shirt':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M6.5 2L2 6l3 1.5V20a1 1 0 001 1h12a1 1 0 001-1V7.5L22 6l-4.5-4h-4L12 4l-1.5-2h-4z"
          />
        </svg>
      );
    case 'home':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      );
    case 'book':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      );
    case 'dumbbell':
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 12h1m16 0h1M5.5 8v8M18.5 8v8M7 9v6m10-6v6M9 12h6"
          />
        </svg>
      );
    default:
      return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      );
  }
}
