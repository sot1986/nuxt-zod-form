import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { H3Error, H3Event, createError, setResponseHeader, setResponseStatus } from 'h3'
import { handleZodError, throwZodError } from '../../src/runtime/definePrecognitiveEventHandler'

describe('test throwZodError', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      createError,
      setResponseHeader,
      setResponseStatus,
    }))
  })

  it ('throws a validation error, with error message and errors', () => {
    const data = {
      name: null,
      age: 15,
    }

    const schema = z.object({
      name: z.string().min(3),
      age: z.number().min(18),
    })

    try {
      schema.parse(data)

      expect(false).toBe(true)
    }
    catch (error) {
      expect(error).instanceOf(z.ZodError)

      if (error instanceof z.ZodError) {
        try {
          throwZodError(error)
        }
        catch (error) {
          expect(error).instanceOf(H3Error)

          if (error instanceof H3Error) {
            expect(error.message).toBe('Expected string, received null')
            expect(error.data).toBeTypeOf('string')
            expect(error.statusCode).toBe(422)

            const data = JSON.parse(error.data)

            expect(data.error).toBe('Expected string, received null')
            expect(data.errors).toBeTypeOf('object')
            expect(data.errors.name).toEqual(['Expected string, received null'])
            expect(data.errors.age).toEqual(['Number must be greater than or equal to 18'])

            return
          }
          expect(false).toBe(true)
        }
        return
      }
      expect(false).toBe(true)
    }
  })
})

function mockEvent(customizeReq?: (req: IncomingMessage) => void) {
  const socket = new Socket()
  const req = new IncomingMessage(socket)

  if (customizeReq)
    customizeReq(req)

  const resp = new ServerResponse(req)
  return {
    event: new H3Event(req, resp),
    req,
    resp,
  }
}

describe('test handleZodError', () => {
  beforeEach(() => {
    vi.mock('#imports', () => ({
      createError,
    }))
  })

  it('thows equivalent H3Error if Precognitive header is not set', () => {
    const error = new z.ZodError([
      { path: ['name'], message: 'Expected string, received null', code: 'invalid_type', expected: 'string', received: 'null' },
      { path: ['age'], message: 'Number must be greater than or equal to 18', code: 'too_small', minimum: 18, type: 'number', inclusive: true },
    ])

    const { event, resp } = mockEvent()

    try {
      handleZodError(error, event)

      expect(false).toBe(true)
    }
    catch (error1) {
      expect(resp.getHeader('Content-Type')).toBe('application/json')
      expect(error1).toBeInstanceOf(H3Error)

      if (error1 instanceof H3Error) {
        expect(error1.message).toBe('Expected string, received null')
        expect(error1.data).toBeTypeOf('string')
        expect(error1.statusCode).toBe(422)

        const data = JSON.parse(error1.data)

        expect(data.error).toBe('Expected string, received null')
        expect(data.errors).toBeTypeOf('object')
        expect(data.errors.name).toEqual(['Expected string, received null'])
        expect(data.errors.age).toEqual(['Number must be greater than or equal to 18'])
      }
    }
  })

  it ('add Precognitive headers to response and throw equivalent error', () => {
    const error = new z.ZodError([
      { path: ['name'], message: 'Expected string, received null', code: 'invalid_type', expected: 'string', received: 'null' },
      { path: ['age'], message: 'Number must be greater than or equal to 18', code: 'too_small', minimum: 18, type: 'number', inclusive: true },
    ])

    const { event, resp } = mockEvent((req) => {
      req.headers.Precognitive = 'true'
    })

    try {
      handleZodError(error, event)
    }
    catch (error1) {
      expect(resp.getHeader('Content-Type')).toBe('application/json')
      expect(resp.getHeader('Precognitive')).toBe('true')
      expect(resp.getHeader('Precognitive-success')).toBe('false')

      expect(error1).toBeInstanceOf(H3Error)

      if (error1 instanceof H3Error) {
        expect(error1.message).toBe('Expected string, received null')
        expect(error1.data).toBeTypeOf('string')
        expect(error1.statusCode).toBe(422)

        const data = JSON.parse(error1.data)

        expect(data.error).toBe('Expected string, received null')
        expect(data.errors).toBeTypeOf('object')
        expect(data.errors.name).toEqual(['Expected string, received null'])
        expect(data.errors.age).toEqual(['Number must be greater than or equal to 18'])
      }
    }
  })

  it('limits errors to precognitive keys', () => {
    const error = new z.ZodError([
      { path: ['name'], message: 'Expected string, received null', code: 'invalid_type', expected: 'string', received: 'null' },
      { path: ['age'], message: 'Number must be greater than or equal to 18', code: 'too_small', minimum: 18, type: 'number', inclusive: true },
    ])

    const { event, resp } = mockEvent((req) => {
      req.headers.Precognitive = 'true'
      req.headers['Precognitive-Keys'] = 'name'
    })

    try {
      handleZodError(error, event)
    }
    catch (error1) {
      expect(resp.getHeader('Content-Type')).toBe('application/json')
      expect(resp.getHeader('Precognitive')).toBe('true')
      expect(resp.getHeader('Precognitive-success')).toBe('false')
      expect(resp.getHeader('Precognitive-keys')).toBe('name')

      expect(error1).toBeInstanceOf(H3Error)

      if (error1 instanceof H3Error) {
        expect(error1.message).toBe('Expected string, received null')
        expect(error1.data).toBeTypeOf('string')
        expect(error1.statusCode).toBe(422)

        const data = JSON.parse(error1.data)

        expect(data.error).toBe('Expected string, received null')
        expect(data.errors).toBeTypeOf('object')
        expect(data.errors.name).toEqual(['Expected string, received null'])

        expect(data.errors.age).toBeUndefined()
      }
    }
  })

  it.each([
    { keys: 'email' },
    { keys: 'hobbies.1' },
    { keys: 'email,hobbies.2' },
  ]) ('prevent error to be thown if error does not contain precognitive keys', ({ keys }) => {
    const error = new z.ZodError([
      { path: ['name'], message: 'Expected string, received null', code: 'invalid_type', expected: 'string', received: 'null' },
      { path: ['age'], message: 'Number must be greater than or equal to 18', code: 'too_small', minimum: 18, type: 'number', inclusive: true },
      { path: ['hobbies', 0], message: 'Expected string, received null', code: 'invalid_type', expected: 'string', received: 'null' },
    ])

    const { event } = mockEvent((req) => {
      req.headers.Precognitive = 'true'
      req.headers['Precognitive-Keys'] = keys
    })

    handleZodError(error, event)
  })
})
