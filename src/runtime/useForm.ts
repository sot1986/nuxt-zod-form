import type { z } from 'zod'
import type { Form, NestedKeyOf } from './types'
import { reactive, watch } from '#imports'

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
      ? JSON.parse(JSON.stringify(init()))
      : JSON.parse(JSON.stringify(init))
  }

  const form: TData & Form<TData, Tresp> = reactive({
    ...getInitialData(),
    data() {
      const data = {} as TData

      keys.forEach((key) => {
        data[key] = form[key]
      })

      return data
    },
    submitting: false,
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
    async submit(o) {
      if (form.submitting)
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject(undefined)

      try {
        const data = form.validate()

        const onBefore = await (o?.onBefore?.(data) ?? Promise.resolve(true))

        if (!onBefore)
          return Promise.reject(new Error('Submission canceled'))

        form.submitting = true

        const resp = await cb(data)

        if (o?.onSuccess)
          return o.onSuccess(resp, data)

        return resp
      }
      catch (error) {
        let e = error instanceof Error ? error : new Error('Invalid form data')

        if (o?.onError)
          e = await o.onError(e, form.data())

        return Promise.reject(e)
      }
      finally {
        form.submitting = false
      }
    },
    isValid: (...keys) => {
      if (!form.isTouched(...keys))
        return false

      if (keys.length === 0)
        return form.errors.size === 0

      return keys.reduce((acc, key) => acc && !form.errors.has(key), true)
    },
    isInvalid: (...keys) => {
      if (!form.isTouched(...keys))
        return false

      if (keys.length === 0)
        return form.errors.size > 0

      return keys.reduce((acc, key) => acc || form.errors.has(key), false)
    },
    isTouched: (...keys) => {
      if (keys.length === 0)
        return form.validatedKeys.size > 0

      return keys.reduce((acc, key) => acc && form.validatedKeys.has(key), true)
    },
    touch(...keys) {
      if (keys.length === 0) {
        touchAll(form.data())
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

  function touchAll(obj: object, prefix?: string) {
    Object.keys(obj).forEach((key) => {
      const path = (prefix ? `${prefix}.${key}` : key) as NestedKeyOf<TData>
      form.touch(path)

      const value = obj[key as keyof typeof obj]

      if (typeof value === 'object' && value !== null)
        touchAll(value, path)
    })
  }

  function validateForm(): TData {
    form.forgetErrors()
    form.touch()

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
    form.forgetErrors(...keys)
    form.touch(...keys)

    const result = typeof schema === 'function'
      ? schema().safeParse(data)
      : schema.safeParse(data)

    if (result.success)
      return result.data

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

  return form
}
