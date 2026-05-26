import type { CategoryNode, CategoryTreeResponse, SubcategoryListResponse } from '@blipzo/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '../../../api/client';

interface CategorySelectorProps {
  onSelect: (categoryId: string, subcategoryId: string) => void;
}

async function fetchCategories(): Promise<CategoryNode[]> {
  const response = await apiClient.get<CategoryTreeResponse>('/catalogue/categories');
  return response.data.categories;
}

async function fetchSubcategories(categoryId: string): Promise<CategoryNode[]> {
  const response = await apiClient.get<SubcategoryListResponse>(
    `/catalogue/categories/${categoryId}/subcategories`,
  );
  return response.data.subcategories;
}

export function CategorySelector({ onSelect }: CategorySelectorProps): React.JSX.Element {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: () => fetchSubcategories(selectedCategoryId),
    enabled: !!selectedCategoryId,
    staleTime: 1000 * 60 * 10,
  });

  function handleCategoryChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const categoryId = event.target.value;
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId('');
  }

  function handleSubcategoryChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const subcategoryId = event.target.value;
    setSelectedSubcategoryId(subcategoryId);
    if (subcategoryId && selectedCategoryId) {
      onSelect(selectedCategoryId, subcategoryId);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          value={selectedCategoryId}
          onChange={handleCategoryChange}
          disabled={categoriesQuery.isLoading}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">
            {categoriesQuery.isLoading ? 'Loading categories...' : 'Select a category'}
          </option>
          {categoriesQuery.data?.map((category) => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.name}
            </option>
          ))}
        </select>
        {categoriesQuery.isError && (
          <p className="mt-1 text-xs text-red-600">Failed to load categories. Please try again.</p>
        )}
      </div>

      {selectedCategoryId && (
        <div>
          <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
            Subcategory
          </label>
          <select
            id="subcategory"
            value={selectedSubcategoryId}
            onChange={handleSubcategoryChange}
            disabled={subcategoriesQuery.isLoading}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">
              {subcategoriesQuery.isLoading ? 'Loading subcategories...' : 'Select a subcategory'}
            </option>
            {subcategoriesQuery.data?.map((subcategory) => (
              <option key={subcategory.categoryId} value={subcategory.categoryId}>
                {subcategory.name}
              </option>
            ))}
          </select>
          {subcategoriesQuery.isError && (
            <p className="mt-1 text-xs text-red-600">
              Failed to load subcategories. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
