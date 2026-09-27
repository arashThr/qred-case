import { Router } from 'express'
import type { Knex } from 'knex'
import { CompanyParams } from '../../shared/schemas.js'
import { TransactionListQuery } from './transactions.schema.js'
import { listCompanyTransactions } from './transactions.service.js'

export function transactionsRouter(db: Knex): Router {
  const router = Router({ mergeParams: true })

  router.get('/', async (req, res) => {
    const { companyId } = CompanyParams.parse(req.params)
    const query = TransactionListQuery.parse(req.query)
    res.json(await listCompanyTransactions(db, companyId, query))
  })

  return router
}
