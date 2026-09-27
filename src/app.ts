import express, { Router } from 'express'
import type { Knex } from 'knex'
import { db, pingDb } from './db/knex.js'
import { requireAuth, requireMembership } from './http/auth.js'
import { errorHandler, notFound } from './http/errors.js'
import { cardsRouter } from './modules/cards/cards.routes.js'
import { companiesRouter } from './modules/companies/companies.routes.js'
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { invoicesRouter } from './modules/invoices/invoices.routes.js'
import { transactionsRouter } from './modules/transactions/transactions.routes.js'

export function createApp(client: Knex = db) {
  const app = express()
  app.disable('x-powered-by')

  app.get('/health', async (_req, res) => {
    try {
      await pingDb(client)
      res.json({ status: 'ok', db: 'up' })
    } catch (err) {
      res.status(503).json({
        status: 'error',
        db: 'down',
        message: err instanceof Error ? err.message : 'db ping failed',
      })
    }
  })

  const company = Router({ mergeParams: true })
  company.use(requireMembership(client))
  company.use('/dashboard', dashboardRouter(client))
  company.use('/cards', cardsRouter(client))
  company.use('/invoices', invoicesRouter(client))
  company.use('/transactions', transactionsRouter(client))

  const api = Router()
  api.use(requireAuth)
  api.use('/companies', companiesRouter(client))
  api.use('/companies/:companyId', company)

  app.use('/api/v1', api)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
