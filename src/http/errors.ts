import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'
import type { ErrorCode, ErrorResponse } from '../shared/schemas.js'

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export const notFound: RequestHandler = () => {
  throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found')
}

// Express recognises error middleware by its four parameters, so _next must stay.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500
  let body: ErrorResponse = {
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  }

  if (err instanceof AppError) {
    status = err.status
    body = { error: { code: err.code, message: err.message } }
  } else if (err instanceof z.ZodError) {
    status = 400
    body = {
      error: { code: 'VALIDATION_ERROR', message: z.prettifyError(err) },
    }
  } else {
    console.error(err)
  }

  res.status(status).json(body)
}
