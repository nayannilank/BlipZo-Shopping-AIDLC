import type { AttributeDefinition, AttributeSchemaResponse } from '@blipzo/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiClient } from '../../../api/client';

/**
 * Filter counts object shape returned by the product listing API.
 * Maps attribute fieldName → { optionValue: count }
 */
type FilterCounts = Record<string, Record<string, number>>;

interface DynamicFilterPanelProps {
  subcategoryId: string;
  filterCounts?: FilterCounts;
}

interface PriceRange {
  minPrice: string;
  maxPrice: string;
}

async function fetchAttributeSchema(subcategoryId: string): Promise<AttributeSchemaResponse> {
  const response = await apiClient.get<AttributeSchemaResponse>(
    `/catalogue/categories/${subcategoryId}/schema`,
  );
  return response.data;
}

/**
 * DynamicFilterPanel renders filter controls for a subcategory's filterable attributes.
 *
 * - Single-select attributes are rendered as radio groups
 * - Multi-select attributes are rendered as checkboxes
 * - Includes a price range filter with min/max inputs
 * - Displays filter option counts from the API response
 * - Applies filters by updating URL query parameters
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export function DynamicFilterPanel({
  subcategoryId,
  filterCounts,
}: DynamicFilterPanelProps): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [priceRange, setPriceRange] = useState<PriceRange>({
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
  });

  const { data: schema, isLoading } = useQuery({
    queryKey: ['attributeSchema', subcategoryId],
    queryFn: () => fetchAttributeSchema(subcategoryId),
    enabled: !!subcategoryId,
    staleTime: 1000 * 60 * 10,
  });

  const filterableAttributes = schema?.attributes.filter((attr) => attr.filterable) ?? [];

  const getSelectedValues = useCallback(
    (fieldName: string): string[] => {
      const value = searchParams.get(fieldName);
      if (!value) return [];
      return value.split(',');
    },
    [searchParams],
  );

  const handleSingleSelectChange = useCallback(
    (fieldName: string, value: string): void => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const current = next.get(fieldName);
        if (current === value) {
          // Deselect if clicking the same value
          next.delete(fieldName);
        } else {
          next.set(fieldName, value);
        }
        // Reset cursor when filters change
        next.delete('cursor');
        return next;
      });
    },
    [setSearchParams],
  );

  const handleMultiSelectChange = useCallback(
    (fieldName: string, value: string, checked: boolean): void => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const current = next.get(fieldName);
        const values = current ? current.split(',') : [];

        const updated = checked ? [...values, value] : values.filter((v) => v !== value);

        if (updated.length === 0) {
          next.delete(fieldName);
        } else {
          next.set(fieldName, updated.join(','));
        }
        // Reset cursor when filters change
        next.delete('cursor');
        return next;
      });
    },
    [setSearchParams],
  );

  const handlePriceRangeApply = useCallback((): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (priceRange.minPrice) {
        next.set('minPrice', priceRange.minPrice);
      } else {
        next.delete('minPrice');
      }
      if (priceRange.maxPrice) {
        next.set('maxPrice', priceRange.maxPrice);
      } else {
        next.delete('maxPrice');
      }
      // Reset cursor when filters change
      next.delete('cursor');
      return next;
    });
  }, [priceRange, setSearchParams]);

  const handleClearAll = useCallback((): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      // Preserve non-filter params like limit
      const limit = prev.get('limit');
      if (limit) next.set('limit', limit);
      return next;
    });
    setPriceRange({ minPrice: '', maxPrice: '' });
  }, [setSearchParams]);

  const hasActiveFilters =
    filterableAttributes.some((attr) => searchParams.has(attr.fieldName)) ||
    searchParams.has('minPrice') ||
    searchParams.has('maxPrice');

  if (isLoading) {
    return <FilterPanelSkeleton />;
  }

  if (filterableAttributes.length === 0) {
    return <></>;
  }

  return (
    <aside
      className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      aria-label="Product filters"
    >
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-base font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-medium text-brand-blue-600 hover:text-brand-blue-700"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Price Range Filter */}
      <PriceRangeFilter
        priceRange={priceRange}
        onPriceChange={setPriceRange}
        onApply={handlePriceRangeApply}
      />

      {/* Dynamic Attribute Filters */}
      {filterableAttributes
        .sort((a, b) => a.displayPriority - b.displayPriority)
        .map((attribute) => (
          <FilterSection
            key={attribute.fieldName}
            attribute={attribute}
            selectedValues={getSelectedValues(attribute.fieldName)}
            counts={filterCounts?.[attribute.fieldName]}
            onSingleSelectChange={handleSingleSelectChange}
            onMultiSelectChange={handleMultiSelectChange}
          />
        ))}
    </aside>
  );
}

interface PriceRangeFilterProps {
  priceRange: PriceRange;
  onPriceChange: (range: PriceRange) => void;
  onApply: () => void;
}

function PriceRangeFilter({
  priceRange,
  onPriceChange,
  onApply,
}: PriceRangeFilterProps): React.JSX.Element {
  return (
    <div className="border-b border-gray-100 py-4">
      <h3 className="text-sm font-medium text-gray-900">Price Range (₹)</h3>
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="minPrice" className="sr-only">
          Minimum price
        </label>
        <input
          id="minPrice"
          type="number"
          min="0"
          placeholder="Min"
          value={priceRange.minPrice}
          onChange={(e) => onPriceChange({ ...priceRange, minPrice: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onApply();
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
          aria-label="Minimum price in INR"
        />
        <span className="text-sm text-gray-400">–</span>
        <label htmlFor="maxPrice" className="sr-only">
          Maximum price
        </label>
        <input
          id="maxPrice"
          type="number"
          min="0"
          placeholder="Max"
          value={priceRange.maxPrice}
          onChange={(e) => onPriceChange({ ...priceRange, maxPrice: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onApply();
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
          aria-label="Maximum price in INR"
        />
      </div>
      <button
        type="button"
        onClick={onApply}
        className="mt-2 w-full rounded-md bg-brand-blue-50 px-3 py-1.5 text-xs font-medium text-brand-blue-700 hover:bg-brand-blue-100 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-1"
      >
        Apply Price
      </button>
    </div>
  );
}

interface FilterSectionProps {
  attribute: AttributeDefinition;
  selectedValues: string[];
  counts?: Record<string, number>;
  onSingleSelectChange: (fieldName: string, value: string) => void;
  onMultiSelectChange: (fieldName: string, value: string, checked: boolean) => void;
}

function FilterSection({
  attribute,
  selectedValues,
  counts,
  onSingleSelectChange,
  onMultiSelectChange,
}: FilterSectionProps): React.JSX.Element {
  const options = getFilterOptions(attribute, counts);

  if (options.length === 0) {
    return <></>;
  }

  const isSingleSelect = attribute.dataType === 'single-select';

  return (
    <fieldset className="border-b border-gray-100 py-4 last:border-b-0">
      <legend className="text-sm font-medium text-gray-900">{attribute.displayLabel}</legend>
      <div
        className="mt-2 space-y-1.5"
        role={isSingleSelect ? 'radiogroup' : 'group'}
        aria-label={`Filter by ${attribute.displayLabel}`}
      >
        {options.map(({ value, count }) => (
          <FilterOption
            key={value}
            fieldName={attribute.fieldName}
            value={value}
            count={count}
            isSelected={selectedValues.includes(value)}
            isSingleSelect={isSingleSelect}
            onSingleSelectChange={onSingleSelectChange}
            onMultiSelectChange={onMultiSelectChange}
          />
        ))}
      </div>
    </fieldset>
  );
}

interface FilterOptionProps {
  fieldName: string;
  value: string;
  count?: number;
  isSelected: boolean;
  isSingleSelect: boolean;
  onSingleSelectChange: (fieldName: string, value: string) => void;
  onMultiSelectChange: (fieldName: string, value: string, checked: boolean) => void;
}

function FilterOption({
  fieldName,
  value,
  count,
  isSelected,
  isSingleSelect,
  onSingleSelectChange,
  onMultiSelectChange,
}: FilterOptionProps): React.JSX.Element {
  const inputId = `filter-${fieldName}-${value}`;

  if (isSingleSelect) {
    return (
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
      >
        <input
          id={inputId}
          type="radio"
          name={fieldName}
          checked={isSelected}
          onChange={() => onSingleSelectChange(fieldName, value)}
          className="h-4 w-4 border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500"
        />
        <span className="flex-1 text-gray-700">{value}</span>
        {count !== undefined && <span className="text-xs text-gray-400">({count})</span>}
      </label>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
    >
      <input
        id={inputId}
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onMultiSelectChange(fieldName, value, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500"
      />
      <span className="flex-1 text-gray-700">{value}</span>
      {count !== undefined && <span className="text-xs text-gray-400">({count})</span>}
    </label>
  );
}

/**
 * Determines the filter options to display for an attribute.
 * Uses allowedValues from the schema, enriched with counts from the API response.
 * If no allowedValues are defined but counts exist, uses the count keys as options.
 */
function getFilterOptions(
  attribute: AttributeDefinition,
  counts?: Record<string, number>,
): Array<{ value: string; count?: number }> {
  if (attribute.allowedValues && attribute.allowedValues.length > 0) {
    return attribute.allowedValues.map((value) => ({
      value,
      count: counts?.[value],
    }));
  }

  // If no allowedValues defined but we have counts from the API, use those
  if (counts) {
    return Object.entries(counts).map(([value, count]) => ({
      value,
      count,
    }));
  }

  return [];
}

function FilterPanelSkeleton(): React.JSX.Element {
  return (
    <aside className="w-full animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="border-b border-gray-200 pb-3">
        <div className="h-5 w-16 rounded bg-gray-200" />
      </div>
      <div className="space-y-4 py-4">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-full rounded bg-gray-100" />
          <div className="h-8 w-full rounded bg-gray-100" />
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2 border-t border-gray-100 py-4">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-6 w-full rounded bg-gray-100" />
            <div className="h-6 w-full rounded bg-gray-100" />
            <div className="h-6 w-full rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </aside>
  );
}
