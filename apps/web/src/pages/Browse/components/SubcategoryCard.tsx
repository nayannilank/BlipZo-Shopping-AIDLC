import type { CategoryNode } from '@blipzo/shared';
import { Link } from 'react-router-dom';

interface SubcategoryCardProps {
  subcategory: CategoryNode;
}

/**
 * Displays a subcategory as a clickable card with name and navigation
 * to the products page for that subcategory.
 *
 * Validates: Requirements 5.2
 */
export function SubcategoryCard({ subcategory }: SubcategoryCardProps): React.JSX.Element {
  return (
    <Link
      to={`/browse/${subcategory.parentId}/${subcategory.categoryId}`}
      className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm transition-all hover:border-brand-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-brand-blue-50 group-hover:text-brand-blue-600"
          aria-hidden="true"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        </span>
        <span className="text-base font-medium text-gray-900 group-hover:text-brand-blue-600">
          {subcategory.name}
        </span>
      </div>
      <svg
        className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
