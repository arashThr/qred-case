import type { RequestHandler } from 'express'
import type { Knex } from 'knex'
import { isMember } from '../modules/companies/companies.repo.js'
import { CompanyParams } from '../shared/schemas.js'
import { AppError } from './errors.js'

declare module 'express-serve-static-core' {
  interface Locals {
    userId: string
  }
}

const DEMO_TOKEN = 'demo'
const DEMO_USER_ID = 'usr_1'

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.get('authorization') !== `Bearer ${DEMO_TOKEN}`) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Missing or invalid bearer token',
    )
  }
  res.locals.userId = DEMO_USER_ID
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
