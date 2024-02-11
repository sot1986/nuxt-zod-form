import type {
  EventHandler,
  EventHandlerObject,
  EventHandlerRequest,
  H3Event,
  _RequestMiddleware,
} from 'h3'
import { setResponseHeader } from 'h3'
import { ZodError } from 'zod'
import { createError, setResponseStatus } from '#imports'

export function definePrecognitiveEventHandler<T extends EventHandlerRequest, D>(
  handler: EventHandlerObject<T, D>,
) {
  return defineEventHandler({
    onRequest: onPrecognitiveRequest(handler.onRequest),
    handler: onPrecognitiveHandler(handler.handler),
    onBeforeResponse: handler.onBeforeResponse,
  })
}

function onPrecognitiveRequest<T extends EventHandlerRequest>(
  onRequest: _RequestMiddleware<T> | _RequestMiddleware<T>[] | undefined,
) {
  if (!onRequest)
    return undefined

  if (typeof onRequest === 'function')
    return onPrecognitiveRequestWrapper(onRequest)

  return onRequest.map(middleware => onPrecognitiveRequestWrapper(middleware))
}

function onPrecognitiveRequestWrapper<T extends EventHandlerRequest>(
  middleware: _RequestMiddleware<T>,
): _RequestMiddleware<T> {
  return async (event) => {
    try {
      await middleware(event)
    }
    catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, event)
        return
      }

      throw error
    }
  }
}

export function handleZodError<T extends EventHandlerRequest>(
  error: ZodError,
  event: H3Event<T>,
) {
  if (event.headers.get('Precognitive') !== 'true') {
    setResponseHeader(event, 'Content-Type', 'application/json')
    throwZodError(error)
  }

  setResponseHeader(event, 'Precognitive', 'true')
  const precognitiveKeysHeader = event.headers.get('Precognitive-Keys')

  if (!precognitiveKeysHeader) {
    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseHeader(event, 'Precognitive-success', 'false')
    throwZodError(error)
  }

  setResponseHeader(event, 'Precognitive-keys', precognitiveKeysHeader)
  const precognitiveKeys = precognitiveKeysHeader.split(',')
  const errors = error.errors.filter(e => precognitiveKeys.some(k => e.path.includes(k)))

  if (errors.length) {
    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseHeader(event, 'Precognitive-success', 'false')
    throwZodError(new ZodError(errors))
  }
}

function onPrecognitiveHandler<T extends EventHandlerRequest, D>(
  handler: EventHandler<T, D>,
): EventHandler<T, D> {
  return (event) => {
    if (event.headers.get('Precognitive') !== 'true')
      return handler(event)

    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseHeader(event, 'Precognitive', 'true')
    setResponseHeader(event, 'Precognitive-success', 'true')
    setResponseStatus(event, 204)
    return null as unknown as D
  }
}

export function throwZodError(error: ZodError): never {
  const message = error.errors.at(0)?.message ?? 'Validation error'

  throw createError({
    statusCode: 422,
    data: JSON.stringify({
      errors: error.flatten().fieldErrors,
      error: message,
    }),
    message,
  })
}
