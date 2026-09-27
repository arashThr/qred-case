import { Router } from 'express'
import type { Knex } from 'knex'
import { listCompanies } from './companies.service.js'

export function companiesRouter(db: Knex): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json(await listCompanies(db, res.locals.userId))
  })

  return router
}
