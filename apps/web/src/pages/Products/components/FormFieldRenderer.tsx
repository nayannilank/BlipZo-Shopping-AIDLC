import type { AttributeDefinition } from '@blipzo/shared';
import { useState } from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';

type DynamicAttributeValues = Record<string, string | number | boolean | string[]>;

interface FormFieldRendererProps {
  attribute: AttributeDefinition;
  register: UseFormRegister<DynamicAttributeValues>;
  errors: FieldErrors<DynamicAttributeValues>;
  setValue: UseFormSetValue<DynamicAttributeValues>;
  watch: UseFormWatch<DynamicAttributeValues>;
}

const baseInputClassName =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500';

const errorInputClassName =
  'mt-1 block w-full rounded-md border border-red-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500';

function getErrorMessage(
  errors: FieldErrors<DynamicAttributeValues>,
  fieldName: string,
): string | undefined {
  const error = errors[fieldName];
  if (!error) return undefined;
  return error.message as string | undefined;
}

function TextInput({
  attribute,
  register,
  errors,
}: Omit<FormFieldRendererProps, 'setValue' | 'watch'>): React.JSX.Element {
  const errorMessage = getErrorMessage(errors, attribute.fieldName);

  return (
    <input
      id={attribute.fieldName}
      type="text"
      {...register(attribute.fieldName, {
        required: attribute.required ? `${attribute.displayLabel} is required` : false,
      })}
      className={errorMessage ? errorInputClassName : baseInputClassName}
      placeholder={`Enter ${attribute.displayLabel.toLowerCase()}`}
      aria-invalid={!!errorMessage}
      aria-describedby={errorMessage ? `${attribute.fieldName}-error` : undefined}
    />
  );
}

function NumberInput({
  attribute,
  register,
  errors,
}: Omit<FormFieldRendererProps, 'setValue' | 'watch'>): React.JSX.Element {
  const errorMessage = getErrorMessage(errors, attribute.fieldName);

  return (
    <input
      id={attribute.fieldName}
      type="number"
      {...register(attribute.fieldName, {
        required: attribute.required ? `${attribute.displayLabel} is required` : false,
        valueAsNumber: true,
      })}
      className={errorMessage ? errorInputClassName : baseInputClassName}
      placeholder={`Enter ${attribute.displayLabel.toLowerCase()}`}
      aria-invalid={!!errorMessage}
      aria-describedby={errorMessage ? `${attribute.fieldName}-error` : undefined}
    />
  );
}

function SingleSelectInput({
  attribute,
  register,
  errors,
}: Omit<FormFieldRendererProps, 'setValue' | 'watch'>): React.JSX.Element {
  const errorMessage = getErrorMessage(errors, attribute.fieldName);

  return (
    <select
      id={attribute.fieldName}
      {...register(attribute.fieldName, {
        required: attribute.required ? `${attribute.displayLabel} is required` : false,
      })}
      className={errorMessage ? errorInputClassName : baseInputClassName}
      aria-invalid={!!errorMessage}
      aria-describedby={errorMessage ? `${attribute.fieldName}-error` : undefined}
    >
      <option value="">Select {attribute.displayLabel.toLowerCase()}</option>
      {attribute.allowedValues?.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </select>
  );
}

function MultiSelectInput({
  attribute,
  errors,
  setValue,
  watch,
}: Omit<FormFieldRendererProps, 'register'>): React.JSX.Element {
  const errorMessage = getErrorMessage(errors, attribute.fieldName);
  const selectedValues = (watch(attribute.fieldName) as string[] | undefined) ?? [];
  const [inputValue, setInputValue] = useState('');

  function handleCheckboxChange(value: string, checked: boolean): void {
    const updated = checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value);
    setValue(attribute.fieldName, updated, { shouldValidate: true });
  }

  function handleTagAdd(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || selectedValues.includes(trimmed)) {
      setInputValue('');
      return;
    }
    setValue(attribute.fieldName, [...selectedValues, trimmed], { shouldValidate: true });
    setInputValue('');
  }

  function handleTagRemove(value: string): void {
    const updated = selectedValues.filter((v) => v !== value);
    setValue(attribute.fieldName, updated, { shouldValidate: true });
  }

  // If allowedValues are defined, render checkboxes
  if (attribute.allowedValues && attribute.allowedValues.length > 0) {
    return (
      <div
        role="group"
        aria-labelledby={`${attribute.fieldName}-label`}
        aria-invalid={!!errorMessage}
        aria-describedby={errorMessage ? `${attribute.fieldName}-error` : undefined}
      >
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attribute.allowedValues.map((value) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(value)}
                onChange={(e) => handleCheckboxChange(value, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500"
              />
              <span className="text-gray-700">{value}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // If no allowedValues, render a tag input for free-form multi-select
  return (
    <div
      aria-invalid={!!errorMessage}
      aria-describedby={errorMessage ? `${attribute.fieldName}-error` : undefined}
    >
      <div className="mt-1 flex flex-wrap gap-1.5 rounded-md border border-gray-300 px-3 py-2">
        {selectedValues.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-brand-blue-50 px-2.5 py-0.5 text-xs font-medium text-brand-blue-700"
          >
            {value}
            <button
              type="button"
              onClick={() => handleTagRemove(value)}
              className="ml-0.5 text-brand-blue-500 hover:text-brand-blue-700"
              aria-label={`Remove ${value}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={attribute.fieldName}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleTagAdd}
          className="min-w-[120px] flex-1 border-none p-0 text-sm focus:outline-none focus:ring-0"
          placeholder={
            selectedValues.length === 0
              ? `Add ${attribute.displayLabel.toLowerCase()}...`
              : 'Add more...'
          }
        />
      </div>
    </div>
  );
}

function BooleanInput({
  attribute,
  errors,
  setValue,
  watch,
}: Omit<FormFieldRendererProps, 'register'>): React.JSX.Element {
  const errorMessage = getErrorMessage(errors, attribute.fieldName);
  const value = (watch(attribute.fieldName) as boolean | undefined) ?? false;

  function handleToggle(): void {
    setValue(attribute.fieldName, !value, { shouldValidate: true });
  }

  return (
    <div
      className="mt-1 flex items-center"
      aria-invalid={!!errorMessage}
      aria-describedby={errorMessage ? `${attribute.fieldName}-error` : undefined}
    >
      <button
        id={attribute.fieldName}
        type="button"
        role="switch"
        aria-checked={value}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 ${
          value ? 'bg-brand-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="ml-3 text-sm text-gray-700">{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

export function FormFieldRenderer({
  attribute,
  register,
  errors,
  setValue,
  watch,
}: FormFieldRendererProps): React.JSX.Element {
  const errorMessage = getErrorMessage(errors, attribute.fieldName);

  return (
    <div>
      <label
        id={`${attribute.fieldName}-label`}
        htmlFor={attribute.fieldName}
        className="block text-sm font-medium text-gray-700"
      >
        {attribute.displayLabel}
        {attribute.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {attribute.dataType === 'text' && (
        <TextInput attribute={attribute} register={register} errors={errors} />
      )}
      {attribute.dataType === 'number' && (
        <NumberInput attribute={attribute} register={register} errors={errors} />
      )}
      {attribute.dataType === 'single-select' && (
        <SingleSelectInput attribute={attribute} register={register} errors={errors} />
      )}
      {attribute.dataType === 'multi-select' && (
        <MultiSelectInput attribute={attribute} errors={errors} setValue={setValue} watch={watch} />
      )}
      {attribute.dataType === 'boolean' && (
        <BooleanInput attribute={attribute} errors={errors} setValue={setValue} watch={watch} />
      )}

      {errorMessage && (
        <p id={`${attribute.fieldName}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
