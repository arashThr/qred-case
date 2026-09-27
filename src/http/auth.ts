import type { RequestHandler } from 'express'
import type { Knex } from 'knex'
import { config } from '../config.js'
import { isMember } from '../modules/companies/companies.repo.js'
import { CompanyParams } from '../shared/schemas.js'
import { AppError } from './errors.js'

declare module 'express-serve-static-core' {
  interface Locals {
    userId: string
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.get('authorization') !== `Bearer ${config.demoAuth.token}`) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Missing or invalid bearer token',
    )
  }
  res.locals.userId = config.demoAuth.userId
  next()
}

export function requireMembership(db: Knex): RequestHandler {
  return async (req, res, next) => {
    const { companyId } = CompanyParams.parse(req.params)
    if (!(await isMember(db, res.locals.userId, companyId))) {
      throw new AppError(
        403,
        'COMPANY_FORBIDDEN',
        'Not a member of this company',
      )
    }
    next()
  }
}
