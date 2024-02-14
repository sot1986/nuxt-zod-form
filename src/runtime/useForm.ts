import type { z } from 'zod'
import debounce from 'lodash-es/debounce'
import type { ModuleOptions } from '../module'
import type { Form, NestedKeyOf } from './types'
import { getAllNestedKeys, makeValidator } from './validator'
import { reactive, useRuntimeConfig, watch } from '#imports'

export function useForm<TData extends object, Tresp>(
  schema: z.ZodType<TData> | (() => z.ZodType<TData>),
  init: Required<TData> | (() => Required<TData>),
  cb: (form: TData) => Promise<Tresp>,
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
      ? structuredClone(init())
      : structuredClone(init)
  }

  const validator = makeValidator(schema, options)

  const form = reactive<TData & Form<TData, Tresp>>({
    ...getInitialData(),
    data() {
      const data = {} as TData

      keys.forEach((key) => {
        data[key] = form[key]
      })

      return data
    },
    processing: false,
    validating: false,
    validationTimeout: (useRuntimeConfig().public.nuxtZodForm as ModuleOptions).validationTimeout,
    disabled: () => form.processing || form.validating,
    setData(data) {
      Object.assign(form, data)
    },
    validatedKeys: new Set<NestedKeyOf<TData>>(),
    errors: new Map<string, string>(),
    error(key) {
      if (key)
        return form.errors.get(key)

      const firstKey = Array.from(form.errors.keys()).at(0)
      if (firstKey)
        return form.errors.get(firstKey)

      return undefined
    },
    validate: (...keys) => {
      const fn = debounce(
        async () => {
          try {
            if (form.validating) {
              Promise.reject(new Error('Form already submitted for validation.'))
              return
            }

            if (keys.length) {
              await validateKeys(...keys)
              return
            }

            await validateForm()
          }
          catch (error) {
            console.error(error)
          }
        },
        form.validationTimeout,
        { trailing: true, leading: false },
      )
      return fn()
    },
    reset() {
      Object.assign(this, getInitialData())
      form.errors.clear()
      form.validatedKeys.clear()
    },
    async submit(o) {
      if (form.disabled())
        return Promise.reject(new Error('Form is currently disabled.'))

      try {
        const data = await validateForm()

        const onBefore = await (o?.onBefore?.(data) ?? true)

        if (!onBefore)
          return Promise.reject(new Error('Submission canceled'))

        form.processing = true

        const resp = await cb(data)

        if (o?.onSuccess)
          return o.onSuccess(resp, data)

        return resp
      }
      catch (error) {
        const e = error instanceof Error ? error : new Error('Invalid form')

        if (o?.onError)
          await o?.onError(e, form.data())

        return Promise.reject(e)
      }
      finally {
        form.processing = false
      }
    },
    valid: (...keys) => {
      if (!form.touched(...keys))
        return false

      if (keys.length === 0)
        return form.errors.size === 0

      return keys.reduce((acc, key) => acc && !form.errors.has(key), true)
    },
    invalid: (...keys) => {
      if (!form.touched(...keys))
        return false

      if (keys.length === 0)
        return form.errors.size > 0

      return keys.reduce((acc, key) => acc || form.errors.has(key), false)
    },
    touched: (...keys) => {
      if (keys.length === 0)
        return form.validatedKeys.size > 0

      return keys.reduce((acc, key) => acc && form.validatedKeys.has(key), true)
    },
    touch(...keys) {
      if (keys.length === 0) {
        getAllNestedKeys(form.data()).forEach(key => form.validatedKeys.add(key))
        return
      }

      keys.forEach(key => form.validatedKeys.add(key))
    },
    forgetErrors(...keys) {
      if (keys.length === 0) {
        form.errors.clear()
        form.validatedKeys.clear()
        return
      }

      keys.forEach((key) => {
        form.errors.delete(key)
        form.validatedKeys.delete(key)
      })
    },
  }) as TData & Form<TData, Tresp>

  async function validateForm(): Promise<TData> {
    try {
      form.validating = true
      form.forgetErrors()
      form.touch()

      const result = await validator.validate(form.data())

      if (result.success)
        return result.data

      for (const err of Object.entries<string>(result.errors)) {
        const key = err[0] as NestedKeyOf<TData>
        form.errors.set(key, err[1])
        form.validatedKeys.add(key)
      }

      return Promise.reject(options?.formErrorMessage ?? 'Invalid form data')
    }
    finally {
      form.validating = false
    }
  }

  async function validateKeys(...keys: (NestedKeyOf<TData>)[]): Promise<void> {
    try {
      form.validating = true
      const result = await validator.validate(form.data())
      form.forgetErrors(...keys)
      form.touch(...keys)

      if (result.success)
        return

      let hasError = false

      keys.forEach((key) => {
        form.validatedKeys.add(key)

        if (key in result.errors) {
          hasError = true
          form.errors.set(key, result.errors[key])
        }
      })

      if (hasError)
        return Promise.reject(new Error(options?.formErrorMessage ?? 'Invalid form data'))
    }
    finally {
      form.validating = false
    }
  }

  if (options?.resetOn)
    watch(options?.resetOn.watch, form.reset, options?.resetOn.options)

  return form
}
