import type { z } from 'zod'
import type { Form, NestedKeyOf } from './types'
import { reactive, watch } from '#imports'

export function useForm<TData extends object, Tresp>(
  schema: z.ZodType<TData> | (() => z.ZodType<TData>),
  init: Required<TData> | (() => Required<TData>),
  cb: (form: TData) => Tresp,
  options?: {
    formErrorMessage?: string
    resetOn?: {
      watch: Parameters<typeof watch>[0]
      options?: Parameters<typeof watch>[2]
    }
  },
): TData & Form<TData, Tresp> {
  const keys: (keyof TData)[] = typeof init === 'function'
    ? Object.keys(init()) as any
    : Object.keys(init) as any

  function getInitialData(): TData {
    return typeof init === 'function'
      ? JSON.parse(JSON.stringify(init()))
      : JSON.parse(JSON.stringify(init))
  }

  const form: TData & Form<TData, Tresp> = {
    ...getInitialData(),
    data() {
      const data = {} as TData

      keys.forEach((key) => {
        data[key] = form[key]
      })

      return data
    },
    setData(data) {
      Object.assign(this, data)
    },
    validatedKeys: new Set<NestedKeyOf<TData>>(),
    errors: new Map<NestedKeyOf<TData>, string>(),
    error(key) {
      return form.errors.get(key)
    },
    validate(...keys) {
      if (!keys.length)
        return validateForm()

      validateKeys(...keys)

      return form.data()
    },
    reset() {
      Object.assign(this, getInitialData())
      form.errors.clear()
      form.validatedKeys.clear()
    },
    submit() {
      const data = form.validate()

      return cb(data)
    },
    isValid: (...keys) => {
      if (keys.length === 0)
        return form.errors.size === 0

      for (const key of keys) {
        if (form.errors.has(key))
          return false
      }
      return true
    },
    isDirty: (...keys) => {
      if (keys.length === 0)
        return form.validatedKeys.size > 0

      let check = true

      for (const key of keys) {
        if (!check)
          break

        if (!form.validatedKeys.has(key))
          check = false
      }

      return check
    },
  }

  function validateForm(): TData {
    form.errors.clear()
    form.validatedKeys.clear()

    const result = typeof schema === 'function'
      ? schema().safeParse(form.data())
      : schema.safeParse(form.data())

    if (result.success)
      return result.data

    if ('error' in result) {
      for (const err of result.error.errors) {
        const key = err.path.join('.') as NestedKeyOf<TData>
        form.errors.set(key, err.message)
        form.validatedKeys.add(key)
      }
    }

    throw new Error(options?.formErrorMessage ?? 'Invalid form data')
  }

  function validateKeys(...keys: (NestedKeyOf<TData>)[]) {
    const data = form.data()

    const result = typeof schema === 'function'
      ? schema().safeParse(data)
      : schema.safeParse(data)

    if (result.success) {
      keys.forEach((key) => {
        form.validatedKeys.add(key)
        form.errors.clear()
      })

      return result.data
    }

    if ('error' in result) {
      let hasError = false

      keys.forEach((key) => {
        const err = result.error.errors.find(e => e.path.join('.') === key)
        form.validatedKeys.add(key)

        if (err) {
          hasError = true
          form.errors.set(key, err.message)

          return
        }

        form.errors.delete(key)
      })

      form.validatedKeys.forEach((key) => {
        if (key in keys)
          return

        const err = result.error.errors.find(e => e.path.join('.') === key)

        if (err) {
          hasError = true
          form.errors.set(key, err.message)
          return
        }

        form.errors.delete(key)
      })

      if (hasError)
        throw new Error(options?.formErrorMessage ?? 'Invalid form data')
    }
  }

  if (options?.resetOn)
    watch(options?.resetOn.watch, form.reset, options?.resetOn.options)

  return reactive(form) as any
}
