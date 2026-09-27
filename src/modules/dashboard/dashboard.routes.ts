import { Router } from 'express'
import type { Knex } from 'knex'
import { CompanyParams } from '../../shared/schemas.js'
import { getDashboard } from './dashboard.service.js'

export function dashboardRouter(db: Knex): Router {
  const router = Router({ mergeParams: true })

  router.get('/', async (req, res) => {
    const { companyId } = CompanyParams.parse(req.params)
    const { userId, role } = res.locals
    res.json(await getDashboard(db, { userId, role }, companyId))
  })

  return router
}
