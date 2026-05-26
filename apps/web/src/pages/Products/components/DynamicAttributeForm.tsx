import type { AttributeDefinition, AttributeSchemaResponse } from '@blipzo/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { apiClient } from '../../../api/client';

import { FormFieldRenderer } from './FormFieldRenderer';

type DynamicAttributeValues = Record<string, string | number | boolean | string[]>;

interface DynamicAttributeFormProps {
  subcategoryId: string;
  defaultValues?: DynamicAttributeValues;
  onSubmit: (values: DynamicAttributeValues) => void;
  onSchemaLoaded?: (attributes: AttributeDefinition[]) => void;
}

async function fetchAttributeSchema(subcategoryId: string): Promise<AttributeSchemaResponse> {
  const response = await apiClient.get<AttributeSchemaResponse>(
    `/catalogue/categories/${subcategoryId}/schema`,
  );
  return response.data;
}

export function DynamicAttributeForm({
  subcategoryId,
  defaultValues,
  onSubmit,
  onSchemaLoaded,
}: DynamicAttributeFormProps): React.JSX.Element {
  const schemaQuery = useQuery({
    queryKey: ['attributeSchema', subcategoryId],
    queryFn: () => fetchAttributeSchema(subcategoryId),
    enabled: !!subcategoryId,
    staleTime: 1000 * 60 * 10,
  });

  const sortedAttributes = useMemo(() => {
    if (!schemaQuery.data?.attributes) return [];
    return [...schemaQuery.data.attributes].sort((a, b) => a.displayPriority - b.displayPriority);
  }, [schemaQuery.data?.attributes]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DynamicAttributeValues>({
    defaultValues: defaultValues ?? {},
  });

  // Reset form when schema changes or default values are provided
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Notify parent when schema is loaded
  useEffect(() => {
    if (sortedAttributes.length > 0 && onSchemaLoaded) {
      onSchemaLoaded(sortedAttributes);
    }
  }, [sortedAttributes, onSchemaLoaded]);

  // Register required multi-select and boolean fields with validation
  useEffect(() => {
    for (const attribute of sortedAttributes) {
      if (attribute.dataType === 'multi-select' && attribute.required) {
        register(attribute.fieldName, {
          validate: (value) => {
            const arr = value as string[] | undefined;
            if (!arr || arr.length === 0) {
              return `${attribute.displayLabel} is required`;
            }
            return true;
          },
        });
      }
    }
  }, [sortedAttributes, register]);

  function handleFormSubmit(values: DynamicAttributeValues): void {
    onSubmit(values);
  }

  if (schemaQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="h-5 w-5 animate-spin text-brand-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading attribute schema...</span>
        </div>
      </div>
    );
  }

  if (schemaQuery.isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Failed to load attribute schema for this subcategory. Please try again.
        </p>
      </div>
    );
  }

  if (sortedAttributes.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          No additional attributes are required for this subcategory.
        </p>
      </div>
    );
  }

  return (
    <form
      id="dynamic-attribute-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-5"
      noValidate
    >
      {sortedAttributes.map((attribute) => (
        <FormFieldRenderer
          key={attribute.fieldName}
          attribute={attribute}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
        />
      ))}

      <button
        type="submit"
        className="w-full rounded-md bg-brand-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );
}
