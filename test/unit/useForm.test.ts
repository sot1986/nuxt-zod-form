import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { reactive, watch } from 'vue'
import { useForm } from '../../src/runtime/useForm'

describe('test base useForm', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      reactive,
      watch,
    }))
  })

  it('form has all base keys of the schema', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number(),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    const form = useForm(UserSchema, {
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, () => Promise.resolve())

    expect(form).toHaveProperty('data')
    expect(form).toHaveProperty('setData')
    expect(form).toHaveProperty('validatedKeys')
    expect(form).toHaveProperty('errors', new Map())
    expect(form).toHaveProperty('error')
    expect(form).toHaveProperty('validate')
    expect(form).toHaveProperty('reset')
    expect(form).toHaveProperty('submit')
    expect(form).toHaveProperty('isValid')
    expect(form).toHaveProperty('isTouched')
    expect(form).toHaveProperty('isInvalid')

    expect(form).toHaveProperty('name', 'John')
    expect(form).toHaveProperty('age', 25)
    expect(form).toHaveProperty('address', {
      city: 'New York',
      street: '5th Ave',
    })
    expect(form).toHaveProperty('tags', ['tag1', 'tag2'])
  })

  it('pass the validation when all fields are valid', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number(),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    const form = useForm(UserSchema, {
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, () => Promise.resolve())

    expect(form.isValid()).toBe(false)
    expect(form.isTouched()).toBe(false)
    expect(form.isInvalid()).toBe(false)

    form.validate()

    expect(form.isValid()).toBe(true)
    expect(form.isTouched()).toBe(true)
    expect(form.isInvalid()).toBe(false)

    expect(form.error('name')).toBeUndefined()
    expect(form.isValid('name')).toBe(true)
    expect(form.isInvalid('name')).toBe(false)
    expect(form.isTouched('name')).toBe(true)

    expect(form.error('age')).toBeUndefined()
    expect(form.isValid('age')).toBe(true)
    expect(form.isInvalid('age')).toBe(false)
    expect(form.isTouched('age')).toBe(true)

    expect(form.error('address.city')).toBeUndefined()
    expect(form.isTouched('address.city')).toBe(true)
    expect(form.isValid('address.city')).toBe(true)
    expect(form.isInvalid('address.city')).toBe(false)

    expect(form.error('address.street')).toBeUndefined()
    expect(form.isValid('address.street')).toBe(true)
    expect(form.isInvalid('address.street')).toBe(false)
    expect(form.isTouched('address.street')).toBe(true)

    expect(form.error('tags.0')).toBeUndefined()
    expect(form.isValid('tags.0')).toBe(true)
    expect(form.isInvalid('tags.0')).toBe(false)
    expect(form.isTouched('tags.0')).toBe(true)

    expect(form.error('tags.1')).toBeUndefined()
    expect(form.isValid('tags.1')).toBe(true)
    expect(form.isInvalid('tags.1')).toBe(false)
    expect(form.isTouched('tags.1')).toBe(true)
  })

  it('fail the validation when some fields are invalid', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    const form = useForm(UserSchema, {
      name: 'John',
      age: 10,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, () => Promise.resolve())

    expect(form.isValid()).toBe(false)
    expect(form.isTouched()).toBe(false)

    expect(() => form.validate()).toThrow()
    expect(form.isTouched()).toBe(true)
    expect(form.isInvalid()).toBe(true)

    expect(form.error('name')).toBeUndefined()
    expect(form.isValid('name')).toBe(true)
    expect(form.isInvalid('name')).toBe(false)
    expect(form.isTouched('name')).toBe(true)

    expect(form.error('age')).toBe('This field cannot be less than 18')
    expect(form.isValid('age')).toBe(false)
    expect(form.isInvalid('age')).toBe(true)
  })

  it('reset the form', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    const form = useForm(UserSchema, {
      name: 'John',
      age: 10,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, () => Promise.resolve())

    expect(form.isValid()).toBe(false)
    expect(form.isTouched()).toBe(false)

    expect(() => form.validate('age')).toThrow()
    expect(form.isTouched('age')).toBe(true)
    expect(form.isInvalid('age')).toBe(true)

    form.reset()

    expect(form.isValid()).toBe(false)
    expect(form.isTouched()).toBe(false)
    expect(form.isInvalid()).toBe(false)

    form.age = 25
    form.validate('age')

    expect(form.isValid('age')).toBe(true)
    expect(form.isTouched('age')).toBe(true)
    expect(form.isInvalid('age')).toBe(false)
  })

  it('submit the form', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    const form = useForm(UserSchema, {
      name: 'John',
      age: 10,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, data => Promise.resolve(data))

    await expect (() => form.submit()).rejects.toThrowError('Invalid form data')

    form.age = 25
    expect(await form.submit()).toEqual({
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    })
  })

  it('can forget errors', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    const form = useForm(UserSchema, {
      name: 'John',
      age: 10,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, () => Promise.resolve())

    expect(() => form.validate('age')).toThrow()
    expect(form.isTouched('age')).toBe(true)
    expect(form.isInvalid('age')).toBe(true)

    form.forgetErrors('age')

    expect(form.isTouched('age')).toBe(false)
    expect(form.isInvalid('age')).toBe(false)
  })
})

describe('test useForm submit behavior', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      reactive,
      watch,
    }))

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('set form submitting after form validation pass on submit', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    let count = 0

    const form = useForm(UserSchema, {
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, (data) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          count++
          resolve(data)
        }, 1000)
      })
    })

    form.submit()
    expect(count).toBe(0)
    vi.runAllTicks()
    expect(form.submitting).toBe(false)

    await vi.runOnlyPendingTimersAsync()
    expect(count).toBe(1)
    expect(form.submitting).toBe(false)
  })

  it('wait on before submit to resolve before submit', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    let count = 0

    const form = useForm(UserSchema, {
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, (data) => {
      return new Promise((resolve) => {
        count++
        resolve(data)
      })
    })

    await expect(() => form.submit({
      onBefore: () => Promise.resolve(false),
    })).rejects.toThrowError('Submission canceled')

    expect(count).toBe(0)
  })

  it('runs onError when submit fails', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    let count = 0
    let errorCount = 0

    const form = useForm(UserSchema, {
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, () => {
      return new Promise((resolve, reject) => {
        count++
        reject(new Error('Submission failed'))
      })
    })

    await expect(() => form.submit({
      onError: (_error) => {
        return new Promise((resolve) => {
          errorCount++
          resolve(new Error('Submission failed again'))
        })
      },
    })).rejects.toThrowError('Submission failed again')

    expect(count).toBe(1)
    expect(errorCount).toBe(1)
  })

  it('runs onSuccess when submit success', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()),
    })

    let count = 0

    const form = useForm(UserSchema, {
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    }, () => {
      return new Promise((resolve) => {
        count++
        resolve({
          name: 'John',
          age: 25,
          address: {
            city: 'New York',
            street: '5th Ave',
          },
          tags: ['tag1', 'tag2'],
        })
      })
    })

    await expect(form.submit({
      onSuccess: (resp) => {
        return new Promise((resolve) => {
          count++
          resolve(resp)
        })
      },
    })).resolves.toEqual({
      name: 'John',
      age: 25,
      address: {
        city: 'New York',
        street: '5th Ave',
      },
      tags: ['tag1', 'tag2'],
    })

    expect(count).toBe(2)
  })
})
