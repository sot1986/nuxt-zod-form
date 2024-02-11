import type { z } from 'zod'
import type { ErrorResponseData, ErrorValidation, NestedKeyOf, ValidateOptions, ValidationResponseData, ValidationResult } from './types'

export function makeValidator<TData extends object>(
  schema: z.ZodSchema<TData> | (() => z.ZodSchema<TData>),
  options?: {
    formErrorMessage?: string
    additionalValidation?: (form: TData) => Promise<ValidationResult<TData>>
  },
) {
  const zodParser = makeZodParser(schema)

  async function validate(
    form: TData,
    validateOptions?: ValidateOptions<TData>,
  ): Promise<ValidationResponseData<TData>> {
    const zodResult = await zodParser.parse(form)

    if (!zodResult.success)
      return errorResponseData(zodResult, validateOptions?.keys, options)

    if (!options?.additionalValidation)
      return { success: true, data: zodResult.data }

    const additionalResult = await options.additionalValidation(form)

    if (!additionalResult.success)
      return errorResponseData(additionalResult, validateOptions?.keys, options)

    return { success: true, data: additionalResult.data }
  }

  return {
    validate,
  }
}

export function makeZodParser<TData extends object>(
  schema: z.ZodSchema<TData> | (() => z.ZodSchema<TData>),
): { parse: (form: TData) => Promise<ValidationResult<TData>> } {
  const s = typeof schema === 'function' ? schema() : schema

  return {
    parse: (form: TData) => {
      const result = s.safeParse(form)

      if (result.success) {
        return Promise.resolve({
          success: true,
          data: result.data,
        })
      }

      return Promise.resolve({
        success: false,
        errors: result.error.errors.map(err => ({
          path: err.path as NestedKeyOf<TData>[],
          message: err.message,
        })),

      })
    },
  }
}

export function errorResponseData<TData extends object>(
  result: ErrorValidation<TData>,
  keys?: NestedKeyOf<TData>[],
  options?: { formErrorMessage?: string },
): ErrorResponseData<TData> {
  const errors = new Map<NestedKeyOf<TData>, string>()
  const message = options?.formErrorMessage ?? 'Invalid form data'

  for (const err of result.errors) {
    const key = err.path.join('.') as NestedKeyOf<TData>

    if (keys && !keys.includes(key))
      continue

    errors.set(key, err.message)
  }

  const resp: ErrorResponseData<TData> = {
    success: false,
    errors: Object.fromEntries(errors.entries()) as Record<NestedKeyOf<TData>, string>,
    error: message,
  }

  if (keys?.length)
    resp.keys = keys

  return resp
}
