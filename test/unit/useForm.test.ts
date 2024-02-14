import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { reactive, watch } from 'vue'
import { useForm } from '../../src/runtime/useForm'

const validationTimeout = 500

describe('test base useForm', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      reactive,
      watch,
      useRuntimeConfig: () => ({
        public: {
          nuxtZodForm: {
            validationTimeout,
          },
        },
      }),
    }))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(form).toHaveProperty('valid')
    expect(form).toHaveProperty('touched')
    expect(form).toHaveProperty('invalid')

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

    expect(form.valid()).toBe(false)
    expect(form.touched()).toBe(false)
    expect(form.invalid()).toBe(false)

    form.validate()
    await vi.advanceTimersByTimeAsync(validationTimeout)

    expect(form.valid()).toBe(true)
    expect(form.touched()).toBe(true)
    expect(form.invalid()).toBe(false)

    expect(form.error('name')).toBeUndefined()
    expect(form.valid('name')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    expect(form.touched('name')).toBe(true)

    expect(form.error('age')).toBeUndefined()
    expect(form.valid('age')).toBe(true)
    expect(form.invalid('age')).toBe(false)
    expect(form.touched('age')).toBe(true)

    expect(form.error('address.city')).toBeUndefined()
    expect(form.touched('address.city')).toBe(true)
    expect(form.valid('address.city')).toBe(true)
    expect(form.invalid('address.city')).toBe(false)

    expect(form.error('address.street')).toBeUndefined()
    expect(form.valid('address.street')).toBe(true)
    expect(form.invalid('address.street')).toBe(false)
    expect(form.touched('address.street')).toBe(true)

    expect(form.error('tags.0')).toBeUndefined()
    expect(form.valid('tags.0')).toBe(true)
    expect(form.invalid('tags.0')).toBe(false)
    expect(form.touched('tags.0')).toBe(true)

    expect(form.error('tags.1')).toBeUndefined()
    expect(form.valid('tags.1')).toBe(true)
    expect(form.invalid('tags.1')).toBe(false)
    expect(form.touched('tags.1')).toBe(true)
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

    expect(form.valid()).toBe(false)
    expect(form.touched()).toBe(false)

    expect(form.validate())
    await vi.advanceTimersByTimeAsync(validationTimeout)

    expect(form.touched()).toBe(true)
    expect(form.invalid()).toBe(true)

    expect(form.error('name')).toBeUndefined()
    expect(form.valid('name')).toBe(true)
    expect(form.invalid('name')).toBe(false)
    expect(form.touched('name')).toBe(true)

    expect(form.error('age')).toBe('This field cannot be less than 18')
    expect(form.valid('age')).toBe(false)
    expect(form.invalid('age')).toBe(true)
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

    expect(form.valid()).toBe(false)
    expect(form.touched()).toBe(false)

    form.validate('age')
    await vi.advanceTimersByTimeAsync(validationTimeout)
    expect(form.touched('age')).toBe(true)
    expect(form.invalid('age')).toBe(true)

    form.reset()

    expect(form.valid()).toBe(false)
    expect(form.touched()).toBe(false)
    expect(form.invalid()).toBe(false)

    form.age = 25
    form.validate('age')
    await vi.advanceTimersByTimeAsync(validationTimeout)

    expect(form.valid('age')).toBe(true)
    expect(form.touched('age')).toBe(true)
    expect(form.invalid('age')).toBe(false)
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

    await expect(() => form.submit()).rejects.toThrow('Invalid form')

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

    form.validate('age')

    await vi.advanceTimersByTimeAsync(validationTimeout)
    expect(form.touched('age')).toBe(true)
    expect(form.invalid('age')).toBe(true)

    form.forgetErrors('age')

    expect(form.touched('age')).toBe(false)
    expect(form.invalid('age')).toBe(false)
  })

  it('add validation keys at every validate request', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()).min(2, 'At least 2 tags are required'),
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

    form.validate('age')
    await vi.advanceTimersByTimeAsync(validationTimeout)

    expect(form.touched('age')).toBe(true)
    expect(form.invalid('age')).toBe(true)
    expect(form.touched('tags')).toBe(false)
    expect(form.invalid('tags')).toBe(false)

    form.tags = ['tag1']
    form.validate('tags.0')
    await vi.advanceTimersByTimeAsync(validationTimeout)

    expect(form.touched('age')).toBe(true)
    expect(form.invalid('age')).toBe(true)
    expect(form.touched('tags.0')).toBe(true)
    expect(form.invalid('tags.0')).toBe(false)
    expect(form.touched('tags')).toBe(false)
    expect(form.invalid('tags')).toBe(false)

    form.validate('tags')
    await vi.advanceTimersByTimeAsync(validationTimeout)

    expect(form.touched('tags')).toBe(true)
    expect(form.invalid('tags')).toBe(true)
  })

  it('can update validation timeout', async () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number().min(18, 'This field cannot be less than 18'),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
      tags: z.array(z.string()).min(2, 'At least 2 tags are required'),
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

    form.validationTimeout = 1000

    form.validate('age')

    await vi.advanceTimersByTimeAsync(1000)
    expect(form.touched('age')).toBe(true)
    expect(form.invalid('age')).toBe(true)

    form.reset()

    expect(form.touched('age')).toBe(false)
    expect(form.invalid('age')).toBe(false)

    form.validationTimeout = 2000

    await vi.advanceTimersByTimeAsync(1000)

    form.validate('age')

    await vi.advanceTimersByTimeAsync(1000)

    expect(form.touched('age')).toBe(false)
    expect(form.invalid('age')).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)

    expect(form.touched('age')).toBe(true)
    expect(form.invalid('age')).toBe(true)
  })
})

describe('test useForm submit behavior', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      reactive,
      watch,
      useRuntimeConfig: () => ({
        public: {
          nuxtZodForm: {
            validationTimeout,
          },
        },
      }),
    }))

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('set form processing after form validation pass on submit', async () => {
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
    expect(form.processing).toBe(false)

    await vi.runOnlyPendingTimersAsync()
    expect(count).toBe(1)
    expect(form.processing).toBe(false)
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
        return new Promise((resolve, reject) => {
          errorCount++
          reject(new Error('Submission failed again'))
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
