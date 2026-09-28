'use client'

import * as React from 'react'
import { Controller } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

export function FormField({
  form,
  name,
  label,
  description,
  placeholder,
  type = 'input',
  selectOptions = [],
  disabled,
  className,
  inputClassName,
  errorClassName,
  rules,
  ...props
}) {
  const { control, formState: { errors }, setValue } = form
  const error = errors[name]

  const renderField = (field) => {
    const { field: { onChange, onBlur, value, ref, name: fieldName }, fieldState: { invalid } } = field

    const commonProps = {
      id: fieldName,
      disabled,
      'aria-invalid': invalid,
      'aria-describedby': error ? `${fieldName}-error` : description ? `${fieldName}-description` : undefined,
      onChange: (e) => {
        const val = e?.target?.value ?? e
        onChange(val)
        setValue(fieldName, val, { shouldValidate: true })
      },
      onBlur,
      ref,
    }

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value || ''}
            placeholder={placeholder}
            error={error?.message}
            className={inputClassName}
          />
        )
      case 'select':
        return (
          <Select
            {...commonProps}
            value={value || ''}
            onValueChange={(val) => {
              onChange(val)
              setValue(fieldName, val, { shouldValidate: true })
            }}
            error={error?.message}
            className={inputClassName}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return (
          <Input
            {...commonProps}
            type={props.type || 'text'}
            value={value || ''}
            placeholder={placeholder}
            error={error?.message}
            className={inputClassName}
          />
        )
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={renderField}
      />
      {description && !error && (
        <p id={`${name}-description`} className="text-sm text-gray-500">
          {description}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className={cn('text-sm text-danger', errorClassName)} role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default FormField