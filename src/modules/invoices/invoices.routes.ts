import { Router } from 'express'
import type { Knex } from 'knex'
import { InvoiceParams } from './invoices.schema.js'
import { getInvoice } from './invoices.service.js'

export function invoicesRouter(db: Knex): Router {
  const router = Router({ mergeParams: true })

  router.get('/:invoiceId', async (req, res) => {
    const { companyId, invoiceId } = InvoiceParams.parse(req.params)
    res.json(await getInvoice(db, companyId, invoiceId))
  })

  return router
}
