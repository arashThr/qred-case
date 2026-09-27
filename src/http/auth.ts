import type { RequestHandler } from 'express'
import type { Knex } from 'knex'
import { config } from '../config.js'
import {
  findMembershipRole,
  type MembershipRole,
} from '../modules/companies/companies.repo.js'
import { CompanyParams } from '../shared/schemas.js'
import { AppError } from './errors.js'

declare module 'express-serve-static-core' {
  interface Locals {
    userId: string
    // Set by requireMembership on /companies/:companyId routes.
    role: MembershipRole
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
    const role = await findMembershipRole(db, res.locals.userId, companyId)
    if (!role) {
      throw new AppError(
        403,
        'COMPANY_FORBIDDEN',
        'Not a member of this company',
      )
    }
    res.locals.role = role
    next()
  }
}
